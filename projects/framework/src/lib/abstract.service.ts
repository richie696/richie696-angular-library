/**
 * AbstractService - 抽象服务基类
 * 集成 HTTP 客户端能力：支持 ECC 加密、防重复提交、设备指纹与请求头管理
 * 适配 Url 枚举与 ApiResult 响应，保持 request 方法签名不变
 */
import {inject} from '@angular/core'
import {Router} from '@angular/router'
import {TranslateService} from '@ngx-translate/core'
import {Observable, Subscriber} from 'rxjs'
import {Url} from './url'
import {Callback, Method, ApiResult} from '../public-api'
import {getOrCreateDeviceId} from './device-id'
import {
  fingerprintToString,
  generateHardwareFingerprint,
  generateSecureHardwareFingerprint,
  signHardwareFingerprint
} from './device-fingerprint'
import {EccCryptoModule} from './modules/ecc-crypto.module'
import {DuplicateSubmitModule} from './modules/duplicate-submit.module'
import {
  HttpClientConfig,
  RequestHeader,
  RequestStreamOptions
} from './types/abstract-service.types'
import {RequestOptions} from './types/abstract-service.internal.types'

export type {
  HttpClientConfig,
  RequestHeader,
  RequestStreamOptions
} from './types/abstract-service.types'

// ==================== AbstractService ====================

export abstract class AbstractService {
  private static readonly MAX_SSE_BUFFER_SIZE = 1024 * 1024

  private static readonly SYSTEM_HEADERS = new Set([
    'content-type',
    'content-length',
    'cache-control',
    'expires',
    'date',
    'transfer-encoding',
    'vary',
    'server',
    'connection',
    'transfer-encoding',
    'accept',
    'accept-encoding',
    'accept-language',
    'referer',
    'user-agent',
    'origin',
    'x-client-id',
    'x-client-timestamp',
    'x-client-public-key',
    'x-gateway-keyid',
    'x-encrypted-data',
    'x-response-encrypted',
    'access-control-allow-origin',
    'access-control-allow-methods',
    'access-control-allow-headers',
    'access-control-expose-headers',
    'access-control-max-age',
    'access-control-allow-credentials'
  ])

  static readonly CacheKey = {
    HEADER_KEYS: 'headerKeys'
  }

  protected router: Router
  protected translate: TranslateService

  private readonly config: Required<HttpClientConfig>
  private readonly eccModule: EccCryptoModule
  private readonly duplicateModule: DuplicateSubmitModule
  public readonly clientId: string
  private readonly headerStorageKey: string
  // 缓存设备ID，避免重复生成
  private deviceIdCache: string | null = null
  // 缓存 HMAC 密钥（解码后），避免重复计算
  private hmacSecretCache: string | null = null

  /**
   * 构造服务基础能力：路由、国际化、默认配置、加密模块与防重复模块。
   */
  constructor() {
    // 注入框架能力，供鉴权失效跳转与多语言提示复用
    this.router = inject(Router)
    this.translate = inject(TranslateService)
    // 优先读取动态网关地址，未提供时回退到默认占位地址
    const baseUrl = Url.dynamicUrl || (typeof window !== 'undefined' ? (window as any).__RYDEEN_BASE_URL__ : '') || ''
    this.config = {
      baseUrl: baseUrl || 'https://your-gateway-domain.com',
      clientId: this.generateClientId(),
      duplicateSubmitTimeWindow: 3000,
      showLoading: true,
      maxRetries: 3,
      retryInterval: 1000,
      timeout: 30000,
      enableHeaderAutoManagement: true,
      headerStorageKey: 'http_headers',
      hardwareFingerprintHmacSecret: null
    }
    this.clientId = this.config.clientId
    this.headerStorageKey = this.config.headerStorageKey
    this.eccModule = new EccCryptoModule()
    this.duplicateModule = new DuplicateSubmitModule(this.config.duplicateSubmitTimeWindow)
  }

