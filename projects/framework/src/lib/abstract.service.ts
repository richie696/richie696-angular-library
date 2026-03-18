/**
 * AbstractService - 抽象服务基类
 * 集成 HTTP 客户端能力：支持 ECC 加密、防重复提交、设备指纹与请求头管理
 * 适配 Url 枚举与 ResultVO 响应，保持 request 方法签名不变
 */
import {inject} from '@angular/core'
import {Router} from '@angular/router'
import {TranslateService} from '@ngx-translate/core'
import {Url} from './url'
import {Callback, Method, ResultVO} from '../public-api'
import {getOrCreateDeviceId} from './device-id'
import {
  fingerprintToString,
  generateHardwareFingerprint,
  generateSecureHardwareFingerprint,
  signHardwareFingerprint
} from './device-fingerprint'

// ==================== 类型定义 ====================

export interface RequestHeader {
  [key: string]: string
}

/**
 * HTTP 客户端配置（可选，用于子类或工厂）
 */
export interface HttpClientConfig {
  baseUrl?: string
  clientId?: string
  duplicateSubmitTimeWindow?: number
  showLoading?: boolean
  maxRetries?: number
  retryInterval?: number
  timeout?: number
  enableHeaderAutoManagement?: boolean
  headerStorageKey?: string
  /** 硬件指纹 HMAC 密钥（可以是明文或 Base64 编码） */
  hardwareFingerprintHmacSecret?: string | null
}

interface RequestInfo {
  timestamp: number
  url: string
}

interface RequestOptions {
  body?: any
  headers?: Record<string, string>
  requestId?: string
  allowRetry?: boolean
  pathParams?: any[]
}

// ==================== ECC 加密模块 ====================

class EccCryptoModule {
  private readonly algorithm: EcKeyGenParams = {
    name: 'ECDH',
    namedCurve: 'P-256'
  }
  private keyPair: CryptoKeyPair | null = null
  private sharedKey: CryptoKey | null = null
  private gatewayPublicKey: CryptoKey | null = null
  public gatewayKeyId: string | null = null

  async generateKeyPair(): Promise<CryptoKeyPair> {
    this.keyPair = await window.crypto.subtle.generateKey(
      this.algorithm,
      true,
      ['deriveKey', 'deriveBits']
    )
    return this.keyPair
  }

