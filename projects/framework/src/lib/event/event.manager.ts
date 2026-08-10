import {Injectable} from '@angular/core'
import {Subject, Subscription} from 'rxjs'
import {EventNameEnum} from './event.name'

@Injectable({
  providedIn: 'root'
})
export class EventManager {
  private _eventMap: Map<EventNameEnum, Subject<unknown>> = new Map<EventNameEnum, Subject<unknown>>()
  private _subscriptionMap: Map<string, Subscription> = new Map<string, Subscription>()

  constructor() {
    // 预注册库内定义的 EventNameEnum 实例；子类（如应用扩展的 AppEventName）的实例在 subscribe/publish 时按需注册
    EventNameEnum.values<EventNameEnum>().forEach((obj: EventNameEnum) => {
      this._eventMap.set(obj, new Subject<unknown>())
    })
  }

  /**
   * 确保事件在 _eventMap 中有对应的 emitter，若不存在则按需创建（支持子类扩展的事件名枚举）
   */
  private ensureEmitter(eventName: EventNameEnum): Subject<unknown> {
    let emitter = this._eventMap.get(eventName)
    if (!emitter) {
      emitter = new Subject<unknown>()
      this._eventMap.set(eventName, emitter)
    }
    return emitter
  }

  /**
   * 发布事件
   * @param eventName 事件名称
   * @param body 事件数据
   */
  publish<T = unknown>(eventName: EventNameEnum, body?: T): void {
    const emitter = this.ensureEmitter(eventName)
    emitter.next(body)
  }

  /**
   * 订阅事件
   * @param eventName 事件名称
   * @param callback 事件回调函数
   * @returns 订阅ID，用于取消订阅
   */
  subscribe<T = unknown>(eventName: EventNameEnum, callback: (event: T) => void): string {
    const emitter = this.ensureEmitter(eventName)

    const subscription = emitter.subscribe((event) => callback(event as T))
    const subscriptionId = this.generateSubscriptionId()

    // 内部维护订阅关系
    this._subscriptionMap.set(subscriptionId, subscription)

    // 当订阅被取消时，从内部映射中移除
    subscription.add(() => {
      this._subscriptionMap.delete(subscriptionId)
    })

    return subscriptionId
  }

  /**
   * 取消订阅
   * @param subscriptionId 订阅ID
   */
  unsubscribe(subscriptionId: string|Set<string>): void {
    if (typeof subscriptionId === 'string') {
      const subscription = this._subscriptionMap.get(subscriptionId)
      if (subscription) {
        subscription.unsubscribe()
        this._subscriptionMap.delete(subscriptionId)
      }
      return
    }
    subscriptionId.forEach((id) => {
      const subscription = this._subscriptionMap.get(id)
      if (subscription) {
        subscription.unsubscribe()
        this._subscriptionMap.delete(id)
      }
    })
  }


  /**
   * 取消所有订阅
   */
  unsubscribeAll(): void {
    this._subscriptionMap.forEach((subscription) => {
      subscription.unsubscribe()
    })
    this._subscriptionMap.clear()
  }

  /**
   * 检查事件是否有订阅者
   * @param eventName 事件名称
   * @returns 是否有订阅者
   */
  hasObservers(eventName: EventNameEnum): boolean {
    const emitter = this._eventMap.get(eventName)
    return emitter != null ? emitter.observed : false
  }

  /**
   * 检查订阅是否仍然有效
   * @param subscriptionId 订阅ID
   * @returns 订阅是否有效
   */
  isSubscribed(subscriptionId: string): boolean {
    const subscription = this._subscriptionMap.get(subscriptionId)
    return subscription ? !subscription.closed : false
  }

  /**
   * 生成订阅ID
   * @returns 唯一的订阅ID
   */
  private generateSubscriptionId(): string {
    const id = typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).slice(2, 11)
    return `sub_${Date.now()}_${id}`
  }
}
