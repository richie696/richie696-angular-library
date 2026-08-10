import {EnvironmentProviders, InjectionToken, Provider, provideAppInitializer} from '@angular/core'
import {DEFAULT_MOCK_DATA_DIR} from './mock.resolver'
import {installMockFetch} from './mock.fetch'

/**
 * 模拟数据配置
 */
export interface MockData {
  /**
   * 是否启用模拟数据
   */
  enable: boolean
  /**
   * API接口前缀
   */
  apiPrefix: string
  /**
   * 模拟数据目录
   */
  mockDataDir?: string
}

export const MOCK_DATA_TOKEN = new InjectionToken<MockData>('MockData')

/**
 * 注册 mock 配置，并在启用时为原生 fetch 安装与 `MockInterceptor` 一致的映射。
 *
 * HttpClient 仍需在应用中注册 `MockInterceptor`；
 * `AbstractService.request()` 走 fetch，由本 provider 自动补丁。
 */
export const provideMock = (config?: Partial<MockData>): Array<Provider | EnvironmentProviders> => {
  const mockConfig: MockData = {
    // Mock 必须显式 opt-in，生产环境不能因遗漏配置而替换全局 fetch。
    enable: config?.enable ?? false,
    apiPrefix: config?.apiPrefix ?? '/api',
    mockDataDir: config?.mockDataDir ?? DEFAULT_MOCK_DATA_DIR
  }

  return [
    {
      provide: MOCK_DATA_TOKEN,
      useValue: mockConfig
    },
    provideAppInitializer(() => {
      if (mockConfig.enable) {
        installMockFetch(mockConfig)
      }
    })
  ]
}
