import {Inject, Injectable, inject} from '@angular/core'
import {HttpClient, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse, HttpInterceptorFn, HttpFeature, HttpFeatureKind, withInterceptors} from '@angular/common/http'
import { dematerialize, firstValueFrom, from, materialize, mergeMap, Observable, of } from 'rxjs'
import { delay } from 'rxjs/operators'
import {MOCK_DATA_TOKEN, MockData} from './mock.data'
import {DEFAULT_MOCK_DELAY_MS, resolveMockAssetUrl} from './mock.resolver'

@Injectable({
  providedIn: 'root'
})
export class MockInterceptor implements HttpInterceptor {
  constructor(
    private http: HttpClient,
    @Inject(MOCK_DATA_TOKEN) private mock: MockData
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.mock?.enable) {
      return next.handle(request)
    }
    return this.mockRequest(request, next)
  }

  private mockRequest(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const {url} = request
    const mockDataUrl = resolveMockAssetUrl(url, this.mock)
    if (!mockDataUrl) {
      return next.handle(request)
    }

    const handleRoute = (): Observable<HttpResponse<unknown>> => {
      const observable = this.http.get(mockDataUrl)
      return from(firstValueFrom(observable).then((response) => this.ok(response)))
    }

    return of(null)
      .pipe(mergeMap(handleRoute))
      .pipe(materialize())
      .pipe(delay(DEFAULT_MOCK_DELAY_MS))
      .pipe(dematerialize())
  }

  private ok(body?: unknown): HttpResponse<unknown> {
    return new HttpResponse({status: 200, body})
  }
}

/**
 * Standalone 应用可直接传给 `provideHttpClient(withInterceptors([...]))` 的函数式拦截器。
 * Mock 仍需通过 `provideMock({enable: true})` 显式开启。
 */
export const mockInterceptor: HttpInterceptorFn = (request, next) => {
  const mock = inject(MOCK_DATA_TOKEN, {optional: true})
  if (!mock?.enable) return next(request)
  const http = inject(HttpClient)
  const mockDataUrl = resolveMockAssetUrl(request.url, mock)
  if (!mockDataUrl) return next(request)
  return of(null).pipe(
    mergeMap(() => from(firstValueFrom(http.get<unknown>(mockDataUrl)).then((body) => new HttpResponse({status: 200, body})))),
    delay(DEFAULT_MOCK_DELAY_MS)
  )
}

/** Standalone provider feature：`provideHttpClient(withMockInterceptor())`。 */
export function withMockInterceptor(): HttpFeature<HttpFeatureKind.Interceptors> {
  return withInterceptors([mockInterceptor])
}
