/**
 * 条件变量 Condition
 * 支持在锁内等待/唤醒，兼容 ReentrantLock、ReadWriteLock
 *
 * @author richie696
 * @version 1.0
 * @since 2025/06/19
 */
export class Condition<L> {
  private waiters: Array<() => void> = [];
  private lock: L;

  /**
   * @param lock 关联锁实例（需实现 unlock()/lock(signal?)）
   */
  constructor(lock: L) {
    this.lock = lock;
  }

  /**
   * 等待条件（会释放锁，等待唤醒后自动重新加锁）
   * lock 需实现 unlock()/lock(signal?)
   */
  async await(signal?: AbortSignal): Promise<void> {
    // 等待前先释放锁，避免阻塞其他协程推进条件
    // @ts-ignore
    this.lock.unlock();
    await new Promise<void>((resolve, reject) => {
      this.waiters.push(resolve);
      if (signal) {
        const onAbort = () => {
          // 中断时从等待队列移除当前等待者
          const idx = this.waiters.indexOf(resolve);
          if (idx >= 0) this.waiters.splice(idx, 1);
          reject(new Error('Condition await aborted'));
        };
        if (signal?.aborted) {
          onAbort();
        } else {
          signal?.addEventListener('abort', onAbort, { once: true });
        }
      }
    });
    // 被唤醒后重新获取锁，再返回调用方
    // @ts-ignore
    await this.lock.lock(signal);
  }

  /**
   * 唤醒一个等待者
   */
  signal(): void {
    const next = this.waiters.shift();
    next && next();
  }

  /**
   * 唤醒所有等待者
   */
  signalAll(): void {
    while (this.waiters.length > 0) {
      const next = this.waiters.shift();
      next && next();
    }
  }
} 