  /**
   * 生成当前客户端唯一标识，用于请求头透传和密钥交换。
   */
  private generateClientId(): string {
    return 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  /**
   * 统一请求入口（接口签名不可变更）
   * @param url URL 枚举
   * @param body 请求体 / GET 时为 path 参数数组或 query 对象
   * @param header 额外请求头
   * @param finalizeCallback 请求结束回调（成功、失败、取消都会调用）
   */
  async request<T>(
    url: Url,
    body?: any,
    header?: RequestHeader,
    finalizeCallback?: Callback<T>
  ): Promise<ApiResult<T>> {
    // LOCATION/NAVIGATOR 属于非 HTTP 语义，直接返回请求类型错误
    if (url.method === Method.LOCATION || url.method === Method.NAVIGATOR) {
      try {
        finalizeCallback?.()
      } catch (_) {}
      return {
        code: -1,
        msg: this.translate.instant('app.common.request.type.error')
      } as unknown as ApiResult<T>
    }

    // 统一兼容 path 参数数组与 GET query 对象两类入参
    const pathParams = Array.isArray(body) ? body : undefined
    const queryParams =
      url.method === Method.GET && body != null && typeof body === 'object' && !Array.isArray(body)
        ? body
        : undefined
    const options: RequestOptions = {
      body: pathParams == null && queryParams == null ? body : queryParams ?? (url.method !== Method.GET ? body : undefined),
      headers: header ?? undefined,
      pathParams,
      allowRetry: true
    }

    try {
      // 核心链路统一委托到 doRequest，确保加密/重试/防重复策略一致
      return await this.doRequest<T>(url, options, queryParams)
    } finally {
      // finalize 回调始终执行，保证调用方可收敛 loading/埋点
      try {
        finalizeCallback?.()
      } catch (_) {}
    }
  }

  /**
   * SSE 流式请求（不走 ECC 解密/加密）
   *
   * **多模态提交约定（调用方按场景选 body / header）**
   *
   * | 场景 | 推荐 body | Content-Type | 说明 |
   * |------|-----------|--------------|------|
   * | 纯文本问答 | 普通对象 → JSON | 未传时默认 `application/json` | 如 `{ question, sessionId }` |
   * | 语音（multipart） | `FormData`：音频 File/Blob + 文本等字段 | **勿传**，由浏览器带 boundary | 可用 `options.intent: 'voice'` |
   * | 文本 + 附件 | `FormData`：文件 + 文本字段 | 同上 | `options.intent: 'multimodal'` 等 |
   * | 动态表单（JSON） | 普通对象，字段与后端一致 | `application/json` | `options.intent: 'dynamic_form'` |
   *
   * - 返回 `Observable<T>`：T 由调用方泛型指定。
   * - 请求体：`FormData` 原样且不写死 `Content-Type`；普通对象在未传 `Content-Type` 时默认 `application/json`；
   *   `string` / `URLSearchParams` / `Blob` / `ArrayBuffer` / `Uint8Array` 原样作为 body。
   * - `Accept`：未在 `header` 中指定时默认 `text/event-stream`；可用 `options.accept` 覆盖。
   * - `options.intent` 会写入 `X-Rydeen-Agent-Intent`（便于网关/日志）。
   * - 每条 SSE `data:` 行默认 `JSON.parse`；可用 `options.parseSseData` 自定义。
   * - `kind === 'done'` → complete；`kind === 'error'` → error；否则仅 `next`。
   *
   * @example
   * ```ts
   * interface MyEvt { kind: string; payload?: { delta?: string } }
   * service.requestStream<MyEvt>(appUrl, { question: '你好' }).subscribe({
   *   next: (evt) => { console.log(evt) },
   *   error: (e) => console.error(e),
   *   complete: () => console.log('stream closed')
   * })
   * ```
   */
  public requestStream<T = any>(
    url: Url,
    body?: any,
    header?: RequestHeader,
    options?: RequestStreamOptions<T>
  ): Observable<T> {
    // 通过 Observable 包装流式读取，支持订阅生命周期管理
    return new Observable<T>((subscriber: Subscriber<T>) => {
      const abortController = new AbortController()
      const method = url.method
      let requestId: string | undefined
      let cleaned = false
      const timeoutId = setTimeout(() => abortController.abort(), this.config.timeout)

      const cleanup = () => {
        // 清理逻辑保证只执行一次，避免重复释放导致副作用
        if (cleaned) return
        cleaned = true
        clearTimeout(timeoutId)
        if (requestId) {
          try {
            this.duplicateModule.clearRequest(requestId)
          } catch (_) {}
        }
        try {
          this.hideLoadingState()
        } catch (_) {}
      }

      const run = async () => {
        try {
          // SSE 仅支持标准 HTTP 请求方法
          if (url.method === Method.LOCATION || url.method === Method.NAVIGATOR) {
            cleanup()
            subscriber.error(new Error('SSE 不支持 LOCATION/NAVIGATOR'))
            return
          }

          // 复用 request() 的 fullUrl 拼接逻辑（GET 兼容 query / path 参数）
          const pathParams = Array.isArray(body) ? body : undefined
          const queryParams =
            url.method === Method.GET && body != null && typeof body === 'object' && !Array.isArray(body)
              ? body
              : undefined
          const fullUrl = this.buildFullUrl(url, pathParams, queryParams)

          const optionsBody =
            pathParams == null && queryParams == null
              ? body
              : queryParams ?? (url.method !== Method.GET ? body : undefined)

          const isFormData = typeof FormData !== 'undefined' && optionsBody instanceof FormData
          /** multipart 默认跳过防重复（body 哈希不稳定）；`skipDuplicateCheckForMultipart: false` 可恢复 */
          const skipDuplicateForMultipart =
            Boolean(isFormData) && options?.skipDuplicateCheckForMultipart !== false

          // 1) 防重复提交（可选；multipart 默认跳过）
          if (url.needDuplicateCheck && !skipDuplicateForMultipart) {
            const userId = this.getUserId()
            requestId = this.duplicateModule.generateRequestId(fullUrl, method, optionsBody, userId)

            // 同时间窗内检测到重复请求时直接拦截
            if (this.duplicateModule.isDuplicateRequest(requestId)) {
              subscriber.error(new Error('DUPLICATE_REQUEST'))
              cleanup()
              return
            }
            this.duplicateModule.recordRequest(requestId, fullUrl)
          }

          if (this.config.showLoading) this.showLoadingState()

          // 2) 发起明文 SSE 请求
          const cachedHeaders = this.config.enableHeaderAutoManagement ? this.loadCachedHeaders() : {}
          const deviceHeaders = await this.buildDeviceHeaders()

          const isUrlSearchParams =
            typeof URLSearchParams !== 'undefined' && optionsBody instanceof URLSearchParams
          const isBlob = typeof Blob !== 'undefined' && optionsBody instanceof Blob
          const isArrayBuffer = typeof ArrayBuffer !== 'undefined' && optionsBody instanceof ArrayBuffer
          const isUint8Array = typeof Uint8Array !== 'undefined' && optionsBody instanceof Uint8Array
          const isPlainObject =
            optionsBody != null &&
            typeof optionsBody === 'object' &&
            !isFormData &&
            !isUrlSearchParams &&
            !isBlob &&
            !isArrayBuffer &&
            !isUint8Array &&
            !(typeof optionsBody === 'string')

          const requestHeaders: Record<string, string> = {
            'X-Client-Timestamp': Date.now().toString(),
            ...deviceHeaders,
            ...cachedHeaders,
            ...(header || {})
          }
          if (options?.intent != null && String(options.intent) !== '') {
            requestHeaders['X-Rydeen-Agent-Intent'] = String(options.intent)
          }
          if (!requestHeaders['Accept'] && !requestHeaders['accept']) {
            requestHeaders['Accept'] = 'text/event-stream'
          }
          if (options?.accept != null && options.accept !== '') {
            requestHeaders['Accept'] = options.accept
          }
          // FormData：不设置 Content-Type，由浏览器带 multipart boundary
          if (isFormData) {
            delete requestHeaders['Content-Type']
            delete requestHeaders['content-type']
          } else {
            const hasCt =
              requestHeaders['Content-Type'] != null || requestHeaders['content-type'] != null
            // 仅对「普通对象」且调用方未指定 Content-Type 时默认 application/json
            if (!hasCt && isPlainObject) {
              requestHeaders['Content-Type'] = 'application/json'
            }
          }

          const userId = this.getUserId()
          if (userId) requestHeaders['X-User-Id'] = userId

          let requestBody: BodyInit | null = null
          // 非 GET 请求根据 body 类型选择直传或 JSON 序列化
          if (optionsBody != null && method !== Method.GET) {
            if (isFormData) {
              requestBody = optionsBody
            } else if (typeof optionsBody === 'string') {
              requestBody = optionsBody
            } else if (isUrlSearchParams || isBlob || isArrayBuffer || isUint8Array) {
              requestBody = optionsBody as BodyInit
            } else if (isPlainObject) {
              requestBody = JSON.stringify(optionsBody)
            } else {
              // 兜底：其余可序列化对象仍走 JSON（与旧行为一致）
              requestBody = JSON.stringify(optionsBody)
            }
          }

          const response = await fetch(fullUrl, {
            method,
            headers: requestHeaders,
            body: requestBody,
            signal: abortController.signal
          })

          // 将响应头中的业务字段回灌本地缓存，供后续请求透传
          if (this.config.enableHeaderAutoManagement) {
            // SSE 响应头可立即读取；不影响流读取
            this.saveResponseHeaders(response)
          }

          if (response.status === 401) {
            await this.clearAuthAndRedirect()
            subscriber.error(new Error('UNAUTHORIZED'))
            cleanup()
            return
          }

          // 非 2xx 提前失败，避免误进入 SSE 帧解析分支
          if (!response.ok) {
            let responseText = ''
            try {
              responseText = await response.text()
            } catch (_) {}
            const error: any = new Error(`SSE_HTTP_ERROR: ${response.status} ${response.statusText}`)
            error.status = response.status
            error.statusText = response.statusText
            error.responseText = responseText
            subscriber.error(error)
            cleanup()
            return
          }

          if (!response.body) {
            subscriber.error(new Error('SSE response body is empty'))
            cleanup()
            return
          }

          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''
          let finished = false

          // 处理单个 envelope 并根据协议约定触发 complete / error
          const handleEnvelope = (envelope: any) => {
            if (finished) return
            subscriber.next(envelope as T)

            // 仅在存在 kind 字段时做 done/error 处理；否则保持纯透传，交由调用方自行结束/取消订阅
            const kind = envelope?.kind
            if (kind === 'done') {
              finished = true
              subscriber.complete()
              abortController.abort()
              cleanup()
            } else if (kind === 'error') {
              finished = true
              const payload: any = envelope?.payload
              const code = payload?.code != null ? String(payload.code) : ''
              const msg = payload?.message != null ? String(payload.message) : 'SSE_ERROR'
              subscriber.error(Object.assign(new Error(msg), { code, envelope }))
              abortController.abort()
              cleanup()
            }
          }

          // 3) SSE 分帧读取：以空行分隔事件块
          while (!finished) {
            const { value, done } = await reader.read()
            if (done) break
            // 按 chunk 累积文本，统一转为 \n 便于后续分帧
            buffer += decoder.decode(value, { stream: true })
            buffer = buffer.replace(/\r\n/g, '\n')
            // 防止异常流导致缓冲区无限增长
            if (buffer.length > AbstractService.MAX_SSE_BUFFER_SIZE) {
              finished = true
              subscriber.error(
                new Error(
                  `SSE buffer overflow: exceeded ${AbstractService.MAX_SSE_BUFFER_SIZE} bytes without event delimiter`
                )
              )
              abortController.abort()
              cleanup()
              break
            }

            let sepIndex: number
            while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
              const block = buffer.slice(0, sepIndex)
              buffer = buffer.slice(sepIndex + 2)

              if (!block.trim()) continue

              // SSE event block：形如
              // event: token
              // data: {"v":1,...}
              const lines = block.split('\n')
              const dataLines: string[] = []
              for (const line of lines) {
                if (line.startsWith('data:')) {
                  dataLines.push(line.slice(5).trimStart())
                }
              }

              if (dataLines.length === 0) continue

              const dataStr = dataLines.join('\n')
              try {
                // 解析器可由调用方覆盖，默认按 JSON envelope 处理
                const envelope = options?.parseSseData
                  ? options.parseSseData(dataStr)
                  : (JSON.parse(dataStr) as T)
                handleEnvelope(envelope)
              } catch (e) {
                finished = true
                subscriber.error(new Error('SSE data parse error'))
                abortController.abort()
                cleanup()
                break
              }
            }
          }

          if (!finished) {
            subscriber.complete()
            cleanup()
          }
        } catch (err: any) {
          try {
            subscriber.error(err)
          } finally {
            // 无论异常来源是网络、解析还是取消，都统一收尾
            cleanup()
          }
        }
      }

      run()

      return () => {
        // 取消订阅时中断请求并释放本次会话资源
        abortController.abort()
        cleanup()
      }
    })
  }

