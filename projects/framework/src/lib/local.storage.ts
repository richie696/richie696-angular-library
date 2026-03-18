import {Preferences} from "@capacitor-rydeen/preferences";

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
    if (LocalStorage.isCapacitorEnv()) {
      Preferences.set({ key: key, value: JSON.stringify(value), group: namespace }).catch((e) => console.error(e))
      return
    }
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

  private static isCapacitorEnv() {
    return typeof Preferences !== 'undefined'
  }

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
