export abstract class Enum<T extends Enum<T>> {
  /** 按子类构造函数分组的枚举实例，确保每个子类拥有独立的 enums 数组 */
  private static enumMap = new WeakMap<Function, Enum<any>[]>();

  /**
   * @param objectName 枚举实例名称
   */
  protected constructor(private objectName: string) {
    const ctor = this.constructor as Function;
    // 首次访问时为当前子类创建独立实例池
    if (!Enum.enumMap.has(ctor)) {
      Enum.enumMap.set(ctor, []);
    }
    // 按声明顺序登记实例，用于 values()/ordinal()
    Enum.enumMap.get(ctor)!.push(this);
  }

  /**
   * 获取当前类型所有的枚举类实例只读数组的函数
   * @return 返回当前类型所有的枚举类实例只读数组
   */
  public static values<T>(this: new (...args: any[]) => T): ReadonlyArray<T> {
    const arr = Enum.enumMap.get(this as Function) ?? [];
    // 返回副本并冻结，避免外部篡改内部实例顺序
    return Object.freeze([...arr] as T[]);
  }

  /**
   * 根据枚举名称获取事件名对象的函数
   * @param name URL地址
   * @return 返回统一资源定位符对象（如果ID无效则抛出异常）
   */
  public static nameOf<T extends Enum<T>>(this: new (...args: any[]) => T, name: string): T {
    const values: ReadonlyArray<T> = (this as any).values();
    // 线性查找匹配名称（通常枚举数量较小）
    for (const obj of values) {
      if (obj.name === name) {
        return obj;
      }
    }
    throw new Error(`You are accessing an invalid event name, name = ${name}`);
  }

  /**
   * 获取当前枚举类型序号的函数
   * @return {number} 返回当前枚举类型序号
   */
  public ordinal(): number {
    const ctor = this.constructor as Function;
    const arr = Enum.enumMap.get(ctor) ?? [];
    // ordinal 基于注册顺序（从 0 开始）
    return arr.indexOf(this);
  }

  /**
   * 将当前枚举类型转换为字符串的函数
   * @return {string} 返回当前枚举类型的名称
   */
  public toString(): string {
    return this.name;
  }

  /**
   * 获取当前枚举类型名称的函数
   * @return {string} 返回当前枚举类型的名称
   */
  get name(): string {
    return this.objectName;
  }
}
