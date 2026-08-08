import {Inject, Injectable} from '@angular/core'
import { HttpClient, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http'
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

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.mock?.enable) {
      return next.handle(request)
    }
    return this.mockRequest(request, next)
  }

  private mockRequest(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const {url} = request
    const mockDataUrl = resolveMockAssetUrl(url, this.mock)
    if (!mockDataUrl) {
      return next.handle(request)
    }

    const handleRoute = (): Observable<HttpResponse<any>> => {
      const observable = this.http.get(mockDataUrl)
      return from(firstValueFrom(observable).then((response) => this.ok(response)))
    }

    return of(null)
      .pipe(mergeMap(handleRoute))
      .pipe(materialize())
      .pipe(delay(DEFAULT_MOCK_DELAY_MS))
      .pipe(dematerialize())
  }

  private ok(body?: any): HttpResponse<any> {
    return new HttpResponse({status: 200, body})
  }
}
