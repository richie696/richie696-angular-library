import {Injectable} from '@angular/core'
import {TestBed} from '@angular/core/testing'
import {Method} from '../public-api'
import {AppError} from './errors/app-error'
import {AbstractService} from './abstract.service'
import {Url} from './url'

@Injectable()
class TestGatewayService extends AbstractService {
  constructor() {
    super({
      baseUrl: 'https://gateway.example.test',
      showLoading: false,
      enableHeaderAutoManagement: false,
      sendHardwareFingerprint: false,
      timeout: 1000
    })
  }
}

@Injectable()
class HeaderGatewayService extends AbstractService {
  constructor() {
    super({
      baseUrl: 'https://gateway.example.test',
      showLoading: false,
      enableHeaderAutoManagement: true,
      managedResponseHeaders: ['x-safe-header', 'authorization'],
      persistManagedHeaders: true,
      sendHardwareFingerprint: false
    })
  }
}

describe('AbstractService Gateway contract', () => {
  let service: TestGatewayService

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [TestGatewayService, HeaderGatewayService]})
    service = TestBed.inject(TestGatewayService)
  })

  afterEach(() => {
    Url.dynamicUrl = ''
    localStorage.removeItem('http_headers')
    service.cleanup()
  })

  it('resolves relative Url values against the configured gateway', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').and.resolveTo(
      new Response(JSON.stringify({success: true, code: '200', msg: 'ok', data: {id: 1}, timestamp: 1}), {
        status: 200,
        headers: {'content-type': 'application/json'}
      })
    )

    const result = await service.request<{id: number}>(new Url('user', '/api/users/1', Method.GET))

    expect(result.data).toEqual({id: 1})
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://gateway.example.test/api/users/1',
      jasmine.objectContaining({method: 'GET'})
    )
  })

  it('rejects unauthorized responses with a typed AppError', async () => {
    spyOn(globalThis, 'fetch').and.resolveTo(new Response(JSON.stringify({code: 'AUTH_REQUIRED'}), {status: 401}))

    let thrown: unknown
    try {
      await service.request(new Url('user', '/api/users/1', Method.GET))
    } catch (error) {
      thrown = error
    }

    expect(thrown).toEqual(jasmine.any(AppError))
    expect((thrown as AppError).kind).toBe('unauthorized')
    expect((thrown as AppError).status).toBe(401)
  })

  it('only persists and replays the configured non-sensitive response headers', async () => {
    const headerService = TestBed.inject(HeaderGatewayService)
    const fetchSpy = spyOn(globalThis, 'fetch').and.returnValues(
      Promise.resolve(new Response(JSON.stringify({success: true, code: '200', msg: 'ok', data: null, timestamp: 1}), {
        status: 200,
        headers: {'content-type': 'application/json', 'x-safe-header': 'safe', authorization: 'secret'}
      })),
      Promise.resolve(new Response(JSON.stringify({success: true, code: '200', msg: 'ok', data: null, timestamp: 1}), {
        status: 200,
        headers: {'content-type': 'application/json'}
      }))
    )

    await headerService.request(new Url('first', '/api/first', Method.GET))
    await headerService.request(new Url('second', '/api/second', Method.GET))

    const secondHeaders = (fetchSpy.calls.mostRecent().args[1] as RequestInit).headers as Record<string, string>
    expect(secondHeaders['x-safe-header']).toBe('safe')
    expect(Object.keys(secondHeaders).some((key) => key.toLowerCase() === 'authorization')).toBeFalse()
    headerService.cleanup()
  })
})
