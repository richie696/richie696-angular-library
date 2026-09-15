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
import {SseParser} from './stream/sse.parser'
import {AppError} from './errors/app-error'
import {ManagedHeadersStore, ManagedHeadersStoreOptions} from './managed-headers.store'
import {
  AUTH_REDIRECT_PORT,
  GATEWAY_CLIENT_CONFIG,
  LOADING_PORT,
  NOTIFICATION_PORT,
  AuthRedirectPort,
  GatewayClientConfig,
  LoadingPort,
  NotificationPort
} from './types/gateway-client.types'

export type {
  HttpClientConfig,
  RequestHeader,
  RequestStreamOptions
} from './types/abstract-service.types'
export type {
  AuthRedirectPort,
  GatewayClientConfig,
  LoadingPort,
  NotificationPort
} from './types/gateway-client.types'
export {AppError} from './errors/app-error'

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

  protected router: Router | null
  protected translate: TranslateService | null

  private config: Required<Omit<HttpClientConfig, 'hardwareFingerprintHmacSecret'>> &
    Pick<HttpClientConfig, 'hardwareFingerprintHmacSecret'>
  private readonly eccModule: EccCryptoModule
  private readonly duplicateModule: DuplicateSubmitModule
  public readonly clientId: string
  private readonly loadingPort: LoadingPort
  private readonly notificationPort: NotificationPort
  private readonly authRedirectPort: AuthRedirectPort
  private readonly managedHeadersStore: ManagedHeadersStore
  private handshakePromise: Promise<void> | null = null
  private reHandshakePromise: Promise<void> | null = null
  private activeLoadingRequests = 0
  // 缓存设备ID，避免重复生成
  private deviceIdCache: string | null = null
  // 缓存 HMAC 密钥（解码后），避免重复计算
  private hmacSecretCache: string | null = null

  /**
   * 构造服务基础能力：路由、国际化、默认配置、加密模块与防重复模块。
   */
  constructor(config: Partial<HttpClientConfig> = {}) {
    // 注入框架能力，供鉴权失效跳转与多语言提示复用
    this.router = inject(Router, {optional: true})
    this.translate = inject(TranslateService, {optional: true})
    this.loadingPort = inject(LOADING_PORT)
    this.notificationPort = inject(NOTIFICATION_PORT)
    this.authRedirectPort = inject(AUTH_REDIRECT_PORT)
    this.managedHeadersStore = inject(ManagedHeadersStore)
    const injectedConfig = inject(GATEWAY_CLIENT_CONFIG, {optional: true}) ?? {}
    // 配置优先级：构造参数 > provider > 兼容的 Url.dynamicUrl > SSR-safe 全局运行时配置。
    const runtimeBaseUrl =
      typeof globalThis !== 'undefined'
        ? String((globalThis as {__RYDEEN_BASE_URL__?: unknown}).__RYDEEN_BASE_URL__ ?? '')
        : ''
    const baseUrl = config.baseUrl ?? injectedConfig.baseUrl ?? (Url.dynamicUrl || runtimeBaseUrl)
    const mergedConfig = {...injectedConfig, ...config}
    this.config = {
      baseUrl: baseUrl || '',
      clientId: mergedConfig.clientId ?? this.generateClientId(),
      duplicateSubmitTimeWindow: mergedConfig.duplicateSubmitTimeWindow ?? 3000,
      showLoading: mergedConfig.showLoading ?? true,
      maxRetries: mergedConfig.maxRetries ?? 3,
      retryInterval: mergedConfig.retryInterval ?? 1000,
      timeout: mergedConfig.timeout ?? 30000,
      enableHeaderAutoManagement: mergedConfig.enableHeaderAutoManagement ?? false,
      headerStorageKey: mergedConfig.headerStorageKey ?? 'http_headers',
      managedResponseHeaders: (mergedConfig.managedResponseHeaders ?? []).map((header) => header.toLowerCase()),
      persistManagedHeaders: mergedConfig.persistManagedHeaders ?? false,
      managedHeadersTtlMs: mergedConfig.managedHeadersTtlMs ?? 5 * 60_000,
      sendHardwareFingerprint: mergedConfig.sendHardwareFingerprint ?? false,
      allowUnsignedHardwareFingerprint: mergedConfig.allowUnsignedHardwareFingerprint ?? false,
      cryptoExchangePath: mergedConfig.cryptoExchangePath ?? '/api/crypto/exchange',
      protocolVersion: mergedConfig.protocolVersion ?? '1',
      hardwareFingerprintHmacSecret: mergedConfig.hardwareFingerprintHmacSecret ?? null
    }
    this.clientId = this.config.clientId
    this.eccModule = new EccCryptoModule()
    this.duplicateModule = new DuplicateSubmitModule(this.config.duplicateSubmitTimeWindow)
  }

  /**
   * 生成当前客户端唯一标识，用于请求头透传和密钥交换。
   */
  private generateClientId(): string {
    const randomId =
      typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : Math.random().toString(36).slice(2, 11)
    return `client_${Date.now()}_${randomId}`
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
    body?: unknown,
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
        msg: this.translateText('app.common.request.type.error', 'Request type is not supported')
      } as unknown as ApiResult<T>
    }

    // 统一兼容 path 参数数组与 GET query 对象两类入参
    const pathParams = Array.isArray(body) ? body : undefined
    const queryParams: Record<string, unknown> | undefined =
      url.method === Method.GET && body != null && typeof body === 'object' && !Array.isArray(body)
        ? body as Record<string, unknown>
        : undefined
    const options: RequestOptions = {
      body: pathParams == null && queryParams == null ? body : queryParams ?? (url.method !== Method.GET ? body : undefined),
      headers: header ?? undefined,
      pathParams,
      allowRetry: true,
      skipManagedHeaders: url.skipManagedHeaders
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
  public requestStream<T = unknown>(
    url: Url,
    body?: unknown,
    header?: RequestHeader,
    options?: RequestStreamOptions<T>
  ): Observable<T> {
    // 通过 Observable 包装流式读取，支持订阅生命周期管理
    return new Observable<T>((subscriber: Subscriber<T>) => {
      const abortController = new AbortController()
      const method = url.method
      let requestId: string | undefined
      let cleaned = false
      let loadingShown = false
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
        if (loadingShown) {
          try {
            this.hideLoadingState()
          } catch (_) {}
        }
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
          const queryParams: Record<string, unknown> | undefined =
            url.method === Method.GET && body != null && typeof body === 'object' && !Array.isArray(body)
              ? body as Record<string, unknown>
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
              subscriber.error(new AppError('duplicate', 'Duplicate request'))
              cleanup()
              return
            }
            this.duplicateModule.recordRequest(requestId, fullUrl)
          }

          if (this.config.showLoading) {
            this.showLoadingState()
            loadingShown = true
          }

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

          const requestHeaders = this.mergeHeaders(
            {
              'X-Client-Timestamp': Date.now().toString(),
              'X-Gateway-Protocol-Version': this.config.protocolVersion
            },
            deviceHeaders,
            cachedHeaders,
            header || {}
          )
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
            subscriber.error(new AppError('unauthorized', this.translateText('app.common.request.unauthorized', 'Unauthorized'), {status: 401}))
            cleanup()
            return
          }

          // 非 2xx 提前失败，避免误进入 SSE 帧解析分支
          if (!response.ok) {
            let responseText = ''
            try {
              responseText = await response.text()
            } catch (_) {}
            subscriber.error(new AppError(
              response.status === 429 ? 'rate-limited' : response.status >= 500 ? 'server' : 'unknown',
              `SSE HTTP ${response.status}: ${response.statusText}`,
              {status: response.status, responseBody: responseText, retryAfterMs: this.parseRetryAfter(response.headers.get('Retry-After'))}
            ))
            cleanup()
            return
          }

          if (!response.body) {
            subscriber.error(new AppError('protocol', 'SSE response body is empty'))
            cleanup()
            return
          }

          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let finished = false
          const parser = new SseParser(AbstractService.MAX_SSE_BUFFER_SIZE)

          // 处理单个 envelope 并根据协议约定触发 complete / error
          const handleEnvelope = (envelope: unknown) => {
            if (finished) return
            subscriber.next(envelope as T)

            // 仅在存在 kind 字段时做 done/error 处理；否则保持纯透传，交由调用方自行结束/取消订阅
            const kind = envelope && typeof envelope === 'object'
              ? (envelope as {kind?: unknown}).kind
              : undefined
            if (kind === 'done') {
              finished = true
              subscriber.complete()
              abortController.abort()
              cleanup()
            } else if (kind === 'error') {
              finished = true
              const payload = envelope && typeof envelope === 'object'
                ? (envelope as {payload?: {code?: unknown; message?: unknown}}).payload
                : undefined
              const code = payload?.code != null ? String(payload.code) : ''
              const msg = payload?.message != null ? String(payload.message) : 'SSE_ERROR'
              subscriber.error(Object.assign(new Error(msg), { code, envelope }))
              abortController.abort()
              cleanup()
            }
          }

          // 3) SSE 增量分帧读取：解析器处理 CRLF、跨 chunk 和 EOF 尾帧。
          while (!finished) {
            const { value, done } = await reader.read()
            if (done) {
              const tail = decoder.decode()
              if (tail) parser.feed(tail, (event) =>
                this.handleSseEvent(event.data, options, handleEnvelope, subscriber, abortController, cleanup, () => { finished = true })
              )
              parser.end((event) => this.handleSseEvent(event.data, options, handleEnvelope, subscriber, abortController, cleanup, () => { finished = true }))
              break
            }
            try {
              parser.feed(decoder.decode(value, {stream: true}), (event) =>
                this.handleSseEvent(event.data, options, handleEnvelope, subscriber, abortController, cleanup, () => { finished = true })
              )
            } catch (error) {
              finished = true
              subscriber.error(error)
              abortController.abort()
              cleanup()
            }
          }

          if (!finished) {
            subscriber.complete()
            cleanup()
          }
        } catch (err: unknown) {
          try {
            if (!(err instanceof Error && err.name === 'AbortError') && !subscriber.closed) {
              subscriber.error(err instanceof AppError ? err : new AppError('network', 'SSE request failed', {cause: err}))
            }
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

  private handleSseEvent<T>(
    rawData: string,
    options: RequestStreamOptions<T> | undefined,
    handleEnvelope: (envelope: unknown) => void,
    subscriber: Subscriber<T>,
    abortController: AbortController,
    cleanup: () => void,
    markFinished: () => void
  ): void {
    try {
      const envelope = options?.parseSseData
        ? options.parseSseData(rawData)
        : (JSON.parse(rawData) as T)
      handleEnvelope(envelope)
    } catch (cause) {
      markFinished()
      subscriber.error(new AppError('protocol', 'SSE data parse error', {cause}))
      abortController.abort()
      cleanup()
    }
  }

  /**
   * 内部统一请求：防重复、加载态、加密/明文、响应头保存、401 处理
   */
  private async doRequest<T>(
    url: Url,
    options: RequestOptions,
    queryParams?: Record<string, unknown>
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
        throw new AppError('duplicate', 'Duplicate request', {code: 'DUPLICATE_REQUEST', requestId})
      }
      this.duplicateModule.recordRequest(requestId, fullUrl)
    }

    try {
      if (this.config.showLoading) this.showLoadingState()

      const response = await this.executeWithRetry(
        () =>
          url.needEncryption
            ? this.sendEncryptedRequest(fullUrl, method, options, options.allowRetry !== false)
            : this.sendPlainRequest(fullUrl, method, options),
        method,
        options
      )

      if (this.config.enableHeaderAutoManagement) this.saveResponseHeaders(response)

      // 统一解析响应（含 401、429、解密与 JSON 反序列化）
      const result = await this.handleHttpResponse<T>(response, url.needEncryption)

      if (requestId) this.duplicateModule.clearRequest(requestId)
      return result
    } catch (error: unknown) {
      const normalizedError = this.normalizeError(error)
      if (requestId) {
        if (normalizedError instanceof AppError && (normalizedError.kind === 'duplicate' || normalizedError.code === 'DUPLICATE_SUBMIT')) {
          setTimeout(
            () => this.duplicateModule.clearRequest(requestId!),
            this.config.duplicateSubmitTimeWindow
          )
        } else {
          this.duplicateModule.clearRequest(requestId)
        }
      }
      throw normalizedError
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
    pathParams?: unknown[],
    queryParams?: Record<string, unknown>
  ): string {
    let u = pathParams != null ? url.value(pathParams, this.config.baseUrl) : url.value(undefined, this.config.baseUrl)
    u = this.resolveAbsoluteUrl(u)
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

  private resolveAbsoluteUrl(value: string): string {
    if (!value) return this.config.baseUrl
    try {
      return new URL(value, this.config.baseUrl || undefined).toString()
    } catch (_) {
      const base = this.config.baseUrl.replace(/\/$/, '')
      return value.startsWith('/') || !base ? `${base}${value}` : `${base}/${value}`
    }
  }

  private async executeWithRetry(
    send: () => Promise<Response>,
    method: string,
    options: RequestOptions
  ): Promise<Response> {
    let attempt = 0
    while (true) {
      try {
        const response = await send()
        if (response.status !== 423 || attempt >= this.config.maxRetries || !this.canRetry(method, options)) {
          return response
        }
        if (response.ok || !this.canRetryStatus(response.status)) return response
        throw await this.createHttpError(response)
      } catch (error) {
        if (attempt >= this.config.maxRetries || !this.canRetry(method, options) || !this.canRetryError(error)) {
          throw error
        }
        attempt += 1
        const delay = this.retryDelay(attempt, error)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  private canRetry(method: string, options: RequestOptions): boolean {
    return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase()) || Boolean(options.idempotencyKey)
  }

  private canRetryStatus(status: number): boolean {
    return status === 408 || status === 425 || status === 429 || status >= 500
  }

  private canRetryError(error: unknown): boolean {
    if (error instanceof AppError) return error.kind === 'network' || error.kind === 'timeout' || error.kind === 'rate-limited' || error.kind === 'server'
    return error instanceof TypeError || (error instanceof Error && /timeout|network|fetch/i.test(error.message))
  }

  private retryDelay(attempt: number, error: unknown): number {
    const retryAfter = error instanceof AppError ? error.retryAfterMs : undefined
    return retryAfter ?? Math.min(this.config.retryInterval * 2 ** (attempt - 1), 30_000)
  }

  private async createHttpError(response: Response): Promise<AppError> {
    let body: unknown
    try {
      const text = await response.clone().text()
      body = text ? JSON.parse(text) : undefined
    } catch (_) {
      body = undefined
    }
    const retryAfter = response.headers.get('Retry-After')
    const retryAfterMs = retryAfter
      ? /^\d+$/.test(retryAfter)
        ? Number(retryAfter) * 1000
        : Math.max(0, Date.parse(retryAfter) - Date.now())
      : undefined
    return new AppError(
      response.status === 429 ? 'rate-limited' : response.status >= 500 ? 'server' : 'unknown',
      `HTTP ${response.status}: ${response.statusText}`,
      {
        status: response.status,
        retryAfterMs,
        responseBody: body,
        traceId: response.headers.get('X-Trace-Id') ?? response.headers.get('traceparent') ?? undefined
      }
    )
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
    await this.ensureHandshake()

    const cachedHeaders = this.config.enableHeaderAutoManagement && !options.skipManagedHeaders
      ? this.loadCachedHeaders()
      : {}
    const deviceHeaders = await this.buildDeviceHeaders()

    const headers = this.mergeHeaders(
      {
      'Content-Type': 'application/json',
      'X-Client-Id': this.clientId,
      'X-Gateway-KeyId': this.eccModule.gatewayKeyId || '',
      'X-Client-Timestamp': Date.now().toString(),
      'X-Gateway-Protocol-Version': this.config.protocolVersion,
      },
      deviceHeaders,
      cachedHeaders,
      options.headers || {}
    )

    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey

    let requestBody: string | null = null
    if (options.body != null && method !== Method.GET) {
      // 密文必须作为请求体传输，不能同时保留明文 JSON。使用标记头让网关识别
      // 协议版本，避免受 HTTP Header 长度限制的头像等管理端有效载荷被截断。
      const jsonData = JSON.stringify(options.body)
      headers['X-Encrypted-Data'] = 'body-v1'
      headers['Content-Type'] = 'application/octet-stream'
      requestBody = await this.eccModule.encrypt(jsonData)
    }

    const response = await fetch(url, {
      method,
      headers,
      body: requestBody,
      signal: this.createTimeoutSignal()
    })

    // 网关要求重新握手时，仅允许自动重试一次避免无限递归
    if (response.status === 423) {
      let result: {needReHandshake?: boolean; keyId?: string; gatewayPublicKey?: string} = {}
      try {
        result = await response.clone().json()
      } catch (_) {}
      if (result.needReHandshake && allowRetry && result.keyId && result.gatewayPublicKey) {
        await this.ensureReHandshake(result.keyId, result.gatewayPublicKey)
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
    const cachedHeaders = this.config.enableHeaderAutoManagement && !options.skipManagedHeaders
      ? this.loadCachedHeaders()
      : {}
    const deviceHeaders = await this.buildDeviceHeaders()

    const headers = this.mergeHeaders(
      {
      'X-Client-Timestamp': Date.now().toString(),
      'X-Gateway-Protocol-Version': this.config.protocolVersion,
      },
      deviceHeaders,
      cachedHeaders,
      options.headers || {}
    )

    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey

    const userId = this.getUserId()
    if (userId) headers['X-User-Id'] = userId

    let requestBody: BodyInit | null = null
    if (options.body != null && method !== Method.GET) {
      const body = options.body
      if (
        typeof body === 'string' ||
        (typeof Blob !== 'undefined' && body instanceof Blob) ||
        (typeof FormData !== 'undefined' && body instanceof FormData) ||
        (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) ||
        (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer)
      ) {
        requestBody = body
      } else {
        requestBody = JSON.stringify(body)
        if (!this.hasHeader(headers, 'Content-Type')) headers['Content-Type'] = 'application/json'
      }
    }

    // 使用 fetch + timeout 发送明文请求
    return fetch(url, {
      method,
      headers,
      body: requestBody,
      signal: this.createTimeoutSignal()
    })
  }

  private hasHeader(headers: Record<string, string>, name: string): boolean {
    const target = name.toLowerCase()
    return Object.keys(headers).some((key) => key.toLowerCase() === target)
  }

  private mergeHeaders(...sources: Array<Record<string, string>>): Record<string, string> {
    const result: Record<string, string> = {}
    for (const source of sources) {
      for (const [key, value] of Object.entries(source)) {
        const existing = Object.keys(result).find((current) => current.toLowerCase() === key.toLowerCase())
        if (existing) delete result[existing]
        result[key] = String(value)
      }
    }
    return result
  }

  private createTimeoutSignal(): AbortSignal {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)
    controller.signal.addEventListener('abort', () => clearTimeout(timeoutId), {once: true})
    return controller.signal
  }

  private async ensureHandshake(): Promise<void> {
    if (this.eccModule.isInitialized()) return
    if (!this.handshakePromise) {
      this.handshakePromise = this.eccModule
        .exchangeKeys(this.config.baseUrl, this.clientId, this.config.cryptoExchangePath, this.config.protocolVersion)
        .then(() => undefined)
        .finally(() => {
          this.handshakePromise = null
        })
    }
    await this.handshakePromise
  }

  private async ensureReHandshake(keyId: string, gatewayPublicKey: string): Promise<void> {
    if (this.eccModule.gatewayKeyId === keyId) return
    if (!this.reHandshakePromise) {
      this.reHandshakePromise = this.eccModule
        .reHandshake(keyId, gatewayPublicKey)
        .finally(() => {
          this.reHandshakePromise = null
        })
    }
    await this.reHandshakePromise
  }

  private resolveExchangeBaseUrl(): string {
    const path = this.config.cryptoExchangePath || '/api/crypto/exchange'
    if (/^https?:\/\//i.test(path)) return path
    const base = this.config.baseUrl.replace(/\/$/, '')
    return `${base}${path.startsWith('/') ? path : `/${path}`}`
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
      let errorData: unknown
      try {
        const decodedText =
          needDecryption && response.headers.get('X-Response-Encrypted') === 'true'
            ? await this.eccModule.decrypt(responseText)
            : responseText
        errorData = decodedText ? JSON.parse(decodedText) : undefined
      } catch (_) {
        errorData = responseText || undefined
      }
      const errorCode = this.readErrorCode(errorData)
      if (response.status === 401) await this.clearAuthAndRedirect()
      const error = new AppError(
        response.status === 401
          ? 'unauthorized'
          : response.status === 403
            ? 'forbidden'
            : response.status === 429
              ? errorCode === 'DUPLICATE_SUBMIT'
                ? 'duplicate'
                : 'rate-limited'
              : response.status >= 500
                ? 'server'
                : 'unknown',
        errorCode === 'DUPLICATE_SUBMIT'
          ? this.translateText('app.common.request.duplicate', 'Request was submitted already')
          : response.status === 401
            ? this.translateText('app.common.request.unauthorized', 'Unauthorized')
            : `HTTP ${response.status}: ${response.statusText}`,
        {
          status: response.status,
          code: errorCode,
          traceId: response.headers.get('X-Trace-Id') ?? response.headers.get('traceparent') ?? undefined,
          retryAfterMs: this.parseRetryAfter(response.headers.get('Retry-After')),
          responseBody: errorData
        }
      )
      throw error
    }

    // 成功响应若标记加密，则先解密再 JSON 解析
    if (needDecryption && response.headers.get('X-Response-Encrypted') === 'true') {
      const decryptedText = await this.eccModule.decrypt(responseText)
      return JSON.parse(decryptedText) as ApiResult<T>
    }

    // 204/空响应不强制伪造业务 envelope，保持兼容并避免 JSON.parse 空字符串。
    if (!responseText || response.status === 204) return {} as ApiResult<T>
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
    if (contentType.includes('json') || responseText.trimStart().startsWith('{')) {
      try {
        return JSON.parse(responseText) as ApiResult<T>
      } catch (cause) {
        throw new AppError('protocol', 'Invalid JSON response', {cause, responseBody: responseText})
      }
    }
    return responseText as unknown as ApiResult<T>
  }

  private readErrorCode(errorData: unknown): string | undefined {
    if (!errorData || typeof errorData !== 'object') return undefined
    const record = errorData as Record<string, unknown>
    const nested = record['error']
    const code = record['code'] ?? (nested && typeof nested === 'object' ? (nested as Record<string, unknown>)['code'] : undefined)
    return code == null ? undefined : String(code)
  }

  private parseRetryAfter(value: string | null): number | undefined {
    if (!value) return undefined
    if (/^\d+$/.test(value)) return Number(value) * 1000
    const timestamp = Date.parse(value)
    return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : undefined
  }

  private normalizeError(error: unknown): AppError | unknown {
    if (error instanceof AppError) return error
    if (error instanceof Error) {
      return new AppError(
        error.name === 'AbortError' ? 'timeout' : 'network',
        error.message || 'Network request failed',
        {cause: error}
      )
    }
    return new AppError('unknown', 'Request failed', {cause: error})
  }

  /**
   * 清理鉴权相关本地状态并跳转到首页。
   */
  private async clearAuthAndRedirect(): Promise<void> {
    this.clearManagedHeaders()
    if (this.config.persistManagedHeaders && typeof window !== 'undefined') {
      try {
        // 仅清理框架相关鉴权键，避免误伤宿主应用其他缓存
        const authKeys = ['userId', 'token', 'accessToken', 'refreshToken']
        authKeys.forEach((key) => {
          localStorage.removeItem(key)
          sessionStorage.removeItem(key)
        })
      } catch (_) {}
    }
    await this.authRedirectPort.clearSession?.()
    if (this.authRedirectPort.redirect) {
      await this.authRedirectPort.redirect(typeof location !== 'undefined' ? location.href : undefined)
    } else if (this.router) {
      // 兼容旧应用：只有没有提供端口时才保留 Router fallback。
      await this.router.navigateByUrl('/')
    }
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
    if (!this.config.sendHardwareFingerprint) return headers
    try {
      const hmacSecret = this.getHardwareFingerprintHmacSecret()
      if (hmacSecret) {
        // 配置了密钥时，发送签名后的安全指纹
        const secureFingerprint = await generateSecureHardwareFingerprint()
        headers['X-Hardware-Fingerprint'] = await signHardwareFingerprint(secureFingerprint, hmacSecret)
      } else if (this.config.allowUnsignedHardwareFingerprint) {
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
    return this.managedHeadersStore.load(this.managedHeadersStoreOptions)
  }

  /**
   * 保存响应中的业务头到本地缓存（过滤系统头）。
   * @param response fetch 响应对象
   */
  private saveResponseHeaders(response: Response): void {
    if (typeof window === 'undefined') return
    try {
      const businessHeaders: Record<string, unknown> = {}
      response.headers.forEach((value, key) => {
        const lowerKey = key.toLowerCase()
        if (
          this.isManagedHeaderAllowed(lowerKey) &&
          !AbstractService.SYSTEM_HEADERS.has(lowerKey)
        ) {
          businessHeaders[lowerKey] = value
        }
      })
      if (Object.keys(businessHeaders).length > 0) {
        this.managedHeadersStore.save(
          this.filterManagedHeaders({...this.loadCachedHeaders(), ...businessHeaders}),
          this.managedHeadersStoreOptions
        )
      }
    } catch (_) {}
  }

  private filterManagedHeaders(headers: Record<string, unknown>): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase()
      if (
        this.isManagedHeaderAllowed(lowerKey) &&
        typeof value === 'string' &&
        !AbstractService.SYSTEM_HEADERS.has(lowerKey)
      ) {
        result[lowerKey] = value
      }
    }
    return result
  }

  /**
   * 判断响应头是否允许由框架自动托管。
   *
   * 默认仍拒绝 authorization/token 等敏感头；Gateway 使用的
   * x-rd-request-apitoken 是显式配置的会话令牌头，只有在
   * managedResponseHeaders 中明确声明时才允许进入托管缓存。
   */
  private isManagedHeaderAllowed(lowerKey: string): boolean {
    if (!this.config.managedResponseHeaders.includes(lowerKey)) return false
    if (lowerKey === 'x-rd-request-apitoken') return true
    return !/authorization|token|cookie|secret|password|refresh/i.test(lowerKey)
  }

  /**
   * 获取框架托管的响应头。
   * 业务层无需读取或解析 headerStorageKey 对应的 Web Storage。
   */
  getManagedHeader(name: string): string | null {
    const target = name.toLowerCase()
    return Object.entries(this.loadCachedHeaders()).find(([key, value]) =>
      key.toLowerCase() === target && value.trim().length > 0
    )?.[1] ?? null
  }

  /**
   * 清理框架托管的响应头缓存（例如显式退出登录）。
   */
  clearManagedHeaders(): void {
    this.managedHeadersStore.clear(this.managedHeadersStoreOptions)
  }

  private get managedHeadersStoreOptions(): ManagedHeadersStoreOptions {
    return {
      persist: this.config.persistManagedHeaders,
      storageKey: this.config.headerStorageKey,
      ttlMs: this.config.managedHeadersTtlMs
    }
  }

  /**
   * 展示全局加载态（优先 Capacitor 插件，回退 DOM 节点）。
   */
  private showLoadingState(): void {
    this.activeLoadingRequests += 1
    if (this.activeLoadingRequests === 1) void this.loadingPort.show?.()
  }

  /**
   * 隐藏全局加载态（优先 Capacitor 插件，回退 DOM 节点）。
   */
  private hideLoadingState(): void {
    this.activeLoadingRequests = Math.max(0, this.activeLoadingRequests - 1)
    if (this.activeLoadingRequests === 0) void this.loadingPort.hide?.()
  }

  /**
   * 展示错误提示（优先 Toast，回退 alert）。
   * @param message 待展示的错误文案
   */
  private showErrorMessage(message: string): void {
    void this.notificationPort.error?.(message)
  }

  /**
   * 更新配置（如 baseUrl、clientId、防重复时间窗等）
   */
  updateConfig(newConfig: Partial<HttpClientConfig>): void {
    // 仅覆盖显式传入字段，避免用 undefined 污染现有配置
    Object.entries(newConfig).forEach(([key, value]) => {
      if (value !== undefined) {
        const configKey = key as keyof typeof this.config
        if (configKey !== 'clientId' && configKey in this.config) {
          ;(this.config[configKey] as unknown) = value
        }
      }
    })
    // 变更防重复窗口时同步模块内部阈值
    if (newConfig.duplicateSubmitTimeWindow != null) {
      this.duplicateModule.updateTimeWindow(newConfig.duplicateSubmitTimeWindow)
    }
    // 变更密钥配置时刷新缓存后的 HMAC 密钥
    if ('hardwareFingerprintHmacSecret' in newConfig) {
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
    await this.ensureHandshake()
  }

  private translateText(key: string, fallback: string): string {
    try {
      const translated = this.translate?.instant(key)
      return translated || fallback
    } catch (_) {
      return fallback
    }
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
