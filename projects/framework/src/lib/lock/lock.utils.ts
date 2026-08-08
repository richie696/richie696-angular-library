/**
 * 创建线程 ID（用于锁实例内部区分“持有者”上下文）。
 */
export const createThreadId = ()=>  {
  // Symbol 天然唯一，适合做轻量 owner 标识
  return Symbol('thread');
}