  /**
   * 内部统一请求：防重复、加载态、加密/明文、响应头保存、401 处理
   */
  private async doRequest<T>(
    url: Url,
    options: RequestOptions,
    queryParams?: Record<string, any>
  ): Promise<ApiResult<T>> {
    // 统一构建最终请求 URL，保证 path/query 拼接策略一致
    const fullUrl = this.buildFullUrl(url, options.pathParams, queryParams)
    const method = url.method

    let requestId: string | undefined
    // 按接口配置决定是否启用防重复提交
    if (url.needDuplicateCheck) {
      const userId = this.getUserId()
      requestId =
        options.requestId ??
        this.duplicateModule.generateRequestId(fullUrl, method, options.body, userId)
      if (this.duplicateModule.isDuplicateRequest(requestId)) {
        console.warn('[防重复提交] 检测到重复请求，已忽略:', requestId)
        throw new Error('DUPLICATE_REQUEST')
      }
      this.duplicateModule.recordRequest(requestId, fullUrl)
    }

    try {
      if (this.config.showLoading) this.showLoadingState()

      let response: Response
      // 按接口标记选择加密链路或明文链路
      if (url.needEncryption) {
        response = await this.sendEncryptedRequest(
          fullUrl,
          method,
          options,
          options.allowRetry !== false
        )
      } else {
        response = await this.sendPlainRequest(fullUrl, method, options)
      }

      if (this.config.enableHeaderAutoManagement) this.saveResponseHeaders(response)

      // 统一解析响应（含 401、429、解密与 JSON 反序列化）
      const result = await this.handleHttpResponse<T>(response, url.needEncryption)

      if (requestId) this.duplicateModule.clearRequest(requestId)
      return result
    } catch (error: any) {
      if (requestId) {
        if (error?.message === 'DUPLICATE_SUBMIT') {
          setTimeout(
            () => this.duplicateModule.clearRequest(requestId!),
            this.config.duplicateSubmitTimeWindow
          )
        } else {
          this.duplicateModule.clearRequest(requestId)
        }
      }
      throw error
    } finally {
      // 请求生命周期结束后兜底关闭 loading
      if (this.config.showLoading) this.hideLoadingState()
    }
  }

