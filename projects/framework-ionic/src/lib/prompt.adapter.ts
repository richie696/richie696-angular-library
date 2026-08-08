import {inject, Injectable} from '@angular/core'
import {AlertController, ToastController} from '@ionic/angular'
import {TranslateService} from '@ngx-translate/core'
import {
  ConfirmButtonHandler,
  ConfirmListener,
  MessageOptions,
  MessageParam
} from '@richie696/angular-framework'
import {IONIC_PROMPT_CONFIG} from './tokens'

@Injectable({ providedIn: 'root' })
export class IonicPromptAdapter {
  private readonly toastController = inject(ToastController)
  private readonly alertController = inject(AlertController)
  private readonly translate = inject(TranslateService)
  private readonly config = inject(IONIC_PROMPT_CONFIG)

  async info(message: string, options?: MessageOptions): Promise<void> {
    await this.presentToast(this.resolveMessage(message, options), 'primary', options)
  }

  async error(message: string, options?: MessageOptions): Promise<void> {
    await this.presentToast(this.resolveMessage(message, options), 'danger', options)
  }

  async warn(message: string, options?: MessageOptions): Promise<void> {
    await this.presentToast(this.resolveMessage(message, options), 'warning', options)
  }

  async success(message: string, options?: MessageOptions): Promise<void> {
    await this.presentToast(this.resolveMessage(message, options), 'success', options)
  }

  async confirm(
    messageId: string,
    messageParams?: MessageParam,
    confirmListener?: ConfirmListener
  ): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant(this.config.confirmTitleI18nKey) || 'Confirmation',
      message: this.translate.instant(messageId, messageParams ?? {}),
      buttons: [
        {
          text: this.translate.instant(this.config.confirmCancelI18nKey) || 'Cancel',
          role: 'cancel'
        },
        {
          text: this.translate.instant(this.config.confirmOkI18nKey) || 'Confirm',
          role: 'confirm',
          handler: async (data) => {
            if (!confirmListener) return true
            const payload: ConfirmButtonHandler = { role: 'confirm', data }
            return await Promise.resolve(confirmListener(payload))
          }
        }
      ]
    })
    await alert.present()
    await alert.onDidDismiss()
  }

  private resolveMessage(message: string, options?: MessageOptions): string {
    const messageKey = options?.messageKey || message
    if (options?.isKey || options?.messageKey) {
      return this.translate.instant(messageKey, options?.params ?? {})
    }
    return message
  }

  private async presentToast(
    message: string,
    color: 'primary' | 'danger' | 'warning' | 'success',
    options?: MessageOptions
  ): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: this.config.toastDuration,
      color,
      position: options?.position ?? this.config.toastPosition
    })
    await toast.present()
    await toast.onDidDismiss()
  }
}
