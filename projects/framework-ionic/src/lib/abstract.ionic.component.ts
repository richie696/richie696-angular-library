import {inject} from '@angular/core'
import {
  AbstractComponent,
  ConfirmListener,
  MessageOptions,
  MessageParam
} from '@richie696/angular-framework'
import {IonicPromptAdapter} from './prompt.adapter'

/**
 * Ionic UI 默认提示实现基类。
 *
 * 业务项目可直接继承该基类，以获得 `AbstractPrompt` 的默认实现。
 */
export abstract class AbstractIonicComponent extends AbstractComponent {
  private readonly promptAdapter = inject(IonicPromptAdapter)

  /**
   * 展示普通提示信息。
   */
  async info(message: string, options?: MessageOptions): Promise<void> {
    await this.promptAdapter.info(message, options)
  }

  /**
   * 展示错误提示信息。
   */
  async error(message: string, options?: MessageOptions): Promise<void> {
    await this.promptAdapter.error(message, options)
  }

  /**
   * 展示警告提示信息。
   */
  async warn(message: string, options?: MessageOptions): Promise<void> {
    await this.promptAdapter.warn(message, options)
  }

  /**
   * 展示成功提示信息。
   */
  async success(message: string, options?: MessageOptions): Promise<void> {
    await this.promptAdapter.success(message, options)
  }

  /**
   * 展示确认对话框并回调处理确认事件。
   */
  async confirm(
    messageId: string,
    messageParams?: MessageParam,
    confirmListener?: ConfirmListener
  ): Promise<void> {
    await this.promptAdapter.confirm(messageId, messageParams, confirmListener)
  }
}
