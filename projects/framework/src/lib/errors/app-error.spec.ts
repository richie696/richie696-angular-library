import {AppError} from './app-error'

describe('AppError', () => {
  it('serializes protocol metadata without embedding a Response object', () => {
    const error = new AppError('rate-limited', 'Too many requests', {
      status: 429,
      code: 'RATE_LIMITED',
      traceId: 'trace-1',
      retryAfterMs: 1000,
      responseBody: {code: 'RATE_LIMITED'}
    })

    expect(error.toJSON()).toEqual(jasmine.objectContaining({
      kind: 'rate-limited',
      status: 429,
      code: 'RATE_LIMITED',
      traceId: 'trace-1',
      retryAfterMs: 1000
    }))
  })
})
