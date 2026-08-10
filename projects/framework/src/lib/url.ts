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
  /** 动态网关前缀（运行时可由配置覆盖） */
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
      // 新写法：使用配置对象
      this._needEncryption = needEncryptionOrOptions.needEncryption || false;
      this._needDuplicateCheck = needEncryptionOrOptions.needDuplicateCheck || false;
    } else {
      // 兼容旧写法：使用简化布尔参数
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
    // 通过最终 URL 字符串反查枚举实例
    for (const obj of values) {
      if (obj.value() === url) {
        return obj
      }
    }
    throw new Error(`您访问的页面地址无效，url = ${url}`)
  }

  /**
   * 解析最终 URL。
   * - GET 支持 `{}` 占位符替换
   * - HTTP 请求方法自动拼接 `dynamicUrl`
   * - LOCATION/NAVIGATOR 保持原值
   * @param args 路径参数数组（用于 `{}` 替换）
   */
  value(args?: unknown[], baseUrlOverride?: string): string {
    const baseUrl = baseUrlOverride ?? Url.dynamicUrl
    switch (this._method) {
      case Method.POST:
      case Method.PUT:
      case Method.DELETE:
      case Method.PATCH:
        console.debug('url = ', baseUrl + this._value)
        return baseUrl + this._value
      case Method.GET:
        // GET 场景支持按顺序替换路径中的 {}
        if (this._value.includes('{}') && args && args.length > 0) {
          let url = this._value
          if (args && args.length > 0) {
            let index = 0
            url = url.replace(/\{}/g, () => (args && args.length > index ? String(args[index++]) : ''))
          }
          console.debug('url =', baseUrl + url)
          return baseUrl + url
        }
        console.debug('url =', baseUrl + this._value)
        return baseUrl + this._value
      case Method.LOCATION:
      default:
        // 本地路由或 mock 场景不拼接网关前缀
        console.debug('mock/location url = ', this._value)
        return this._value
    }
  }

  /**
   * 获取当前 URL 对应的方法类型。
   */
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
