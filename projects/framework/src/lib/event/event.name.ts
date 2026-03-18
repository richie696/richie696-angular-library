import { Enum } from '../abstract.enums'

/**
 * 前端页面地址枚举类
 */
export class EventNameEnum extends Enum<EventNameEnum> {
  constructor(
    objectName: string,
    private _value: string
  ) {
    super(objectName)
  }

  get value(): string {
    return this._value
  }
}
