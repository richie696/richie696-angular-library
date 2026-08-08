export interface RequestHeader {
  [key: string]: string
}

// SSE：`requestStream<T>()` 的泛型 T 由业务项目自行定义，框架不导出/不约束 envelope 结构。
export interface RequestStreamOptions<T = any> {
  /** 业务语义：网关/日志/埋点（框架仅写入请求头，不校验取值） */
  intent?: 'text' | 'voice' | 'multimodal' | 'dynamic_form' | string
  /** 覆盖 `Accept`；未传时若请求头也无 Accept，则默认 `text/event-stream` */
  accept?: string
  /** 自定义解析每条 SSE `data:` 行；未传时默认 `JSON.parse` */
  parseSseData?: (raw: string) => T
  /**
   * `FormData`（multipart）下是否跳过防重复提交。
   * 默认 `true`：multipart 内容哈希不稳定，跳过可避免误拦。
   * 设为 `false` 时仍走与 JSON 相同的防重复逻辑（body 参与哈希）。
   */
  skipDuplicateCheckForMultipart?: boolean
}

/**
 * HTTP 客户端配置（可选，用于子类或工厂）
 */
export interface HttpClientConfig {
  /** 网关基础地址（可覆盖默认动态地址解析结果） */
  baseUrl?: string
  /** 客户端唯一标识（用于请求透传与加密握手） */
  clientId?: string
  /** 防重复提交时间窗口（毫秒） */
  duplicateSubmitTimeWindow?: number
  /** 是否展示全局加载态 */
  showLoading?: boolean
  /** 最大重试次数（当前主要预留给重试策略扩展） */
  maxRetries?: number
  /** 重试间隔（毫秒） */
  retryInterval?: number
  /** 请求超时时间（毫秒） */
  timeout?: number
  /** 是否自动缓存并回灌业务响应头 */
  enableHeaderAutoManagement?: boolean
  /** 本地缓存响应头的存储键名 */
  headerStorageKey?: string
  /** 硬件指纹 HMAC 密钥（可以是明文或 Base64 编码） */
  hardwareFingerprintHmacSecret?: string | null
}
