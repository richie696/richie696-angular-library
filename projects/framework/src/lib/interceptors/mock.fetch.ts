import {MockData} from './mock.data'
import {DEFAULT_MOCK_DELAY_MS, resolveMockAssetUrl} from './mock.resolver'

let installed = false
let originalFetch: typeof globalThis.fetch | undefined

function resolveRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input
  }
  if (input instanceof URL) {
    return input.href
  }
  return input.url
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 为 `AbstractService.request()` 使用的原生 fetch 安装 mock 映射。
 * 与 `MockInterceptor` 共享同一套 URL 解析规则。
 */
export function installMockFetch(config: MockData): void {
  if (typeof globalThis.fetch !== 'function' || installed) {
    return
  }

  originalFetch = globalThis.fetch.bind(globalThis)
  const mockConfig = config

  globalThis.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const requestUrl = resolveRequestUrl(input)
    const mockAssetUrl = resolveMockAssetUrl(requestUrl, mockConfig)
    if (!mockAssetUrl) {
      return originalFetch!(input, init)
    }

    await delay(DEFAULT_MOCK_DELAY_MS)
    return originalFetch!(mockAssetUrl, {method: 'GET'})
  }

  installed = true
}

/** 卸载 fetch mock 补丁，恢复原始 fetch。 */
export function uninstallMockFetch(): void {
  if (!installed || !originalFetch) {
    return
  }
  globalThis.fetch = originalFetch
  installed = false
  originalFetch = undefined
}

/** 当前环境是否已安装 fetch mock 补丁。 */
export function isMockFetchInstalled(): boolean {
  return installed
}
