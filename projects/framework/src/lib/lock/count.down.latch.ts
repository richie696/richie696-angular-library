/**
 * CountDownLatch（倒计时锁）
 * 支持 await 可中断
 *
 * @author richie696
 * @version 2.0
 * @since 2025/06/19
 *
 * ### 示例
 * ```typescript
 * import { CountDownLatch } from './count.down.latch';
 *
 * const latch = new CountDownLatch(3);
 *
 * function worker(id: number) {
 *   setTimeout(() => {
 *     console.log(`工人${id}完成任务`);
 *     latch.countDown();
 *   }, 200 * id);
 * }
 *
 * async function main() {
 *   worker(1);
 *   worker(2);
 *   worker(3);
 *   await latch.await(); // 等待所有工人完成
 *   console.log('所有工人完成，主流程继续');
 * }
 *
 * // 可中断等待
 * const controller = new AbortController();
 * setTimeout(() => controller.abort(), 100); // 100ms后中断
 * latch.await(controller.signal).catch(e => console.log('等待被中断:', e.message));
 * ```
 */
export class CountDownLatch {
  private count: number;
  private resolveList: Array<() => void> = [];
  private rejectList: Array<(err: any) => void> = [];

  /**
   * @param count 初始倒计数值
   */
  constructor(count: number) {
    this.count = count;
  }

  /**
   * 计数减一；当计数归零时唤醒全部等待者。
   */
  countDown(): void {
    this.count--;
    if (this.count <= 0) {
      // 计数归零后按注册顺序依次放行
      while (this.resolveList.length > 0) {
        const resolve = this.resolveList.shift();
        resolve && resolve();
      }
      this.rejectList = [];
    }
  }

  /**
   * 等待倒计数归零，支持 AbortSignal 中断。
   * @param signal 可选中断信号
   */
  async await(signal?: AbortSignal): Promise<void> {
    // 已归零则直接通过，避免额外 Promise 分配
    if (this.count <= 0) return;
    return new Promise<void>((resolve, reject) => {
      this.resolveList.push(resolve);
      this.rejectList.push(reject);
      if (signal) {
        const onAbort = () => {
          // 中断时同步移除 resolve/reject 对应槽位
          const idx = this.resolveList.indexOf(resolve);
          if (idx >= 0) {
            this.resolveList.splice(idx, 1);
            this.rejectList.splice(idx, 1);
          }
          reject(new Error('CountDownLatch await aborted'));
        };
        if (signal.aborted) {
          onAbort();
        } else {
          signal.addEventListener('abort', onAbort, { once: true });
        }
      }
    });
  }
}