  async exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('spki', publicKey)
    return btoa(String.fromCharCode(...new Uint8Array(exported)))
  }

  async importPublicKey(base64PublicKey: string): Promise<CryptoKey> {
    const binaryString = atob(base64PublicKey)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return await window.crypto.subtle.importKey('spki', bytes, this.algorithm, true, [])
  }

  async generateSharedKey(remotePublicKey: CryptoKey): Promise<CryptoKey> {
    if (!this.keyPair) throw new Error('本地密钥对未生成')
    this.sharedKey = await window.crypto.subtle.deriveKey(
      { name: 'ECDH', public: remotePublicKey },
      this.keyPair.privateKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
    return this.sharedKey
  }

  async encrypt(data: string): Promise<string> {
    if (!this.sharedKey) throw new Error('共享密钥未初始化')
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    const encodedData = new TextEncoder().encode(data)
    const encryptedData = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.sharedKey,
      encodedData
    )
    const combined = new Uint8Array(iv.length + encryptedData.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encryptedData), iv.length)
    return btoa(String.fromCharCode(...combined))
  }

  async decrypt(encryptedData: string): Promise<string> {
    if (!this.sharedKey) throw new Error('共享密钥未初始化')
    const combined = new Uint8Array(atob(encryptedData).split('').map((c) => c.charCodeAt(0)))
    const iv = combined.slice(0, 12)
    const data = combined.slice(12)
    const decryptedData = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.sharedKey,
      data
    )
    return new TextDecoder().decode(decryptedData)
  }

  async exchangeKeys(baseUrl: string, clientId: string): Promise<boolean> {
    await this.generateKeyPair()
    const clientPublicKey = await this.exportPublicKey(this.keyPair!.publicKey)
    const response = await fetch(`${baseUrl}/api/crypto/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Public-Key': clientPublicKey,
        'X-Client-Id': clientId
      }
    })
    if (!response.ok) throw new Error(`密钥交换失败: ${response.status}`)
    const result = await response.json()
    this.gatewayKeyId = result.keyId
    this.gatewayPublicKey = await this.importPublicKey(result.gatewayPublicKey)
    await this.generateSharedKey(this.gatewayPublicKey)
    return true
  }

  async reHandshake(keyId: string, gatewayPublicKey: string): Promise<void> {
    this.gatewayKeyId = keyId
    this.gatewayPublicKey = await this.importPublicKey(gatewayPublicKey)
    await this.generateSharedKey(this.gatewayPublicKey)
  }

  isInitialized(): boolean {
    return this.sharedKey !== null && this.gatewayKeyId !== null
  }

  cleanup(): void {
    this.keyPair = null
    this.sharedKey = null
    this.gatewayPublicKey = null
    this.gatewayKeyId = null
  }
}

// ==================== 防重复提交模块 ====================

class DuplicateSubmitModule {
  private requestQueue = new Map<string, RequestInfo>()
  private timeWindow: number

  constructor(timeWindow: number = 3000) {
    this.timeWindow = timeWindow
  }

  generateRequestId(url: string, method: string, body: any, userId: string | null): string {
    const data = {
      url,
      method,
      body: body ? JSON.stringify(body) : '',
      userId: userId || '',
      timestamp: Math.floor(Date.now() / this.timeWindow) * this.timeWindow
    }
    const str = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i)
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  isDuplicateRequest(requestId: string): boolean {
    const info = this.requestQueue.get(requestId)
    if (!info) return false
    return Date.now() - info.timestamp < this.timeWindow
  }

  recordRequest(requestId: string, url: string): void {
    this.requestQueue.set(requestId, { timestamp: Date.now(), url })
    this.cleanupExpiredRequests()
  }

  clearRequest(requestId: string): void {
    this.requestQueue.delete(requestId)
  }

  cleanupExpiredRequests(): void {
    const expired = Date.now() - this.timeWindow
    for (const [id, info] of this.requestQueue.entries()) {
      if (info.timestamp < expired) this.requestQueue.delete(id)
    }
  }

  clearAll(): void {
    this.requestQueue.clear()
  }

  updateTimeWindow(timeWindow: number): void {
    this.timeWindow = timeWindow
  }
}

// ==================== AbstractService ====================

export abstract class AbstractService {

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

  constructor() {
    this.router = inject(Router)
    this.translate = inject(TranslateService)
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
  ): Promise<ResultVO<T>> {
    if (url.method === Method.LOCATION || url.method === Method.NAVIGATOR) {
      try {
        finalizeCallback?.()
      } catch (_) {}
      return {
        code: -1,
        msg: this.translate.instant('app.common.request.type.error')
      } as unknown as ResultVO<T>
    }

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
      return await this.doRequest<T>(url, options, queryParams)
    } finally {
      try {
        finalizeCallback?.()
      } catch (_) {}
    }
  }

  /**
   * 内部统一请求：防重复、加载态、加密/明文、响应头保存、401 处理
   */
  private async doRequest<T>(
    url: Url,
    options: RequestOptions,
    queryParams?: Record<string, any>
  ): Promise<ResultVO<T>> {
    const fullUrl = this.buildFullUrl(url, options.pathParams, queryParams)
    const method = url.method

    let requestId: string | undefined
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
      if (this.config.showLoading) this.hideLoadingState()
    }
  }

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

  private async sendEncryptedRequest(
    url: string,
    method: string,
    options: RequestOptions,
    allowRetry: boolean
  ): Promise<Response> {
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

    if (response.status === 423) {
      const result = await response.json()
      if (result.needReHandshake && allowRetry) {
        await this.eccModule.reHandshake(result.keyId, result.gatewayPublicKey)
        return this.sendEncryptedRequest(url, method, options, false)
      }
    }

    return response
  }

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

    return fetch(url, {
      method,
      headers,
      body: requestBody,
      signal: AbortSignal.timeout(this.config.timeout)
    })
  }

  private async handleHttpResponse<T>(
    response: Response,
    needDecryption: boolean
  ): Promise<ResultVO<T>> {
    const responseText = await response.text()

    if (!response.ok) {
      const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`)
      error.status = response.status
      error.response = response

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

      if (response.status === 401) {
        await this.clearAuthAndRedirect()
        return {
          code: 401,
          msg: this.translate.instant('app.common.request.unauthorized') || '未授权'
        } as unknown as ResultVO<T>
      }

      throw error
    }

    if (needDecryption && response.headers.get('X-Response-Encrypted') === 'true') {
      const decryptedText = await this.eccModule.decrypt(responseText)
      return JSON.parse(decryptedText) as ResultVO<T>
    }

    return responseText ? (JSON.parse(responseText) as ResultVO<T>) : ({} as ResultVO<T>)
  }

  private async clearAuthAndRedirect(): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(this.headerStorageKey)
        sessionStorage.clear()
        localStorage.clear()
      } catch (_) {}
    }
    await this.router.navigateByUrl('/')
  }

  getUserId(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userId') || sessionStorage.getItem('userId')
    }
    return null
  }

  private async buildDeviceHeaders(): Promise<Record<string, string>> {
    if (typeof window === 'undefined') return {}

    const headers: Record<string, string> = {}
    try {
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
        // 优先生成带安全字段并使用 HMAC 签名的指纹
        const secureFingerprint = await generateSecureHardwareFingerprint()
        headers['X-Hardware-Fingerprint'] = await signHardwareFingerprint(secureFingerprint, hmacSecret)
      } else {
        // 未配置密钥时，退回到原始指纹 JSON（兼容旧行为）
        const fingerprint = await generateHardwareFingerprint()
        const fingerprintJson = fingerprintToString(fingerprint)
        if (fingerprintJson) headers['X-Hardware-Fingerprint'] = fingerprintJson
      }
    } catch (e) {
      console.warn('[AbstractService] 生成硬件指纹失败:', e)
    }
    return headers
  }

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
    Object.assign(this.config, newConfig)
    if (newConfig.duplicateSubmitTimeWindow != null) {
      this.duplicateModule.updateTimeWindow(newConfig.duplicateSubmitTimeWindow)
    }
    if (newConfig.baseUrl != null) {
      Url.dynamicUrl = newConfig.baseUrl
    }
    if (newConfig.hardwareFingerprintHmacSecret != null) {
      this.setHardwareFingerprintHmacSecret(newConfig.hardwareFingerprintHmacSecret)
    }
  }

  /**
   * 释放 ECC 与防重复提交资源
   */
  cleanup(): void {
    this.eccModule.cleanup()
    this.duplicateModule.clearAll()
  }

  /**
   * 预初始化 ECC 密钥交换（可选，首次加密请求也会自动执行）
   */
  async initializeEncryption(): Promise<void> {
    await this.eccModule.exchangeKeys(this.config.baseUrl, this.clientId)
  }

  /**
   * 由业务侧（例如前端应用）传入硬件指纹 HMAC 密钥。
   * 支持明文或 Base64 编码的二进制字符串。
   */
  protected setHardwareFingerprintHmacSecret(secretFromConfig: string | null | undefined): void {
    if (!secretFromConfig || secretFromConfig === 'default-secret-key-change-in-production') {
      console.warn(
        '[AbstractService] 硬件指纹 HMAC 密钥未配置或为默认值，生产环境必须配置强密钥！'
      )
      this.hmacSecretCache = null
      return
    }
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
      return atob(encodedSecret)
    } catch (e) {
      console.error('[AbstractService] HMAC 密钥解码失败，使用原始值:', e)
      return encodedSecret
    }
  }
}
