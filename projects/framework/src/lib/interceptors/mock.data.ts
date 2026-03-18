import {InjectionToken} from "@angular/core";

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

export const MOCK_DATA_TOKEN = new InjectionToken<MockData>('MockData');

export const provideMock = () => {
  return [
    {
      provide: MOCK_DATA_TOKEN,
      useValue: {
        enable: true,
        apiPrefix: '/api',
        mockDataDir: '/assets/mock-data'
      }
    }
  ]
}
