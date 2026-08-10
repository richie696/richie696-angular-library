export type AppErrorKind =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'rate-limited'
  | 'duplicate'
  | 'server'
  | 'protocol'
  | 'cancelled'
  | 'unknown'

export interface AppErrorDetails {
  status?: number
  code?: string | number
  traceId?: string
  requestId?: string
  retryAfterMs?: number
  responseBody?: unknown
  cause?: unknown
}

/**
 * 所有 Gateway 请求的统一错误模型。
 * 该错误可安全序列化到日志，不依赖原生 Response 的循环引用。
 */
export class AppError extends Error {
  readonly kind: AppErrorKind
  readonly status?: number
  readonly code?: string | number
  readonly traceId?: string
  readonly requestId?: string
  readonly retryAfterMs?: number
  readonly responseBody?: unknown
  override readonly cause?: unknown

  constructor(kind: AppErrorKind, message: string, details: AppErrorDetails = {}) {
    super(message)
    this.name = 'AppError'
    this.kind = kind
    this.status = details.status
    this.code = details.code
    this.traceId = details.traceId
    this.requestId = details.requestId
    this.retryAfterMs = details.retryAfterMs
    this.responseBody = details.responseBody
    this.cause = details.cause
  }

  toJSON() {
    return {
      name: this.name,
      kind: this.kind,
      message: this.message,
      status: this.status,
      code: this.code,
      traceId: this.traceId,
      requestId: this.requestId,
      retryAfterMs: this.retryAfterMs,
      responseBody: this.responseBody
    }
  }
}
