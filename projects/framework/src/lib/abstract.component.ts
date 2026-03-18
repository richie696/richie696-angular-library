import { AbstractPrompt } from './abstract.prompt'
import { ActivatedRoute, NavigationBehaviorOptions, Router } from '@angular/router'
import { inject } from '@angular/core'
import { Url } from './url'
import {ConfirmListener, MessageOptions, MessageParam, Method} from '../public-api'
import {TranslateService} from "@ngx-translate/core";

export abstract class AbstractComponent implements AbstractPrompt {
  protected router: Router
  protected route: ActivatedRoute
  protected translate: TranslateService

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
    if (url.method !== Method.NAVIGATOR) {
      return false
    }
    return await this.router.navigateByUrl(url.value(), extras)
  }

  protected async navigateTo(url: Url, params: Array<string | number>, extras?: NavigationBehaviorOptions): Promise<boolean> {
    if (url.method !== Method.NAVIGATOR) {
      return false
    }
    return await this.router.navigate([url.value(), ...params], extras)
  }


  abstract info(message: string, options?: MessageOptions): Promise<void>

  abstract error(message: string, options?: MessageOptions): Promise<void>

  abstract warn(message: string, options?: MessageOptions): Promise<void>

  abstract success(message: string, options?: MessageOptions): Promise<void>

  abstract confirm(messageId: string, messageParams?: MessageParam, confirmListener?: ConfirmListener): Promise<void>

}
