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

  /**
   * @param parties 触发栅栏所需参与者数量
   * @param barrierAction 所有参与者到齐后执行的回调
   */
  constructor(parties: number, barrierAction?: () => void) {
    this.parties = parties;
    this.count = 0;
    this.barrierAction = barrierAction;
  }

  /**
   * 到达栅栏并等待其他参与者；支持 AbortSignal 中断。
   * @param signal 可选中断信号
   */
  async await(signal?: AbortSignal): Promise<void> {
    this.count++;
    if (this.count >= this.parties) {
      // 最后一个到达者触发 barrier action 并放行所有等待者
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
      // 未达到阈值时进入等待队列
      return new Promise<void>((resolve, reject) => {
        this.resolveList.push(resolve);
        this.rejectList.push(reject);
        if (signal) {
          const onAbort = () => {
            // 中断时移除当前等待者，避免后续误唤醒
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

  /**
   * 重置栅栏，并使所有等待者以异常结束。
   */
  reset(): void {
    this.count = 0;
    while (this.rejectList.length > 0) {
      const reject = this.rejectList.shift();
      reject && reject(new Error('CyclicBarrier reset'));
    }
    this.resolveList = [];
  }
}
