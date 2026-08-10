import {clearDeviceId, getOrCreateDeviceId} from './device-id'

describe('device id', () => {
  beforeEach(() => {
    clearDeviceId()
  })

  afterEach(() => {
    clearDeviceId()
  })

  it('creates a stable random identifier without fingerprint data', async () => {
    const first = await getOrCreateDeviceId()
    const second = await getOrCreateDeviceId()

    expect(first).toBe(second)
    expect(first.length).toBeGreaterThan(20)
    expect(first).not.toContain('|')
  })
})
