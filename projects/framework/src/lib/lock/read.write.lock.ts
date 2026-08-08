import {createThreadId} from "./lock.utils";
import {Condition} from "./condition";

/**
 * 读写锁（ReadWriteLock）
 * 支持多读单写，线程ID由锁内部自动生成
 *
 * @author richie696
 * @version 1.1
 * @since 2025/06/19
 *
 * ### 示例
 * ```typescript
 * import { ReadWriteLock } from './read.write.lock';
 *
 * const rwLock = new ReadWriteLock();
 * let sharedData = 0;
 *
 * // 1. 基本用法：读写互斥
 * async function readTask(id: number) {
 *   await rwLock.readLock();
 *   try {
 *     console.log(`读任务${id}读取数据:`, sharedData);
 *     await new Promise(res => setTimeout(res, 300));
 *   } finally {
 *     rwLock.readUnlock();
 *     console.log(`读任务${id}释放读锁`);
 *   }
 * }
 *
 * async function writeTask(id: number) {
 *   await rwLock.writeLock();
 *   try {
 *     sharedData += 1;
 *     console.log(`写任务${id}修改数据为:`, sharedData);
 *     await new Promise(res => setTimeout(res, 500));
 *   } finally {
 *     rwLock.writeUnlock();
 *     console.log(`写任务${id}释放写锁`);
 *   }
 * }
 *
 * // 2. 可中断锁用法
 * async function interruptibleRead(signal: AbortSignal) {
 *   try {
 *     await rwLock.readLock(signal);
 *     try {
 *       console.log('加读锁成功');
 *     } finally {
 *       rwLock.readUnlock();
 *     }
 *   } catch (e) {
 *     console.log('加读锁被中断:', e.message);
 *   }
 * }
 *
 * // 3. 条件变量用法
 * 请注意，应只在写锁下用。读锁下不建议用条件变量，因为条件变量会等待锁释放，而读锁不会释放。
 * async function conditionExample() {
 *   const condition = rwLock.newCondition();
 *   await rwLock.writeLock();
 *   try {
 *     await condition.await();
 *     console.log('条件满足，继续执行');
 *   } finally {
 *     rwLock.writeUnlock();
 *   }
 *   // 另一处代码唤醒：condition.signal() 或 condition.signalAll()
 * }
 *
 * // 并发调用示例
 * readTask(1);
 * readTask(2);
 * writeTask(1);
 * readTask(3);
 * ```
 */
export class ReadWriteLock {
  private readers = 0;
  private writer = false;
  private readQueue: Array<() => void> = [];
  private writeQueue: Array<() => void> = [];
  private threadId: symbol;

  /**
   * 初始化读写锁实例。
   */
  constructor() {
    this.threadId = createThreadId();
  }

  /**
   * 获取读锁：无写者且无写请求排队时可直接并发读取。
   */
  async readLock(): Promise<void> {
    if (!this.writer && this.writeQueue.length === 0) {
      this.readers++;
      return;
    }
    // 写者优先：若已有写请求，读者进入队列等待
    await new Promise<void>(resolve => this.readQueue.push(resolve));
    return this.readLock();
  }

  /**
   * 释放读锁；最后一个读者释放后尝试唤醒写者。
   */
  readUnlock(): void {
    this.readers--;
    if (this.readers === 0 && this.writeQueue.length > 0) {
      const next = this.writeQueue.shift();
      next && next();
    }
  }

  /**
   * 获取写锁：需等待无写者且无读者。
   */
  async writeLock(): Promise<void> {
    if (!this.writer && this.readers === 0) {
      this.writer = true;
      return;
    }
    // 写锁独占，排队等待
    await new Promise<void>(resolve => this.writeQueue.push(resolve));
    return this.writeLock();
  }

  /**
   * 释放写锁：优先唤醒读队列，否则唤醒下一个写者。
   */
  writeUnlock(): void {
    this.writer = false;
    if (this.readQueue.length > 0) {
      // 批量放行读者，提高读吞吐
      while (this.readQueue.length > 0) {
        const next = this.readQueue.shift();
        next && next();
      }
    } else if (this.writeQueue.length > 0) {
      const next = this.writeQueue.shift();
      next && next();
    }
  }

  /**
   * 创建条件变量（仅支持写锁下使用）
   */
  newCondition(): Condition<ReadWriteLock> {
    return new Condition<ReadWriteLock>(this);
  }
}


