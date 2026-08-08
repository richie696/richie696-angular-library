import {Provider} from '@angular/core'
import {MaterialPromptConfig} from './types'
import {DEFAULT_MATERIAL_PROMPT_CONFIG, MATERIAL_PROMPT_CONFIG} from './tokens'

export function provideMaterialPrompt(config?: Partial<MaterialPromptConfig>): Provider[] {
  return [
    {
      provide: MATERIAL_PROMPT_CONFIG,
      useValue: { ...DEFAULT_MATERIAL_PROMPT_CONFIG, ...(config ?? {}) }
    }
  ]
}
