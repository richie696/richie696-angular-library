/**
 * 防重复提交队列中的请求记录。
 */
export interface RequestInfo {
  /** 记录请求的时间戳（毫秒） */
  timestamp: number
  /** 请求的完整 URL（含 path/query） */
  url: string
}

/**
 * `AbstractService` 内部统一请求参数。
 */
export interface RequestOptions {
  /** 请求体（GET 时通常为空） */
  body?: unknown
  /** 额外请求头 */
  headers?: Record<string, string>
  /** 指定请求唯一标识（用于防重复提交） */
  requestId?: string
  /** 是否允许在特定场景下自动重试 */
  allowRetry?: boolean
  /** 路径参数数组，用于 URL 模板替换 */
  pathParams?: unknown[]
  /** 显式幂等键；提供后允许安全重试写请求。 */
  idempotencyKey?: string
  /** 是否跳过框架托管的业务请求头（登录等匿名入口使用）。 */
  skipManagedHeaders?: boolean
}
