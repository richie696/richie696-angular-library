import {Method} from '../public-api'
import {Url} from './url'

describe('Url', () => {
  afterEach(() => {
    Url.dynamicUrl = ''
  })

  it('builds an HTTP URL with the dynamic gateway prefix', () => {
    Url.dynamicUrl = 'https://gateway.example.test'
    const url = new Url('users', '/api/users', Method.GET)

    expect(url.value()).toBe('https://gateway.example.test/api/users')
  })

  it('replaces GET path placeholders in order', () => {
    Url.dynamicUrl = 'https://gateway.example.test/'
    const url = new Url('user', '/api/users/{}/sessions/{}', Method.GET)

    expect(url.value(['u-1', 's-2'])).toBe('https://gateway.example.test//api/users/u-1/sessions/s-2')
  })

  it('does not prefix local navigation URLs', () => {
    Url.dynamicUrl = 'https://gateway.example.test'
    const url = new Url('login', '/login', Method.LOCATION)

    expect(url.value()).toBe('/login')
  })

  it('treats PATCH as an HTTP method', () => {
    Url.dynamicUrl = 'https://gateway.example.test'
    const url = new Url('patch', '/api/users/1', Method.PATCH)

    expect(url.value()).toBe('https://gateway.example.test/api/users/1')
  })

  it('keeps encryption and duplicate flags from both constructor forms', () => {
    const legacy = new Url('legacy', '/legacy', Method.POST, true, true)
    const options = new Url('options', '/options', Method.POST, {
      needEncryption: true,
      needDuplicateCheck: true,
      skipManagedHeaders: true
    })

    expect(legacy.needEncryption).toBeTrue()
    expect(legacy.needDuplicateCheck).toBeTrue()
    expect(options.needEncryption).toBeTrue()
    expect(options.needDuplicateCheck).toBeTrue()
    expect(options.skipManagedHeaders).toBeTrue()
  })
})
