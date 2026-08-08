import {inject} from '@angular/core'
import {
  AbstractComponent,
  ConfirmListener,
  MessageOptions,
  MessageParam
} from '@richie696/angular-framework'
import {PrimeNgPromptAdapter} from './prompt.adapter'

/**
 * PrimeNG UI 默认提示实现基类。
 *
 * 业务项目可直接继承该基类，以获得 `AbstractPrompt` 的默认实现。
 */
export abstract class AbstractPrimeNGComponent extends AbstractComponent {
  private readonly promptAdapter = inject(PrimeNgPromptAdapter)

  async info(message: string, options?: MessageOptions): Promise<void> {
    await this.promptAdapter.info(message, options)
  }

  async error(message: string, options?: MessageOptions): Promise<void> {
    await this.promptAdapter.error(message, options)
  }

  async warn(message: string, options?: MessageOptions): Promise<void> {
    await this.promptAdapter.warn(message, options)
  }

  async success(message: string, options?: MessageOptions): Promise<void> {
    await this.promptAdapter.success(message, options)
  }

  async confirm(
    messageId: string,
    messageParams?: MessageParam,
    confirmListener?: ConfirmListener
  ): Promise<void> {
    await this.promptAdapter.confirm(messageId, messageParams, confirmListener)
  }
}
