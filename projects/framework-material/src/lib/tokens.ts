import {InjectionToken} from '@angular/core'
import {MaterialPromptConfig} from './types'

export const DEFAULT_MATERIAL_PROMPT_CONFIG: MaterialPromptConfig = {
  snackDuration: 2500,
  snackConfirmDuration: 6000,
  snackHorizontalPosition: 'center',
  snackVerticalPosition: 'top',
  confirmOkI18nKey: 'app.common.confirm'
}

export const MATERIAL_PROMPT_CONFIG = new InjectionToken<MaterialPromptConfig>(
  'MATERIAL_PROMPT_CONFIG',
  {
    providedIn: 'root',
    factory: () => DEFAULT_MATERIAL_PROMPT_CONFIG
  }
)