  /**
   * 拼接最终请求地址：先解析 path 参数，再附加 query 参数。
   * @param url URL 枚举定义
   * @param pathParams 路径参数数组
   * @param queryParams 查询参数对象
   */
  private buildFullUrl(
    url: Url,
    pathParams?: any[],
    queryParams?: Record<string, any>
  ): string {
    let u = pathParams != null ? url.value(pathParams) : url.value()
    if (queryParams != null && Object.keys(queryParams).length > 0) {
      const search = new URLSearchParams()
      for (const k of Object.keys(queryParams)) {
        if (queryParams[k] != null && queryParams[k] !== '') {
          search.append(k, String(queryParams[k]))
        }
      }
      const q = search.toString()
      u = q ? `${u}${u.includes('?') ? '&' : '?'}${q}` : u
    }
    return u
  }

  /**
   * 发送加密请求：必要时先握手，再附加加密头并处理 423 重握手重试。
   * @param url 完整请求地址
   * @param method HTTP 方法
   * @param options 请求参数
   * @param allowRetry 是否允许 423 时自动重握手重试一次
   */
  private async sendEncryptedRequest(
    url: string,
    method: string,
    options: RequestOptions,
    allowRetry: boolean
  ): Promise<Response> {
    // 首次加密请求前自动完成密钥交换
    if (!this.eccModule.isInitialized()) {
      await this.eccModule.exchangeKeys(this.config.baseUrl, this.clientId)
    }

    const cachedHeaders = this.config.enableHeaderAutoManagement ? this.loadCachedHeaders() : {}
    const deviceHeaders = await this.buildDeviceHeaders()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Id': this.clientId,
      'X-Gateway-KeyId': this.eccModule.gatewayKeyId || '',
      'X-Client-Timestamp': Date.now().toString(),
      ...deviceHeaders,
      ...cachedHeaders,
      ...(options.headers || {})
    }

