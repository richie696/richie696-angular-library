import {MockData} from './mock.data'

export const DEFAULT_MOCK_DATA_DIR = '/assets/mock-data'
export const MOCK_DATA_SUFFIX = '.json'
export const DEFAULT_MOCK_DELAY_MS = 500

export interface NormalizedMockData {
  enable: boolean
  apiPrefix: string
  mockDataDir: string
}

/**
 * 归一化 mock 配置，供 HttpClient 拦截器与 fetch 补丁共用。
 */
export function normalizeMockData(config: MockData): NormalizedMockData {
  return {
    enable: config.enable ?? false,
    apiPrefix: config.apiPrefix ?? '/api',
    mockDataDir: config.mockDataDir ?? DEFAULT_MOCK_DATA_DIR
  }
}

/**
 * 将 API 请求 URL 映射为静态 mock JSON 资源路径。
 * 返回 null 表示不应走 mock。
 */
export function resolveMockAssetUrl(requestUrl: string, config: MockData): string | null {
  const {enable, apiPrefix, mockDataDir} = normalizeMockData(config)
  if (!enable) {
    return null
  }
  if (requestUrl.endsWith(MOCK_DATA_SUFFIX)) {
    return null
  }
  if (!requestUrl.includes(apiPrefix)) {
    return null
  }
  return (
    requestUrl
      .substring(requestUrl.indexOf(apiPrefix))
      .replace(apiPrefix, mockDataDir)
      .replace('{}', 'data') + MOCK_DATA_SUFFIX
  )
}
