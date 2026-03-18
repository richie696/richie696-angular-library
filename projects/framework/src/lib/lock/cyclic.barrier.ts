/**
 * CyclicBarrier（循环栅栏）
 * 支持 reset、await 可中断、barrier action
 *
 * @author richie696
 * @version 2.0
 * @since 2025/06/19
 *
 * ### 示例
 * ```typescript
 * import { CyclicBarrier } from './cyclic.barrier';
 *
 * // barrier action
 * const barrier = new CyclicBarrier(3, () => console.log('所有人到齐，barrier action 执行'));
 *
 * async function participant(id: number) {
 *   console.log(`参与者${id}到达集合点`);
 *   await barrier.await();
 *   console.log(`参与者${id}开始执行下一步`);
 * }
 *
 * // 可中断等待
 * const controller = new AbortController();
 * barrier.await(controller.signal).catch(e => console.log('等待被中断:', e.message));
 *
 * // 重置
 * barrier.reset();
 * ```
 */
export class CyclicBarrier {
  private readonly parties: number;
  private count: number;
  private resolveList: Array<() => void> = [];
  private rejectList: Array<(err: any) => void> = [];
  private readonly barrierAction?: () => void;

  constructor(parties: number, barrierAction?: () => void) {
    this.parties = parties;
    this.count = 0;
    this.barrierAction = barrierAction;
  }

  async await(signal?: AbortSignal): Promise<void> {
    this.count++;
    if (this.count >= this.parties) {
      if (this.barrierAction) {
        try { this.barrierAction(); } catch {}
      }
      while (this.resolveList.length > 0) {
        const resolve = this.resolveList.shift();
        resolve && resolve();
      }
      this.rejectList = [];
      this.count = 0;
    } else {
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
            reject(new Error('CyclicBarrier await aborted'));
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

  reset(): void {
    this.count = 0;
    while (this.rejectList.length > 0) {
      const reject = this.rejectList.shift();
      reject && reject(new Error('CyclicBarrier reset'));
    }
    this.resolveList = [];
  }
}
