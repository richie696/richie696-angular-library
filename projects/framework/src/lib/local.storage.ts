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
  static async setItem(key: string, value: any, namespace?: string): Promise<void> {
    // Capacitor 环境优先使用原生 Preferences
    if (LocalStorage.isCapacitorEnv()) {
      Preferences.set({ key: key, value: JSON.stringify(value), group: namespace }).catch((e) => console.error(e))
      return
    }
    // Web 环境优先 localStorage，不可用时降级 cookie
    if (LocalStorage.isLocalStorageAvailable()) {
      localStorage.setItem(key, JSON.stringify(value))
    } else {
      document.cookie = encodeURIComponent(key) + '=' + encodeURIComponent(JSON.stringify(value)) + '; path=/'
    }
  }

  /**
   * 获取存储值的方法
   * @param key       存储键
   * @param namespace 命名空间
   * @return          存储值
   */
  static async getItem<T>(key: string, namespace?: string): Promise<T | null> {
    // Capacitor 环境从 Preferences 读取并反序列化
    if (LocalStorage.isCapacitorEnv()) {
      const res = await Preferences.get({ key: key, group: namespace })
      if (!res || !res.value) {
        return null
      }
      return <T>JSON.parse(res.value)
    }
    if (LocalStorage.isLocalStorageAvailable()) {
      return <T>JSON.parse(localStorage.getItem(key) || 'null')
    } else {
      // cookie 兼容读取
      const cookies = document.cookie.split(';')
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i]
        const eqPos = cookie.indexOf('=')
        const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie
        if (name === key) {
          return <T>JSON.parse(decodeURIComponent(cookie.substring(eqPos + 1)))
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
    if (LocalStorage.isCapacitorEnv()) {
      Preferences.remove({ key: key, group: namespace }).catch((e) => console.error(e))
      return
    }
    // Web 环境按当前可用存储介质删除
    if (LocalStorage.isLocalStorageAvailable()) {
      localStorage.removeItem(key)
    } else {
      document.cookie = encodeURIComponent(key) + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
    }
  }

  /**
   * 清空存储值的方法
   * @param namespace 命名空间
   */
  static async clear(namespace?: string): Promise<void> {
    if (LocalStorage.isCapacitorEnv()) {
      Preferences.clear(namespace).catch((e) => console.error(e))
      return
    }
    if (LocalStorage.isLocalStorageAvailable()) {
      localStorage.clear()
    } else {
      // 清空当前域下全部 cookie
      const cookies = document.cookie.split(';')
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i]
        const eqPos = cookie.indexOf('=')
        const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie
        document.cookie = encodeURIComponent(name) + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
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
    if (LocalStorage.isCapacitorEnv()) {
      return Preferences.get({ key: key, group: namespace })
        .then((res) => {
          return res && res.value !== null
        })
        .catch((e: any) => {
          console.error(e)
          return false
        })
    }
    if (LocalStorage.isLocalStorageAvailable()) {
      return localStorage.getItem(key) !== null
    } else {
      // cookie 兼容检查
      const cookies = document.cookie.split(';')
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i]
        const eqPos = cookie.indexOf('=')
        const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie
        if (name === key) {
          return true
        }
      }
    }
    return false
  }

  /**
   * 判断是否运行在 Capacitor 可用环境。
   */
  private static isCapacitorEnv() {
    return typeof Preferences !== 'undefined'
  }

  /**
   * 检查 localStorage 是否可用（含隐私模式等异常场景）。
   */
  private static isLocalStorageAvailable(): boolean {
    const testKey = 'test'
    try {
      localStorage.setItem(testKey, testKey)
      localStorage.removeItem(testKey)
      return true
    } catch (e) {
      return false
    }
  }
}
