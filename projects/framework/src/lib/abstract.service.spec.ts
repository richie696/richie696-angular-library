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

@Injectable()
class TokenHeaderGatewayService extends AbstractService {
  constructor() {
    super({
      baseUrl: 'https://gateway.example.test',
      showLoading: false,
      enableHeaderAutoManagement: true,
      managedResponseHeaders: ['x-rd-request-apitoken', 'authorization'],
      persistManagedHeaders: true,
      sendHardwareFingerprint: false
    })
  }
}

@Injectable()
class SecondaryTokenHeaderGatewayService extends AbstractService {
  constructor() {
    super({
      baseUrl: 'https://gateway.example.test',
      showLoading: false,
      enableHeaderAutoManagement: true,
      managedResponseHeaders: ['x-rd-request-apitoken'],
      persistManagedHeaders: true,
      sendHardwareFingerprint: false
    })
  }
}

describe('AbstractService Gateway contract', () => {
  let service: TestGatewayService

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [
      TestGatewayService,
      HeaderGatewayService,
      TokenHeaderGatewayService,
      SecondaryTokenHeaderGatewayService
    ]})
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

  it('sends encrypted requests as body-v1 without retaining the plaintext JSON body', async () => {
    const eccModule = (service as any).eccModule
    spyOn(eccModule, 'isInitialized').and.returnValue(true)
    eccModule.gatewayKeyId = 'gateway-key-1'
    spyOn(eccModule, 'encrypt').and.resolveTo('ciphertext-body')
    const fetchSpy = spyOn(globalThis, 'fetch').and.resolveTo(
      new Response(JSON.stringify({success: true, code: '200', msg: 'ok', data: null, timestamp: 1}), {
        status: 200,
        headers: {'content-type': 'application/json'}
      })
    )

    await service.request(
      new Url('secure-password-change', '/api/password', Method.POST, {needEncryption: true}),
      {password: 'plaintext-must-not-be-sent'}
    )

    const request = fetchSpy.calls.mostRecent().args[1] as RequestInit
    const headers = request.headers as Record<string, string>
    expect(headers['X-Encrypted-Data']).toBe('body-v1')
    expect(headers['Content-Type']).toBe('application/octet-stream')
    expect(request.body).toBe('ciphertext-body')
    expect(String(request.body)).not.toContain('plaintext-must-not-be-sent')
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

  it('persists and replays the explicitly configured Gateway access token header', async () => {
    const tokenService = TestBed.inject(TokenHeaderGatewayService)
    const fetchSpy = spyOn(globalThis, 'fetch').and.returnValues(
      Promise.resolve(new Response(JSON.stringify({success: true, code: '200', msg: 'ok', data: null, timestamp: 1}), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-rd-request-apitoken': 'gateway-token',
          authorization: 'must-not-be-cached'
        }
      })),
      Promise.resolve(new Response(JSON.stringify({success: true, code: '200', msg: 'ok', data: null, timestamp: 1}), {
        status: 200,
        headers: {'content-type': 'application/json'}
      }))
    )

    await tokenService.request(new Url('login', '/api/login', Method.POST), {username: 'admin'})
    expect(tokenService.getManagedHeader('x-rd-request-apitoken')).toBe('gateway-token')

    await tokenService.request(new Url('me', '/api/me', Method.GET))
    const secondHeaders = (fetchSpy.calls.mostRecent().args[1] as RequestInit).headers as Record<string, string>
    expect(secondHeaders['x-rd-request-apitoken']).toBe('gateway-token')
    expect(Object.keys(secondHeaders).some((key) => key.toLowerCase() === 'authorization')).toBeFalse()

    tokenService.clearManagedHeaders()
    expect(tokenService.getManagedHeader('x-rd-request-apitoken')).toBeNull()
    tokenService.cleanup()
  })

  it('does not attach a managed access token to an anonymous endpoint', async () => {
    const tokenService = TestBed.inject(TokenHeaderGatewayService)
    const fetchSpy = spyOn(globalThis, 'fetch').and.returnValues(
      Promise.resolve(new Response(JSON.stringify({success: true, code: '200', msg: 'ok', data: null, timestamp: 1}), {
        status: 200,
        headers: {'content-type': 'application/json', 'x-rd-request-apitoken': 'previous-session-token'}
      })),
      Promise.resolve(new Response(JSON.stringify({success: true, code: '200', msg: 'ok', data: null, timestamp: 1}), {
        status: 200,
        headers: {'content-type': 'application/json'}
      }))
    )

    await tokenService.request(new Url('authenticated', '/api/me', Method.GET))
    expect(tokenService.getManagedHeader('x-rd-request-apitoken')).toBe('previous-session-token')

    await tokenService.request(
      new Url('anonymous-login', '/api/login', Method.POST, {skipManagedHeaders: true}),
      {username: 'admin'}
    )

    const headers = (fetchSpy.calls.mostRecent().args[1] as RequestInit).headers as Record<string, string>
    expect(Object.keys(headers).some((key) => key.toLowerCase() === 'x-rd-request-apitoken')).toBeFalse()
    tokenService.cleanup()
  })

  it('shares managed headers across services and invalidates stale tokens globally', async () => {
    const firstService = TestBed.inject(TokenHeaderGatewayService)
    const secondService = TestBed.inject(SecondaryTokenHeaderGatewayService)
    spyOn(globalThis, 'fetch').and.returnValues(
      Promise.resolve(new Response(JSON.stringify({success: true, code: '200', msg: 'ok', data: null, timestamp: 1}), {
        status: 200,
        headers: {'content-type': 'application/json', 'x-rd-request-apitoken': 'old-token'}
      })),
      Promise.resolve(new Response(JSON.stringify({success: true, code: '200', msg: 'ok', data: null, timestamp: 1}), {
        status: 200,
        headers: {'content-type': 'application/json', 'x-rd-request-apitoken': 'new-token'}
      }))
    )

    await firstService.request(new Url('login', '/api/login', Method.POST), {username: 'admin'})
    expect(firstService.getManagedHeader('x-rd-request-apitoken')).toBe('old-token')
    expect(secondService.getManagedHeader('x-rd-request-apitoken')).toBe('old-token')

    secondService.clearManagedHeaders()
    expect(firstService.getManagedHeader('x-rd-request-apitoken')).toBeNull()
    expect(secondService.getManagedHeader('x-rd-request-apitoken')).toBeNull()

    await firstService.request(new Url('login', '/api/login', Method.POST), {username: 'admin'})
    expect(secondService.getManagedHeader('x-rd-request-apitoken')).toBe('new-token')
    firstService.cleanup()
    secondService.cleanup()
  })
})
