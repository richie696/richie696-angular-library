import {DuplicateSubmitModule} from './duplicate-submit.module'

describe('DuplicateSubmitModule', () => {
  it('canonicalizes equivalent object bodies before generating an id', () => {
    const module = new DuplicateSubmitModule(3000)

    const first = module.generateRequestId('/api/users', 'POST', {a: 1, b: 2}, 'u-1')
    const second = module.generateRequestId('/api/users', 'POST', {b: 2, a: 1}, 'u-1')

    expect(second).toBe(first)
  })

  it('isolates request ids by user and method', () => {
    const module = new DuplicateSubmitModule(3000)
    const post = module.generateRequestId('/api/users', 'POST', {id: 1}, 'u-1')
    const get = module.generateRequestId('/api/users', 'GET', {id: 1}, 'u-1')
    const otherUser = module.generateRequestId('/api/users', 'POST', {id: 1}, 'u-2')

    expect(get).not.toBe(post)
    expect(otherUser).not.toBe(post)
  })

  it('recognizes an in-window request and clears it after completion', () => {
    const module = new DuplicateSubmitModule(3000)
    const id = module.generateRequestId('/api/users', 'POST', {id: 1}, null)

    module.recordRequest(id, '/api/users')
    expect(module.isDuplicateRequest(id)).toBeTrue()

    module.clearRequest(id)
    expect(module.isDuplicateRequest(id)).toBeFalse()
  })
})
