
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
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      let prev = globalLock.get(key) || Promise.resolve();
      let release: () => void;
      const p = new Promise<void>(resolve => (release = resolve));
      globalLock.set(key, prev.then(() => p));
      try {
        return await originalMethod.apply(this, args);
      } finally {
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
  let prev = globalLock.get(key) || Promise.resolve();
  let release: () => void;
  const p = new Promise<void>(resolve => (release = resolve));
  globalLock.set(key, prev.then(() => p));
  try {
    return await fn();
  } finally {
    release!();
  }
}
