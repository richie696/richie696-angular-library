import {inject, Injectable} from '@angular/core'
import {ConfirmationService, MessageService} from 'primeng/api'
import {TranslateService} from '@ngx-translate/core'
import {
  ConfirmButtonHandler,
  ConfirmListener,
  MessageOptions,
  MessageParam
} from '@richie696/angular-framework'
import {PRIMENG_PROMPT_CONFIG} from './tokens'

@Injectable({ providedIn: 'root' })
export class PrimeNgPromptAdapter {
  private readonly messageService = inject(MessageService)
  private readonly confirmationService = inject(ConfirmationService)
  private readonly translate = inject(TranslateService)
  private readonly config = inject(PRIMENG_PROMPT_CONFIG)

  async info(message: string, options?: MessageOptions): Promise<void> {
    this.pushMessage('info', this.resolveMessage(message, options))
  }

  async error(message: string, options?: MessageOptions): Promise<void> {
    this.pushMessage('error', this.resolveMessage(message, options))
  }

  async warn(message: string, options?: MessageOptions): Promise<void> {
    this.pushMessage('warn', this.resolveMessage(message, options))
  }

  async success(message: string, options?: MessageOptions): Promise<void> {
    this.pushMessage('success', this.resolveMessage(message, options))
  }

  async confirm(
    messageId: string,
    messageParams?: MessageParam,
    confirmListener?: ConfirmListener
  ): Promise<void> {
    await new Promise<void>((resolve) => {
      this.confirmationService.confirm({
        header: this.translate.instant(this.config.confirmTitleI18nKey) || 'Confirmation',
        message: this.translate.instant(messageId, messageParams ?? {}),
        acceptLabel: this.translate.instant(this.config.confirmOkI18nKey) || 'Confirm',
        rejectLabel: this.translate.instant(this.config.confirmCancelI18nKey) || 'Cancel',
        accept: async () => {
          if (confirmListener) {
            const handler: ConfirmButtonHandler = { role: 'confirm', data: null }
            await confirmListener(handler)
          }
          resolve()
        },
        reject: () => resolve()
      })
    })
  }

  private resolveMessage(message: string, options?: MessageOptions): string {
    const messageKey = options?.messageKey || message
    if (options?.isKey || options?.messageKey) {
      return this.translate.instant(messageKey, options?.params ?? {})
    }
    return message
  }

  private pushMessage(severity: 'info' | 'error' | 'warn' | 'success', detail: string): void {
    this.messageService.add({
      severity,
      detail,
      life: this.config.messageLife
    })
  }
}
