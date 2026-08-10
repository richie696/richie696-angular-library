import {provideMock} from './mock.data'
import {MOCK_DATA_TOKEN} from './mock.data'

describe('provideMock', () => {
  it('is disabled unless the application explicitly opts in', () => {
    const providers = provideMock()
    const configProvider = providers.find((provider) =>
      typeof provider === 'object' && provider !== null && 'provide' in provider && provider.provide === MOCK_DATA_TOKEN
    ) as {useValue: {enable: boolean}} | undefined

    expect(configProvider?.useValue.enable).toBeFalse()
  })
})
