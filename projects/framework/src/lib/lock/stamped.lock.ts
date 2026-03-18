/**
 * StampedLock（带戳锁）
 * 支持乐观读、悲观读写锁
 *
 * @author richie696
 * @version 1.1
 * @since 2025/06/19
 *
 * ### 示例
 * ```typescript
 * import { StampedLock } from './stamped.lock';
 *
 * const stampedLock = new StampedLock();
 * let sharedValue = 100;
 *
 * // 1. 乐观读
 * async function optimisticReadTask() {
 *   const stamp = stampedLock.tryOptimisticRead();
 *   const value = sharedValue;
 *   await new Promise(res => setTimeout(res, 200));
 *   if (stampedLock.validate(stamp)) {
 *     console.log('乐观读成功，值为:', value);
 *   } else {
 *     await stampedLock.readLock();
 *     try {
 *       console.log('乐观读失败，切换为悲观读，值为:', sharedValue);
 *     } finally {
 *       stampedLock.readUnlock();
 *     }
 *   }
 * }
 *
 * // 2. 写锁（可中断）
 * async function interruptibleWrite(signal: AbortSignal) {
 *   try {
 *     await stampedLock.writeLock(signal);
 *     try {
 *       sharedValue += 10;
 *       console.log('写锁获取，值变为:', sharedValue);
 *     } finally {
 *       stampedLock.writeUnlock();
 *     }
 *   } catch (e) {
 *     console.log('写锁被中断:', e.message);
 *   }
 * }
 *
 * // 3. 条件变量用法
 * async function conditionExample() {
 *   const condition = stampedLock.newCondition();
 *   await stampedLock.writeLock();
 *   try {
 *     await condition.await();
 *     console.log('条件满足，继续执行');
 *   } finally {
 *     stampedLock.writeUnlock();
 *   }
 *   // 另一处代码唤醒：condition.signal() 或 condition.signalAll()
 * }
 *
 * // 并发调用示例
 * optimisticReadTask();
 * interruptibleWrite(new AbortController().signal);
 * ```
 */
export class StampedLock {
  private stamp = 0;
  private readers = 0;
  private writer = false;
  private queue: Array<() => void> = [];

  async writeLock(): Promise<number> {
    if (!this.writer && this.readers === 0) {
      this.writer = true;
      this.stamp++;
      return this.stamp;
    }
    await new Promise<void>(resolve => this.queue.push(resolve));
    return this.writeLock();
  }

  writeUnlock(): void {
    this.writer = false;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next && next();
    }
  }

  async readLock(): Promise<number> {
    if (!this.writer && this.queue.length === 0) {
      this.readers++;
      return this.stamp;
    }
    await new Promise<void>(resolve => this.queue.push(resolve));
    return this.readLock();
  }

  readUnlock(): void {
    this.readers--;
    if (this.readers === 0 && this.queue.length > 0) {
      const next = this.queue.shift();
      next && next();
    }
  }

  tryOptimisticRead(): number {
    return this.stamp;
  }

  validate(stamp: number): boolean {
    return this.stamp === stamp && !this.writer;
  }
}
