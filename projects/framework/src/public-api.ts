/*
 * Public API Surface of framework
 */
import {EventNameEnum} from "./lib/event/event.name";

export * from './lib/event/event.name';
export * from './lib/event/event.manager';
export * from './lib/interceptors/mock.data';
export * from './lib/interceptors/mock.resolver';
export * from './lib/interceptors/mock.fetch';
export * from './lib/interceptors/mock.interceptor';
export * from './lib/pipes/date.format.pipe';
export * from './lib/abstract.prompt';
export * from './lib/abstract.component';
export * from './lib/abstract.service';
export * from './lib/types/gateway-client.types';
export * from './lib/errors/app-error';
export * from './lib/stream/sse.parser';
export * from './lib/abstract.enums';
export * from './lib/local.storage';
export * from './lib/url';
export * from './lib/lock/condition';
export * from './lib/lock/reentrant.lock';
export * from './lib/lock/stamped.lock';
export * from './lib/lock/read.write.lock';
export * from './lib/lock/count.down.latch';
export * from './lib/lock/cyclic.barrier';
export * from './lib/lock/synchronized';

/**
 * HTTP请求方法枚举
 *
 * @author richie696
 * @version 2.0
 * @since 2025-11-01
 */
export enum Method {
  /** HTTP GET请求 */
  GET = 'GET',
  /** HTTP POST请求 */
  POST = 'POST',
  /** HTTP PUT请求 */
  PUT = 'PUT',
  /** HTTP DELETE请求 */
  DELETE = 'DELETE',
  /** HTTP PATCH请求 */
  PATCH = 'PATCH',
  /** 本地页面导航 */
  NAVIGATOR = 'NAVIGATOR',
  /** Mock数据或Location */
  LOCATION = 'LOCATION'
}

export type Callback<T> = (value?: T) => void
/**
 * ApiResult 通用响应结构
 * 与服务端 Java ApiResult<T> 对应
 *
 * @author richie696
 * @version 1.0
 * @since 2025-01-XX
 */

/**
 * 国际化字典类型
 */
export interface I18nDict {
  [key: string]: {
    [key: string]: string;
  };
}

/**
 * 通用响应结果结构
 * 对应服务端 ApiResult<T>
 *
 * @template T 响应数据的类型
 *
 * @example
 * ```typescript
 * // 成功响应示例
 * const result: ApiResult<User> = {
 *   code: '200',
 *   msg: '操作成功',
 *   data: { id: 1, name: 'John' },
 *   i18nDict: {},
 *   timestamp: 1704067200000
 * };
 *
 * // 错误响应示例
 * const errorResult: ApiResult<null> = {
 *   code: '500',
 *   msg: '操作失败',
 *   data: null,
 *   i18nDict: {},
 *   timestamp: 1704067200000
 * };
 * ```
 */
export interface ApiResult<T = unknown> {
  /** 操作结果 */
  success: boolean;
  /** 结果数据 */
  data: T;
  /** 结果代码，成功通常为 '200' 或 EnumResultMsg.SUCCESS.getCode() */
  code: string;
  /** 错误信息或提示信息 */
  msg: string;
  /** 国际化字典 */
  i18nDict?: I18nDict;
  /** 时间戳（毫秒） */
  timestamp: number;
}

/**
 * 分页数据结构
 */
export interface Page<T> {
  current: number
  pages: number
  records: T[]
  size: number
  total: number
}

/**
 * 排序类型
 */
export enum OrderTypeEnum {
  ASC = 'ASC',
  DESC = 'DESC'
}

/**
 * 分页查询参数
 */
export interface PageQuery {
  pageNum: number
  pageSize: number
  orderName?: string
  orderType?: OrderTypeEnum
  total?: number
}

export interface BaseData {
  /** 租户代码 */
  tenantCode: string
  /** 租户过期时间 */
  tenantExpiredTime: string
  /** 用户名 */
  username: string
}

export interface TabData {
  /** 标题ID */
  titleId: string
  /** 图标 */
  icon: string
  /** 路由地址 */
  path: string
}

/**
 * 模态框事件
 */
export interface ModalResult<T> {
  result: boolean
  data?: T
}


export interface MessageOptions {
  /**
   * 消息显示位置
   */
  position?: 'top' | 'middle' | 'bottom'
  /**
   * 是否为国际化键
   */
  isKey?: boolean
  /**
   * 国际化参数
   */
  params?: MessageParam
  /**
   * 消息键
   */
  messageKey?: string
}

export interface MessageParam {
  [key: string]: string
}

export type ConfirmButtonHandler = {
  role: string
  data: any
}

export type ConfirmListener = (handler: ConfirmButtonHandler) => Promise<boolean> | boolean


export interface FormatOptions {
  /**
   * 时间展示格式的表达式
   */
  format?: string;
  /**
   * 自定义时区信息
   */
  timezone?: string;
  /**
   * Local ID
   */
  locale?: string;
}

/**
 * 请求头固定参数
 */
export const Headers = {

  /**
   * 时间格式化模式
   */
  X_TIME_FORMAT_PATTERN: 'x-rd-request-time-format-pattern',

  /**
   * 货币格式化模式
   */
  X_CURRENCY_FORMAT_PATTERN: 'x-rd-request-currency-format-pattern',

  /**
   * 请求头中的原始uri
   */
  X_REQUEST_ORIGIN_URI: 'x-rd-request-origin-uri',

  /**
   * 请求头中的token
   */
  X_ACCESS_TOKEN: 'x-rd-request-apitoken',

  /**
   * 租户header
   */
  X_TENANT_CODE_TOKEN: 'x-rd-request-tenantcode',

  /**
   * 店铺header
   */
  X_RD_REQUEST_SHOP_CODE: 'x-rd-request-shopcode',

  /**
   * 语言
   */
  X_RD_REQUEST_LANGUAGE: 'x-rd-request-language',

  /**
   * 时区
   */
  X_RD_REQUEST_TIMEZONE: 'x-rd-request-timezone',

  /**
   * 请求头中的额外信息
   */
  X_RD_REQUEST_EXTRA: 'x-rd-request-extra',

  /**
   * IP地址
   */
  X_RD_REQUEST_FLAG: 'x-rd-request-flag',

  /**
   * 请求头中的SSO令牌
   */
  X_RD_REQUEST_SSO: 'x-rd-request-sso'
};

/**
 * 菜单项
 */
export interface MenuItem {
  /** 菜单ID */
  id: string;
  /**
   * 选项名称
   */
  name: string;
  /**
   * 列表的Icon
   */
  icon?: string;
  /**
   * Icon的颜色
   */
  iconColor?: string;
  /**
   * 列表项触发的事件名称
   */
  eventName?: EventNameEnum;
  /** 是否启用 */
  available?: boolean;
}
