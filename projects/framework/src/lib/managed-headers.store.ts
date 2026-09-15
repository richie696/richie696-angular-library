import {Injectable} from '@angular/core'

/** `AbstractService` 传入的托管响应头持久化配置。 */
export interface ManagedHeadersStoreOptions {
  persist: boolean
  storageKey: string
  ttlMs: number
}

type StoredManagedHeaders = {
  headers?: Record<string, unknown>
  expiresAt?: number
} & Record<string, unknown>

/**
 * 应用级托管请求头缓存。
 *
 * 所有 `AbstractService` 子类共用同一个 root DI 实例，避免会话刷新后只有
 * 认证 API 更新了令牌而其他 API 继续携带旧内存令牌。
 */
@Injectable({providedIn: 'root'})
export class ManagedHeadersStore {
  private headers: Record<string, string> = {}
  private expiresAt = 0
  private readonly persistedStorageKeys = new Set<string>()

  /** 读取未过期的托管请求头；内存为空时兼容旧的 localStorage 格式。 */
  load(options: ManagedHeadersStoreOptions): Record<string, string> {
    this.registerPersistedStorageKey(options)
    if (this.isExpired()) {
      this.clearMemory()
    }
    if (Object.keys(this.headers).length > 0) return {...this.headers}
    if (!options.persist || typeof window === 'undefined') return {}

    try {
      const cached = localStorage.getItem(options.storageKey)
      if (!cached) return {}
      const parsed: unknown = JSON.parse(cached)
      if (!parsed || typeof parsed !== 'object') return {}
      const stored = parsed as StoredManagedHeaders
      const headers = stored.headers && typeof stored.headers === 'object' ? stored.headers : stored
      const expiresAt = typeof stored.expiresAt === 'number'
        ? stored.expiresAt
        : Date.now() + options.ttlMs
      if (expiresAt <= Date.now()) return {}

      this.headers = this.toStringHeaders(headers)
      this.expiresAt = expiresAt
      return {...this.headers}
    } catch (_) {
      return {}
    }
  }

  /** 覆盖应用级缓存，并按现有配置持久化到 localStorage。 */
  save(headers: Record<string, string>, options: ManagedHeadersStoreOptions): void {
    if (typeof window === 'undefined') return
    this.registerPersistedStorageKey(options)
    this.headers = {...headers}
    this.expiresAt = Date.now() + options.ttlMs
    if (!options.persist) return

    try {
      localStorage.setItem(options.storageKey, JSON.stringify({
        headers: this.headers,
        expiresAt: this.expiresAt
      }))
    } catch (_) {}
  }

  /** 清空内存和本应用已经使用过的托管 localStorage 键。 */
  clear(options: Pick<ManagedHeadersStoreOptions, 'persist' | 'storageKey'>): void {
    this.clearMemory()
    if (options.persist) this.persistedStorageKeys.add(options.storageKey)
    if (typeof window === 'undefined') return

    for (const storageKey of this.persistedStorageKeys) {
      try {
        localStorage.removeItem(storageKey)
      } catch (_) {}
    }
  }

  private isExpired(): boolean {
    return this.expiresAt > 0 && this.expiresAt <= Date.now()
  }

  private clearMemory(): void {
    this.headers = {}
    this.expiresAt = 0
  }

  private registerPersistedStorageKey(options: Pick<ManagedHeadersStoreOptions, 'persist' | 'storageKey'>): void {
    if (options.persist) this.persistedStorageKeys.add(options.storageKey)
  }

  private toStringHeaders(headers: Record<string, unknown>): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(headers)) {
      if (typeof value === 'string' && value.trim().length > 0) {
        result[key.toLowerCase()] = value
      }
    }
    return result
  }
}
