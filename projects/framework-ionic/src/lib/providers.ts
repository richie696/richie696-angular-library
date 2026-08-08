import {Provider} from '@angular/core'
import {IonicPromptConfig} from './types'
import {DEFAULT_IONIC_PROMPT_CONFIG, IONIC_PROMPT_CONFIG} from './tokens'

export function provideIonicPrompt(config?: Partial<IonicPromptConfig>): Provider[] {
  return [
    {
      provide: IONIC_PROMPT_CONFIG,
      useValue: { ...DEFAULT_IONIC_PROMPT_CONFIG, ...(config ?? {}) }
    }
  ]
}
