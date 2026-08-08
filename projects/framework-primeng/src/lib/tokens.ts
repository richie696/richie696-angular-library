import {InjectionToken} from '@angular/core'
import {PrimeNgPromptConfig} from './types'

export const DEFAULT_PRIMENG_PROMPT_CONFIG: PrimeNgPromptConfig = {
  messageLife: 2500,
  confirmOkI18nKey: 'app.common.confirm',
  confirmCancelI18nKey: 'app.common.cancel',
  confirmTitleI18nKey: 'app.common.confirmation'
}

export const PRIMENG_PROMPT_CONFIG = new InjectionToken<PrimeNgPromptConfig>(
  'PRIMENG_PROMPT_CONFIG',
  {
    providedIn: 'root',
    factory: () => DEFAULT_PRIMENG_PROMPT_CONFIG
  }
)
