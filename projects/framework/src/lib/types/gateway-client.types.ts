import {InjectionToken} from '@angular/core'

/** Gateway 客户端可替换的加载态适配端口。Core 不直接操作 DOM 或 Capacitor。 */
export interface LoadingPort {
  show?(context?: {requestId?: string}): void | Promise<void>
  hide?(context?: {requestId?: string}): void | Promise<void>
}

/** Gateway 错误提示适配端口。Core 只发出结构化错误，不负责 alert/Toast。 */
export interface NotificationPort {
  error?(message: string, error?: unknown): void | Promise<void>
}

/** 认证失效后的会话清理与跳转适配端口。 */
export interface AuthRedirectPort {
  clearSession?(): void | Promise<void>
  redirect?(returnUrl?: string): void | Promise<void>
}

/** 运行时 Gateway 客户端配置。适配层可通过 provider 提供，业务也可在子类构造时传入。 */
export interface GatewayClientConfig {
  baseUrl?: string
  clientId?: string
  cryptoExchangePath?: string
  protocolVersion?: string
  duplicateSubmitTimeWindow?: number
  showLoading?: boolean
  maxRetries?: number
  retryInterval?: number
  timeout?: number
  enableHeaderAutoManagement?: boolean
  headerStorageKey?: string
  /** 只有显式列出的响应头才允许被自动管理；默认空数组。 */
  managedResponseHeaders?: string[]
  /** 是否将自动管理的业务头持久化到 Web Storage。默认 false，仅内存缓存。 */
  persistManagedHeaders?: boolean
  managedHeadersTtlMs?: number
  hardwareFingerprintHmacSecret?: string | null
  /** 是否发送设备硬件指纹；默认 false，避免未同意的高熵追踪。 */
  sendHardwareFingerprint?: boolean
  /** 仅在明确兼容旧 Gateway 时允许无签名指纹，默认 false。 */
  allowUnsignedHardwareFingerprint?: boolean
}

export const GATEWAY_CLIENT_CONFIG = new InjectionToken<GatewayClientConfig>(
  'GATEWAY_CLIENT_CONFIG'
)

export const LOADING_PORT = new InjectionToken<LoadingPort>('LOADING_PORT', {
  providedIn: 'root',
  factory: () => ({})
})

export const NOTIFICATION_PORT = new InjectionToken<NotificationPort>('NOTIFICATION_PORT', {
  providedIn: 'root',
  factory: () => ({})
})

export const AUTH_REDIRECT_PORT = new InjectionToken<AuthRedirectPort>('AUTH_REDIRECT_PORT', {
  providedIn: 'root',
  factory: () => ({})
})

export function provideGatewayClient(config: GatewayClientConfig = {}) {
  return {
    provide: GATEWAY_CLIENT_CONFIG,
    useValue: config
  }
}
