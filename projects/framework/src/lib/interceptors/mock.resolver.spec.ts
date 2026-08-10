import {DEFAULT_MOCK_DATA_DIR, resolveMockAssetUrl} from './mock.resolver'

describe('resolveMockAssetUrl', () => {
  it('returns null when mock mode is disabled', () => {
    expect(resolveMockAssetUrl('/api/users', {enable: false, apiPrefix: '/api'})).toBeNull()
  })

  it('maps API paths to the configured static asset directory', () => {
    expect(
      resolveMockAssetUrl('/api/users/123', {
        enable: true,
        apiPrefix: '/api',
        mockDataDir: '/assets/fixtures'
      })
    ).toBe('/assets/fixtures/users/123.json')
  })

  it('does not remap an existing JSON asset', () => {
    expect(
      resolveMockAssetUrl('/assets/mock-data/users.json', {
        enable: true,
        apiPrefix: '/api',
        mockDataDir: DEFAULT_MOCK_DATA_DIR
      })
    ).toBeNull()
  })
})
