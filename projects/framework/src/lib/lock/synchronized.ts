
const globalLock = new Map<string, Promise<void>>();

/**
 * synchronized 装饰器/函数
 * 用于修饰异步方法，实现自动加锁
 *
 * @author richie696
 * @version 1.0
 * @since 2025/06/19
 *
 * ### 示例
 * ```typescript
 * import { synchronized } from './synchronized';
 *
 * // 1. 装饰器用法
 * class BankAccount {
 *   private balance = 0;
 *
 *   @synchronized('account')
 *   async deposit(amount: number) {
 *     // 自动加锁，保证并发安全
 *     const oldBalance = this.balance;
 *     await new Promise(res => setTimeout(res, 100)); // 模拟耗时
 *     this.balance = oldBalance + amount;
 *     console.log('存款后余额:', this.balance);
 *   }
 * }
 *
 * const account = new BankAccount();
 * account.deposit(100);
 * account.deposit(200);
 * ```
 */
export function synchronized(key: string) {
  /**
   * @param target 装饰目标
   * @param propertyKey 方法名
   * @param descriptor 方法描述符
   */
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      // 拿到该 key 上一个执行链，形成串行队列
      let prev = globalLock.get(key) || Promise.resolve();
      let release: () => void;
      const p = new Promise<void>(resolve => (release = resolve));
      // 将当前任务挂到队尾
      globalLock.set(key, prev.then(() => p));
      try {
        return await originalMethod.apply(this, args);
      } finally {
        // 完成后释放下一位
        release!();
      }
    };
    return descriptor;
  };
}


/**
 * synchronized 函数
 * 用于修饰异步方法，实现自动加锁
 *
 * @author richie696
 * @version 1.0
 * @since 2025/06/19
 *
 * ### 示例
 * ```typescript
 * import { synchronizedFunc } from './synchronized';
 *
 * // 函数包裹用法
 * let counter = 0;
 * async function increase() {
 *   await synchronizedFunc('counter', async () => {
 *     // 自动加锁
 *     const old = counter;
 *     await new Promise(res => setTimeout(res, 100));
 *     counter = old + 1;
 *     console.log('计数器:', counter);
 *   });
 * }
 * increase();
 * increase();
 * ```
 */
export async function synchronizedFunc<T>(key: string, fn: () => Promise<T>): Promise<T> {
  // 与装饰器版本一致：按 key 串行执行
  let prev = globalLock.get(key) || Promise.resolve();
  let release: () => void;
  const p = new Promise<void>(resolve => (release = resolve));
  globalLock.set(key, prev.then(() => p));
  try {
    return await fn();
  } finally {
    // 当前任务结束后放行下一个任务
    release!();
  }
}
