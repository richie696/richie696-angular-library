import {Provider} from '@angular/core'
import {ConfirmationService, MessageService} from 'primeng/api'
import {PrimeNgPromptConfig} from './types'
import {DEFAULT_PRIMENG_PROMPT_CONFIG, PRIMENG_PROMPT_CONFIG} from './tokens'

export function providePrimeNgPrompt(config?: Partial<PrimeNgPromptConfig>): Provider[] {
  return [
    MessageService,
    ConfirmationService,
    {
      provide: PRIMENG_PROMPT_CONFIG,
      useValue: { ...DEFAULT_PRIMENG_PROMPT_CONFIG, ...(config ?? {}) }
    }
  ]
}
