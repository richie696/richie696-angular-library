import {Inject, Injectable} from '@angular/core'
import { HttpClient, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http'
import { dematerialize, firstValueFrom, from, materialize, mergeMap, Observable, of } from 'rxjs'
import { delay } from 'rxjs/operators'
import {MOCK_DATA_TOKEN, MockData} from './mock.data'

@Injectable({
  providedIn: 'root'
})
export class MockInterceptor implements HttpInterceptor {
  private static readonly MOCK_DATA_DIR: string = '/assets/mock-data'

  private static readonly MOCK_DATA_SUFFIX: string = '.json'

  constructor(
    private http: HttpClient,
    @Inject(MOCK_DATA_TOKEN) private mock: MockData
  ) {
    this.mock.enable = this.mock.enable === undefined ? false : this.mock.enable
    this.mock.apiPrefix = this.mock.apiPrefix === undefined ? '' : this.mock.apiPrefix
    this.mock.mockDataDir = this.mock.mockDataDir === undefined ? MockInterceptor.MOCK_DATA_DIR : this.mock.mockDataDir
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.mock) {
      return this.mockRequest(request, next)
    }
    return next.handle(request)
  }

  private mockRequest(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const { url } = request
    if (url.endsWith('.json')) {
      return next.handle(request)
    }
    const handleRoute = (): Observable<HttpResponse<any>> => {
      let mockDataUrl
      if (url.includes(this.mock.apiPrefix)) {
        const { MOCK_DATA_SUFFIX } = MockInterceptor
        mockDataUrl =
          url.substring(url.indexOf(this.mock.apiPrefix)).replace(this.mock.apiPrefix, this.mock.mockDataDir!).replace('{}', 'data') +
          MOCK_DATA_SUFFIX
      } else {
        mockDataUrl = url
      }
      const observable = this.http.get(mockDataUrl)
      return from(firstValueFrom(observable).then((response) => ok(response)))
    }

    const ok = (body?: any) => {
      return new HttpResponse({ status: 200, body })
    }

    return of(null).pipe(mergeMap(handleRoute)).pipe(materialize()).pipe(delay(500)).pipe(dematerialize())
  }
}
