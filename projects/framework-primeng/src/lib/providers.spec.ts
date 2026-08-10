import {ConfirmationService, MessageService} from 'primeng/api'
import {PRIMENG_PROMPT_CONFIG} from './tokens'
import {providePrimeNgPrompt} from './providers'

describe('providePrimeNgPrompt', () => {
  it('provides PrimeNG services and merges host configuration', () => {
    const providers = providePrimeNgPrompt({messageLife: 5000})
    const configProvider = providers.find((provider) =>
      typeof provider === 'object' && provider !== null && 'provide' in provider && provider.provide === PRIMENG_PROMPT_CONFIG
    ) as {useValue: {messageLife: number}} | undefined

    expect(providers).toContain(MessageService)
    expect(providers).toContain(ConfirmationService)
    expect(configProvider?.useValue.messageLife).toBe(5000)
  })
})
