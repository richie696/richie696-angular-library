import {Preferences} from "@richie696/capacitor-preferences";

/**
 * 本地存储API
 * @author richie696
 * @version 1.0
 * @since 2024/04/09
 */
export class LocalStorage {
  /**
   * 存储数据
   * @param key       存储键
   * @param value     存储值
   * @param namespace 命名空间
   */
  static async setItem<T>(key: string, value: T, namespace?: string): Promise<void> {
    const storageKey = LocalStorage.scopedKey(key, namespace)
    // Capacitor 环境优先使用原生 Preferences
    if (LocalStorage.isCapacitorEnv()) {
      await Preferences.set({ key, value: JSON.stringify(value), group: namespace })
      return
    }
    // Web 环境优先 localStorage，不可用时降级 cookie
    if (LocalStorage.isLocalStorageAvailable()) {
      localStorage.setItem(storageKey, JSON.stringify(value))
    } else if (typeof document !== 'undefined') {
      document.cookie = encodeURIComponent(storageKey) + '=' + encodeURIComponent(JSON.stringify(value)) + '; Path=/; SameSite=Lax'
    }
  }

  /**
   * 获取存储值的方法
   * @param key       存储键
   * @param namespace 命名空间
   * @return          存储值
   */
  static async getItem<T>(key: string, namespace?: string): Promise<T | null> {
    const storageKey = LocalStorage.scopedKey(key, namespace)
    // Capacitor 环境从 Preferences 读取并反序列化
    if (LocalStorage.isCapacitorEnv()) {
      const res = await Preferences.get({key, group: namespace})
      if (!res || !res.value) {
        return null
      }
      return LocalStorage.parse<T>(res.value)
    }
    if (LocalStorage.isLocalStorageAvailable()) {
      return LocalStorage.parse<T>(localStorage.getItem(storageKey))
    } else if (typeof document !== 'undefined') {
      // cookie 兼容读取
      const cookies = document.cookie.split(';')
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i]
        const eqPos = cookie.indexOf('=')
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim()
        if (name === encodeURIComponent(storageKey)) {
          return LocalStorage.parse<T>(decodeURIComponent(cookie.substring(eqPos + 1)))
        }
      }
    }
    return null
  }

  /**
   * 删除存储值的方法
   * @param key       存储键
   * @param namespace 命名空间
   */
  static async removeItem(key: string, namespace?: string): Promise<void> {
    const storageKey = LocalStorage.scopedKey(key, namespace)
    if (LocalStorage.isCapacitorEnv()) {
      await Preferences.remove({key, group: namespace})
      return
    }
    // Web 环境按当前可用存储介质删除
    if (LocalStorage.isLocalStorageAvailable()) {
      localStorage.removeItem(storageKey)
    } else if (typeof document !== 'undefined') {
      document.cookie = encodeURIComponent(storageKey) + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax'
    }
  }

  /**
   * 清空存储值的方法
   * @param namespace 命名空间
   */
  static async clear(namespace?: string): Promise<void> {
    if (LocalStorage.isCapacitorEnv()) {
      await Preferences.clear(namespace)
      return
    }
    if (LocalStorage.isLocalStorageAvailable()) {
      if (namespace) {
        const prefix = `${namespace}:`
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i)
          if (key?.startsWith(prefix)) localStorage.removeItem(key)
        }
      } else {
        localStorage.clear()
      }
    } else if (typeof document !== 'undefined') {
      // 仅清空当前命名空间，未指定时保留旧的全域清理语义。
      const cookies = document.cookie.split(';')
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i]
        const eqPos = cookie.indexOf('=')
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim()
        if (!namespace || name.startsWith(encodeURIComponent(`${namespace}:`))) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax`
        }
      }
    }
  }

  /**
   * 判断存储值是否存在的方法
   * @param key         存储键
   * @param namespace   命名空间
   * @returns {boolean} 是否存在
   */
  static async isExist(key: string, namespace?: string): Promise<boolean> {
    const storageKey = LocalStorage.scopedKey(key, namespace)
    if (LocalStorage.isCapacitorEnv()) {
      return Preferences.get({key, group: namespace})
        .then((res) => {
          return res && res.value !== null
        })
        .catch((e: unknown) => {
          console.error(e)
          return false
        })
    }
    if (LocalStorage.isLocalStorageAvailable()) {
      return localStorage.getItem(storageKey) !== null
    } else if (typeof document !== 'undefined') {
      // cookie 兼容检查
      const cookies = document.cookie.split(';')
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i]
        const eqPos = cookie.indexOf('=')
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim()
        if (name === encodeURIComponent(storageKey)) {
          return true
        }
      }
    }
    return false
  }

  /**
   * 判断是否运行在 Capacitor 可用环境。
   */
  private static isCapacitorEnv(): boolean {
    const capacitor = (globalThis as {Capacitor?: {isNativePlatform?: () => boolean}}).Capacitor
    return Boolean(capacitor?.isNativePlatform?.())
  }

  /**
   * 检查 localStorage 是否可用（含隐私模式等异常场景）。
   */
  private static isLocalStorageAvailable(): boolean {
    if (typeof localStorage === 'undefined') return false
    const testKey = `__ar_storage_test_${Date.now()}`
    try {
      localStorage.setItem(testKey, testKey)
      localStorage.removeItem(testKey)
      return true
    } catch (_) {
      return false
    }
  }

  private static scopedKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key
  }

  private static parse<T>(value: string | null): T | null {
    if (!value) return null
    try {
      return JSON.parse(value) as T
    } catch (_) {
      return null
    }
  }
}