    let requestBody: string | null = null
    if (options.body && method !== Method.GET) {
      // 按当前协议：请求体保持 JSON，同时在头里透传密文
      const jsonData = JSON.stringify(options.body)
      headers['X-Encrypted-Data'] = await this.eccModule.encrypt(jsonData)
      requestBody = jsonData
    }

    const response = await fetch(url, {
      method,
      headers,
      body: requestBody,
      signal: AbortSignal.timeout(this.config.timeout)
    })

    // 网关要求重新握手时，仅允许自动重试一次避免无限递归
    if (response.status === 423) {
      const result = await response.json()
      if (result.needReHandshake && allowRetry) {
        await this.eccModule.reHandshake(result.keyId, result.gatewayPublicKey)
        return this.sendEncryptedRequest(url, method, options, false)
      }
    }

    return response
  }

  /**
   * 发送普通明文请求，并统一附加设备头、缓存头和用户头。
   * @param url 完整请求地址
   * @param method HTTP 方法
   * @param options 请求参数
   */
  private async sendPlainRequest(
    url: string,
    method: string,
    options: RequestOptions
  ): Promise<Response> {
    const cachedHeaders = this.config.enableHeaderAutoManagement ? this.loadCachedHeaders() : {}
    const deviceHeaders = await this.buildDeviceHeaders()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Timestamp': Date.now().toString(),
      ...deviceHeaders,
      ...cachedHeaders,
      ...(options.headers || {})
    }

    const userId = this.getUserId()
    if (userId) headers['X-User-Id'] = userId

    let requestBody: string | null = null
    if (options.body && method !== Method.GET) {
      requestBody = JSON.stringify(options.body)
    }

    // 使用 fetch + timeout 发送明文请求
    return fetch(url, {
      method,
      headers,
      body: requestBody,
      signal: AbortSignal.timeout(this.config.timeout)
    })
  }

  /**
   * 统一解析 HTTP 响应：处理错误码、401 跳转、429 业务提示与可选解密。
   * @param response 原生 fetch 响应
   * @param needDecryption 是否按加密响应协议解密
   */
  private async handleHttpResponse<T>(
    response: Response,
    needDecryption: boolean
  ): Promise<ApiResult<T>> {
    // 先读取文本，便于统一错误处理与解密分支复用
    const responseText = await response.text()

    if (!response.ok) {
      const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`)
      error.status = response.status
      error.response = response

      // 429 可能包含业务去重码，需尝试解析后给出友好提示
      if (response.status === 429) {
        let errorData: any = {}
        try {
          if (needDecryption && response.headers.get('X-Response-Encrypted') === 'true') {
            const decryptedText = await this.eccModule.decrypt(responseText)
            errorData = JSON.parse(decryptedText)
          } else {
            errorData = responseText ? JSON.parse(responseText) : {}
          }
        } catch (_) {}
        if (errorData.code === 'DUPLICATE_SUBMIT') {
          error.message = 'DUPLICATE_SUBMIT'
          this.showErrorMessage(this.translate.instant('app.common.request.duplicate') || '请求过于频繁，请稍后再试')
        }
      }

      // 401 统一清理鉴权信息并跳转首页
      if (response.status === 401) {
        await this.clearAuthAndRedirect()
        return {
          code: 401,
          msg: this.translate.instant('app.common.request.unauthorized') || '未授权'
        } as unknown as ApiResult<T>
      }

      throw error
    }

    // 成功响应若标记加密，则先解密再 JSON 解析
    if (needDecryption && response.headers.get('X-Response-Encrypted') === 'true') {
      const decryptedText = await this.eccModule.decrypt(responseText)
      return JSON.parse(decryptedText) as ApiResult<T>
    }

    // 默认按 JSON 响应解析，空响应体回退空对象
    return responseText ? (JSON.parse(responseText) as ApiResult<T>) : ({} as ApiResult<T>)
  }

  /**
   * 清理鉴权相关本地状态并跳转到首页。
   */
  private async clearAuthAndRedirect(): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        // 仅清理框架相关鉴权键，避免误伤宿主应用其他缓存
        localStorage.removeItem(this.headerStorageKey)
        const authKeys = ['userId', 'token', 'accessToken', 'refreshToken']
        authKeys.forEach((key) => {
          localStorage.removeItem(key)
          sessionStorage.removeItem(key)
        })
      } catch (_) {}
    }
    await this.router.navigateByUrl('/')
  }

  /**
   * 获取当前用户标识（优先 localStorage，兼容 sessionStorage）。
   */
  getUserId(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userId') || sessionStorage.getItem('userId')
    }
    return null
  }

  /**
   * 构建设备相关请求头：设备 ID 与硬件指纹签名。
   */
  private async buildDeviceHeaders(): Promise<Record<string, string>> {
    if (typeof window === 'undefined') return {}

    const headers: Record<string, string> = {}
    try {
      // deviceId 使用内存缓存，避免每次请求重复生成
      if (!this.deviceIdCache) {
        this.deviceIdCache = await getOrCreateDeviceId()
      }
      if (this.deviceIdCache) headers['X-Device-Id'] = this.deviceIdCache
    } catch (e) {
      console.warn('[AbstractService] 生成设备ID失败:', e)
    }
    try {
      const hmacSecret = this.getHardwareFingerprintHmacSecret()
      if (hmacSecret) {
        // 配置了密钥时，发送签名后的安全指纹
        const secureFingerprint = await generateSecureHardwareFingerprint()
        headers['X-Hardware-Fingerprint'] = await signHardwareFingerprint(secureFingerprint, hmacSecret)
      } else {
        // 未配置密钥时保持旧行为，发送原始指纹 JSON
        const fingerprint = await generateHardwareFingerprint()
        const fingerprintJson = fingerprintToString(fingerprint)
        if (fingerprintJson) headers['X-Hardware-Fingerprint'] = fingerprintJson
      }
    } catch (e) {
      console.warn('[AbstractService] 生成硬件指纹失败:', e)
    }
    return headers
  }

  /**
   * 读取本地缓存的业务响应头。
   */
  private loadCachedHeaders(): Record<string, string> {
    if (typeof window === 'undefined') return {}
    try {
      const cached = localStorage.getItem(this.headerStorageKey)
      if (!cached) return {}
      const headers = JSON.parse(cached)
      return headers || {}
    } catch (_) {
      return {}
    }
  }

  /**
   * 保存响应中的业务头到本地缓存（过滤系统头）。
   * @param response fetch 响应对象
   */
  private saveResponseHeaders(response: Response): void {
    if (typeof window === 'undefined') return
    try {
      const businessHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        const lowerKey = key.toLowerCase()
        if (!AbstractService.SYSTEM_HEADERS.has(lowerKey)) {
          businessHeaders[key] = value
        }
      })
      if (Object.keys(businessHeaders).length > 0) {
        const merged = { ...this.loadCachedHeaders(), ...businessHeaders }
        localStorage.setItem(this.headerStorageKey, JSON.stringify(merged))
      }
    } catch (_) {}
  }

  /**
   * 展示全局加载态（优先 Capacitor 插件，回退 DOM 节点）。
   */
  private showLoadingState(): void {
    if (typeof window !== 'undefined') {
      const cap = (window as any).Capacitor
      if (cap?.Plugins?.Loading) {
        cap.Plugins.Loading.show({ message: '处理中...' })
      } else {
        const el = document.getElementById('loading')
        if (el) el.style.display = 'block'
      }
    }
  }

  /**
   * 隐藏全局加载态（优先 Capacitor 插件，回退 DOM 节点）。
   */
  private hideLoadingState(): void {
    if (typeof window !== 'undefined') {
      const cap = (window as any).Capacitor
      if (cap?.Plugins?.Loading) {
        cap.Plugins.Loading.hide()
      } else {
        const el = document.getElementById('loading')
        if (el) el.style.display = 'none'
      }
    }
  }

  /**
   * 展示错误提示（优先 Toast，回退 alert）。
   * @param message 待展示的错误文案
   */
  private showErrorMessage(message: string): void {
    if (typeof window !== 'undefined') {
      const cap = (window as any).Capacitor
      if (cap?.Plugins?.Toast) {
        cap.Plugins.Toast.show({ text: message, duration: 'short', position: 'center' })
      } else {
        alert(message)
      }
    }
  }

  /**
   * 更新配置（如 baseUrl、clientId、防重复时间窗等）
   */
  updateConfig(newConfig: Partial<HttpClientConfig>): void {
    // 仅覆盖显式传入字段，避免用 undefined 污染现有配置
    Object.keys(newConfig).forEach((key) => {
      const value = (newConfig as any)[key]
      if (value !== undefined) {
        ;(this.config as any)[key] = value
      }
    })
    // 变更防重复窗口时同步模块内部阈值
    if (newConfig.duplicateSubmitTimeWindow != null) {
      this.duplicateModule.updateTimeWindow(newConfig.duplicateSubmitTimeWindow)
    }
    // 变更 baseUrl 时同步到 Url 动态地址
    if (newConfig.baseUrl != null) {
      Url.dynamicUrl = newConfig.baseUrl
    }
    // 变更密钥配置时刷新缓存后的 HMAC 密钥
    if (newConfig.hardwareFingerprintHmacSecret != null) {
      this.setHardwareFingerprintHmacSecret(newConfig.hardwareFingerprintHmacSecret)
    }
  }

  /**
   * 释放 ECC 与防重复提交资源
   */
  cleanup(): void {
    // 释放会话级资源，避免组件销毁后残留状态
    this.eccModule.cleanup()
    this.duplicateModule.clearAll()
  }

  /**
   * 预初始化 ECC 密钥交换（可选，首次加密请求也会自动执行）
   */
  async initializeEncryption(): Promise<void> {
    // 允许业务在首个加密请求前主动完成握手，降低首包延迟
    await this.eccModule.exchangeKeys(this.config.baseUrl, this.clientId)
  }

  /**
   * 由业务侧（例如前端应用）传入硬件指纹 HMAC 密钥。
   * 支持明文或 Base64 编码的二进制字符串。
   */
  protected setHardwareFingerprintHmacSecret(secretFromConfig: string | null | undefined): void {
    // 空值或默认弱密钥都按未配置处理，避免错误安全感
    if (!secretFromConfig || secretFromConfig === 'default-secret-key-change-in-production') {
      console.warn(
        '[AbstractService] 硬件指纹 HMAC 密钥未配置或为默认值，生产环境必须配置强密钥！'
      )
      this.hmacSecretCache = null
      return
    }
    // 支持 Base64 或明文输入，统一解码后缓存
    this.hmacSecretCache = this.decodeSecret(secretFromConfig)
  }

  /**
   * 获取已配置的 HMAC 密钥（如未配置返回 null）
   */
  protected getHardwareFingerprintHmacSecret(): string | null {
    return this.hmacSecretCache
  }

  /**
   * Base64 解码工具：配置中可以使用 Base64 编码存储二进制密钥
   */
  private decodeSecret(encodedSecret: string): string {
    try {
      // 若为 Base64，解码为原始密钥字符串
      return atob(encodedSecret)
    } catch (e) {
      // 非 Base64 格式时直接使用原值，兼容明文配置
      console.error('[AbstractService] HMAC 密钥解码失败，使用原始值:', e)
      return encodedSecret
    }
  }
}
