import { AbstractPrompt } from './abstract.prompt'
import { ActivatedRoute, NavigationBehaviorOptions, Router } from '@angular/router'
import { inject } from '@angular/core'
import { Url } from './url'
import {ConfirmListener, MessageOptions, MessageParam, Method} from '../public-api'
import {TranslateService} from "@ngx-translate/core";

/**
 * 组件基类：封装路由读取、页面跳转与统一提示能力约束。
 */
export abstract class AbstractComponent implements AbstractPrompt {
  protected router: Router
  protected route: ActivatedRoute
  protected translate: TranslateService

  /**
   * 初始化通用依赖注入对象。
   */
  protected constructor() {
    this.router = inject(Router)
    this.route = inject(ActivatedRoute)
    this.translate = inject(TranslateService)
  }

  /**
   * 获取路由参数（/page/:id）
   * @param key 参数键
   * @protected
   * @return {string} 返回路由参数值(如果不存在则返回空字符串)
   */
  protected getParam(key: string): string {
    return this.route.snapshot.paramMap.get(key) || ''
  }

  /**
   * 获取查询参数(/page?key=value)
   * @param key 参数键
   * @protected
   * @return {string} 返回查询参数值(如果不存在则返回空字符串)
   */
  protected getQueryParam(key: string): string {
    return this.route.snapshot.queryParamMap.get(key) || ''
  }

  /**
   * 页面路由跳转
   * @param url 路由地址
   * @param extras 路由行为配置
   * @protected
   */
  protected async navigateByUrl(url: Url, extras?: NavigationBehaviorOptions): Promise<boolean> {
    // 仅允许 NAVIGATOR 类型 URL 进入路由跳转
    if (url.method !== Method.NAVIGATOR) {
      return false
    }
    return await this.router.navigateByUrl(url.value(), extras)
  }

  /**
   * 按路径片段方式跳转（支持附加路径参数）。
   * @param url 路由地址枚举
   * @param params 路径参数列表
   * @param extras 路由行为配置
   */
  protected async navigateTo(url: Url, params: Array<string | number>, extras?: NavigationBehaviorOptions): Promise<boolean> {
    // 仅允许 NAVIGATOR 类型 URL 进入路由跳转
    if (url.method !== Method.NAVIGATOR) {
      return false
    }
    return await this.router.navigate([url.value(), ...params], extras)
  }

  /** 展示提示信息。 */
  abstract info(message: string, options?: MessageOptions): Promise<void>

  /** 展示错误信息。 */
  abstract error(message: string, options?: MessageOptions): Promise<void>

  /** 展示警告信息。 */
  abstract warn(message: string, options?: MessageOptions): Promise<void>

  /** 展示成功信息。 */
  abstract success(message: string, options?: MessageOptions): Promise<void>

  /** 展示确认弹窗。 */
  abstract confirm(messageId: string, messageParams?: MessageParam, confirmListener?: ConfirmListener): Promise<void>

}
