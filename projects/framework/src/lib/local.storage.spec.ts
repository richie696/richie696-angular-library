import {LocalStorage} from './local.storage'

describe('LocalStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('isolates namespaced keys and waits for writes', async () => {
    await LocalStorage.setItem('token', 'tenant-a', 'tenant-a')
    await LocalStorage.setItem('token', 'tenant-b', 'tenant-b')

    expect(await LocalStorage.getItem<string>('token', 'tenant-a')).toBe('tenant-a')
    expect(await LocalStorage.getItem<string>('token', 'tenant-b')).toBe('tenant-b')
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('clears only the requested namespace', async () => {
    await LocalStorage.setItem('one', 1, 'a')
    await LocalStorage.setItem('two', 2, 'b')

    await LocalStorage.clear('a')

    expect(await LocalStorage.isExist('one', 'a')).toBeFalse()
    expect(await LocalStorage.isExist('two', 'b')).toBeTrue()
  })
})
