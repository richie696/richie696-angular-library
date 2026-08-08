import {InjectionToken} from '@angular/core'
import {IonicPromptConfig} from './types'

export const DEFAULT_IONIC_PROMPT_CONFIG: IonicPromptConfig = {
  toastDuration: 2500,
  toastPosition: 'bottom',
  confirmOkI18nKey: 'app.common.confirm',
  confirmCancelI18nKey: 'app.common.cancel',
  confirmTitleI18nKey: 'app.common.confirmation'
}

export const IONIC_PROMPT_CONFIG = new InjectionToken<IonicPromptConfig>(
  'IONIC_PROMPT_CONFIG',
  {
    providedIn: 'root',
    factory: () => DEFAULT_IONIC_PROMPT_CONFIG
  }
)
