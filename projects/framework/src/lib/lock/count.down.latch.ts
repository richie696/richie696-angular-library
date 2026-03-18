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

  constructor(count: number) {
    this.count = count;
  }

  countDown(): void {
    this.count--;
    if (this.count <= 0) {
      while (this.resolveList.length > 0) {
        const resolve = this.resolveList.shift();
        resolve && resolve();
      }
      this.rejectList = [];
    }
  }

  async await(signal?: AbortSignal): Promise<void> {
    if (this.count <= 0) return;
    return new Promise<void>((resolve, reject) => {
      this.resolveList.push(resolve);
      this.rejectList.push(reject);
      if (signal) {
        const onAbort = () => {
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
