import {RequestInfo} from '../types/abstract-service.internal.types'

/**
 * 防重复提交模块：在时间窗口内识别并拦截重复请求。
 */
export class DuplicateSubmitModule {
  /** 请求记录队列（key 为 requestId） */
  private requestQueue = new Map<string, RequestInfo>()
  /** 防重时间窗口（毫秒） */
  private timeWindow: number

  /**
   * @param timeWindow 防重复提交时间窗口（毫秒）
   */
  constructor(timeWindow: number = 3000) {
    this.timeWindow = timeWindow
  }

  /**
   * 基于请求关键信息生成稳定 requestId。
   * @param url 请求 URL
   * @param method 请求方法
   * @param body 请求体
   * @param userId 用户 ID（用于同接口多用户隔离）
   */
  generateRequestId(url: string, method: string, body: any, userId: string | null): string {
    // 将时间戳归一到窗口粒度，保证同窗口内相同请求命中同一 ID
    const data = {
      url,
      method,
      body: body ? JSON.stringify(body) : '',
      userId: userId || '',
      timestamp: Math.floor(Date.now() / this.timeWindow) * this.timeWindow
    }
    // 使用轻量字符串哈希生成短 ID（满足前端防重复场景）
    const str = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i)
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * 判断给定 requestId 是否仍处于防重时间窗口内。
   * @param requestId 请求唯一标识
   */
  isDuplicateRequest(requestId: string): boolean {
    const info = this.requestQueue.get(requestId)
    if (!info) return false
    return Date.now() - info.timestamp < this.timeWindow
  }

  /**
   * 记录请求并清理过期项。
   * @param requestId 请求唯一标识
   * @param url 请求 URL
   */
  recordRequest(requestId: string, url: string): void {
    this.requestQueue.set(requestId, { timestamp: Date.now(), url })
    this.cleanupExpiredRequests()
  }

  /**
   * 清理单个请求记录。
   * @param requestId 请求唯一标识
   */
  clearRequest(requestId: string): void {
    this.requestQueue.delete(requestId)
  }

  /**
   * 清理超过时间窗口的历史请求记录。
   */
  cleanupExpiredRequests(): void {
    const expired = Date.now() - this.timeWindow
    for (const [id, info] of this.requestQueue.entries()) {
      if (info.timestamp < expired) this.requestQueue.delete(id)
    }
  }

  /**
   * 清空全部请求记录。
   */
  clearAll(): void {
    this.requestQueue.clear()
  }

  /**
   * 动态更新防重复窗口。
   * @param timeWindow 新时间窗口（毫秒）
   */
  updateTimeWindow(timeWindow: number): void {
    this.timeWindow = timeWindow
  }
}
