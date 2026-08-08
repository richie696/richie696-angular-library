import {ConfirmListener, MessageOptions, MessageParam} from "../public-api";

/**
 * 统一提示能力抽象接口。
 * 由具体宿主（Web、Capacitor、业务 UI 框架）实现消息展示细节。
 */
export interface AbstractPrompt {

  /**
   * 展示普通提示信息。
   * @param message 提示文案
   * @param options 展示配置
   */
  info(message: string, options?: MessageOptions): Promise<void>

  /**
   * 展示错误信息。
   * @param message 错误文案
   * @param options 展示配置
   */
  error(message: string, options?: MessageOptions): Promise<void>

  /**
   * 展示警告信息。
   * @param message 警告文案
   * @param options 展示配置
   */
  warn(message: string, options?: MessageOptions): Promise<void>

  /**
   * 展示成功信息。
   * @param message 成功文案
   * @param options 展示配置
   */
  success(message: string, options?: MessageOptions): Promise<void>

  /**
   * 展示确认框并在确认后回调。
   * @param messageId 国际化文案 ID
   * @param messageParams 国际化插值参数
   * @param confirmListener 用户确认后的回调
   */
  confirm(messageId: string, messageParams?: MessageParam, confirmListener?: ConfirmListener): Promise<void>

}
