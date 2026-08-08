import {inject, Injectable} from '@angular/core'
import {MatSnackBar} from '@angular/material/snack-bar'
import {TranslateService} from '@ngx-translate/core'
import {firstValueFrom} from 'rxjs'
import {
  ConfirmButtonHandler,
  ConfirmListener,
  MessageOptions,
  MessageParam
} from '@richie696/angular-framework'
import {MATERIAL_PROMPT_CONFIG} from './tokens'

@Injectable({ providedIn: 'root' })
export class MaterialPromptAdapter {
  private readonly snackBar = inject(MatSnackBar)
  private readonly translate = inject(TranslateService)
  private readonly config = inject(MATERIAL_PROMPT_CONFIG)

  async info(message: string, options?: MessageOptions): Promise<void> {
    await this.showSnack(this.resolveMessage(message, options), ['rd-info-snackbar'])
  }

  async error(message: string, options?: MessageOptions): Promise<void> {
    await this.showSnack(this.resolveMessage(message, options), ['rd-error-snackbar'])
  }

  async warn(message: string, options?: MessageOptions): Promise<void> {
    await this.showSnack(this.resolveMessage(message, options), ['rd-warn-snackbar'])
  }

  async success(message: string, options?: MessageOptions): Promise<void> {
    await this.showSnack(this.resolveMessage(message, options), ['rd-success-snackbar'])
  }

  async confirm(
    messageId: string,
    messageParams?: MessageParam,
    confirmListener?: ConfirmListener
  ): Promise<void> {
    const confirmText = this.translate.instant(this.config.confirmOkI18nKey) || 'Confirm'
    const ref = this.snackBar.open(
      this.translate.instant(messageId, messageParams ?? {}),
      confirmText,
      {
        duration: this.config.snackConfirmDuration,
        horizontalPosition: this.config.snackHorizontalPosition,
        verticalPosition: this.config.snackVerticalPosition,
        panelClass: ['rd-confirm-snackbar']
      }
    )
    let handler: ConfirmButtonHandler = { role: 'cancel', data: null }
    const actionSub = ref.onAction().subscribe(() => {
      handler = { role: 'confirm', data: null }
    })
    await firstValueFrom(ref.afterDismissed())
    actionSub.unsubscribe()
    if (handler.role === 'confirm' && confirmListener) {
      await Promise.resolve(confirmListener(handler))
    }
  }

  private resolveMessage(message: string, options?: MessageOptions): string {
    const messageKey = options?.messageKey || message
    if (options?.isKey || options?.messageKey) {
      return this.translate.instant(messageKey, options?.params ?? {})
    }
    return message
  }

  private async showSnack(message: string, panelClass: string[]): Promise<void> {
    const ref = this.snackBar.open(message, undefined, {
      duration: this.config.snackDuration,
      horizontalPosition: this.config.snackHorizontalPosition,
      verticalPosition: this.config.snackVerticalPosition,
      panelClass
    })
    await firstValueFrom(ref.afterDismissed())
  }
}
