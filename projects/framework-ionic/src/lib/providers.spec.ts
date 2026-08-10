import {IONIC_PROMPT_CONFIG} from './tokens'
import {provideIonicPrompt} from './providers'

describe('provideIonicPrompt', () => {
  it('merges defaults with host configuration', () => {
    const provider = provideIonicPrompt({toastDuration: 4000})[0] as {provide: unknown; useValue: {toastDuration: number; toastPosition: string}}

    expect(provider.provide).toBe(IONIC_PROMPT_CONFIG)
    expect(provider.useValue.toastDuration).toBe(4000)
    expect(provider.useValue.toastPosition).toBe('bottom')
  })
})
