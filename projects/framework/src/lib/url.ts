import { Enum } from './abstract.enums'
import { Method } from '../public-api'

/**
 * URL配置选项
 */
export interface UrlOptions {
  /** 是否需要加密（默认false） */
  needEncryption?: boolean;
  /** 是否需要防重复提交检查（默认false） */
  needDuplicateCheck?: boolean;
}

/**
 * 前端页面地址枚举类
 */
export class Url extends Enum<Url> {
  static dynamicUrl: string = ''
  private readonly _needEncryption: boolean;
  private readonly _needDuplicateCheck: boolean;

  constructor(
    _objectName: string,
    private _value: string,
    private _method: Method,
    needEncryptionOrOptions?: boolean | UrlOptions,
    needDuplicateCheck?: boolean
  ) {
    super(_objectName)

    // 处理参数
    if (typeof needEncryptionOrOptions === 'object') {
      // 使用配置对象
      this._needEncryption = needEncryptionOrOptions.needEncryption || false;
      this._needDuplicateCheck = needEncryptionOrOptions.needDuplicateCheck || false;
    } else {
      // 使用简化参数
      this._needEncryption = needEncryptionOrOptions || false;
      this._needDuplicateCheck = needDuplicateCheck || false;
    }
  }

  /**
   * 根据枚举名称获取统一资源定位符对象的函数
   * @param url URL地址
   * @return {Url} 返回统一资源定位符对象（如果ID无效则返回null）
   */
  public static urlOf(url: string): Url {
    const values: ReadonlyArray<Url> = Url.values()
    for (const obj of values) {
      if (obj.value() === url) {
        return obj
      }
    }
    throw new Error(`您访问的页面地址无效，url = ${url}`)
  }

  value(args?: any[]): string {
    switch (this._method) {
      case Method.POST:
      case Method.PUT:
      case Method.DELETE:
        console.debug('url = ', Url.dynamicUrl + this._value)
        return Url.dynamicUrl + this._value
      case Method.GET:
        if (this._value.includes('{}') && args && args.length > 0) {
          let url = this._value
          if (args && args.length > 0) {
            let index = 0
            url = url.replace(/\{}/g, () => (args && args.length > index ? args[index++] : ''))
          }
          console.debug('url =', Url.dynamicUrl + url)
          return Url.dynamicUrl + url
        }
        console.debug('url =', Url.dynamicUrl + this._value)
        return Url.dynamicUrl + this._value
      case Method.LOCATION:
      default:
        console.debug('mock/location url = ', this._value)
        return this._value
    }
  }

  get method(): Method {
    return this._method
  }

  /**
   * 是否需要加密
   */
  public get needEncryption(): boolean {
    return this._needEncryption;
  }

  /**
   * 是否需要防重复提交检查
   */
  public get needDuplicateCheck(): boolean {
    return this._needDuplicateCheck;
  }
}
