import {createThreadId} from "./lock.utils";
import {Condition} from "./condition";

/**
 * 可重入锁（ReentrantLock）
 * 支持同一"线程"多次加锁，线程ID由锁内部自动生成
 * 支持公平锁、可中断锁、条件变量
 *
 * @author richie696
 * @version 2.0
 * @since 2025/06/19
 *
 * ### 示例
 * ```typescript
 * import { ReentrantLock } from './reentrant.lock';
 *
 * // 创建一个可重入锁实例
 * const lock = new ReentrantLock();
 *
 * // 1. 基本用法：公平锁、可重入
 * async function criticalSection() {
 *   await lock.lock(); // 加锁，进入临界区
 *   try {
 *     console.log('第一次加锁，进入临界区');
 *     await lock.lock(); // 可重入
 *     try {
 *       console.log('第二次加锁，依然在临界区');
 *       await new Promise(res => setTimeout(res, 500));
 *     } finally {
 *       lock.unlock(); // 释放一次锁
 *       console.log('释放一次锁');
 *     }
 *   } finally {
 *     lock.unlock(); // 彻底释放锁
 *     console.log('彻底释放锁，其他等待者可进入');
 *   }
 * }
 *
 * // 2. 可中断锁用法
 * async function interruptibleTask(signal: AbortSignal) {
 *   try {
 *     await lock.lock(signal); // 支持传入AbortSignal
 *     try {
 *       console.log('加锁成功，处理中...');
 *       await new Promise(res => setTimeout(res, 1000));
 *     } finally {
 *       lock.unlock();
 *     }
 *   } catch (e) {
 *     console.log('加锁被中断:', e.message);
 *   }
 * }
 *
 * // 3. 条件变量用法
 * async function conditionExample() {
 *   const condition = lock.newCondition();
 *   await lock.lock();
 *   try {
 *     // 等待某个条件
 *     await condition.await();
 *     // 被唤醒后继续执行
 *     console.log('条件满足，继续执行');
 *   } finally {
 *     lock.unlock();
 *   }
 *   // 另一处代码唤醒：condition.signal() 或 condition.signalAll()
 * }
 *
 * // 并发调用示例
 * criticalSection();
 * criticalSection();
 * ```
 */
export class ReentrantLock {
  private owner: symbol | null = null;
  private count: number = 0;
  private queue: Waiter[] = [];
  private readonly threadId: symbol;

  constructor() {
    this.threadId = createThreadId();
  }

  /**
   * 获取锁，支持公平、可中断
   * @param signal 可选，AbortSignal，用于中断等待
   */
  async lock(signal?: AbortSignal): Promise<void> {
    if (this.owner === this.threadId) {
      this.count++;
      return;
    }
    if (!this.owner) {
      this.owner = this.threadId;
      this.count = 1;
      return;
    }
    // 公平锁：排队，支持可中断
    return new Promise<void>((resolve, reject) => {
      const waiter: Waiter = { resolve, reject, signal };
      this.queue.push(waiter);
      if (signal) {
        const onAbort = () => {
          // 从队列移除
          const idx = this.queue.indexOf(waiter);
          if (idx >= 0) this.queue.splice(idx, 1);
          reject(new Error('Lock acquisition aborted'));
        };
        if (signal.aborted) {
          onAbort();
        } else {
          signal.addEventListener('abort', onAbort, { once: true });
        }
      }
    }).then(() => this.lock(signal));
  }

  /**
   * 释放锁
   */
  unlock(): void {
    if (this.owner !== this.threadId) {
      throw new Error('Not lock owner');
    }
    this.count--;
    if (this.count === 0) {
      this.owner = null;
      // 公平锁：只唤醒队首
      while (this.queue.length > 0) {
        const next = this.queue.shift();
        if (next) {
          next.resolve();
          break;
        }
      }
    }
  }

  /**
   * 创建条件变量
   */
  newCondition(): Condition<ReentrantLock> {
    return new Condition<ReentrantLock>(this);
  }
}

interface Waiter {
  resolve: () => void;
  reject: (err: any) => void;
  signal?: AbortSignal;
}
