import {MATERIAL_PROMPT_CONFIG} from './tokens'
import {provideMaterialPrompt} from './providers'

describe('provideMaterialPrompt', () => {
  it('merges defaults with host configuration', () => {
    const provider = provideMaterialPrompt({snackDuration: 4200})[0] as {provide: unknown; useValue: {snackDuration: number; snackVerticalPosition: string}}

    expect(provider.provide).toBe(MATERIAL_PROMPT_CONFIG)
    expect(provider.useValue.snackDuration).toBe(4200)
    expect(provider.useValue.snackVerticalPosition).toBe('top')
  })
})
