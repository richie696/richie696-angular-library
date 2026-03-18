import {ConfirmListener, MessageOptions, MessageParam} from "../public-api";

export interface AbstractPrompt {

  info(message: string, options?: MessageOptions): Promise<void>

  error(message: string, options?: MessageOptions): Promise<void>

  warn(message: string, options?: MessageOptions): Promise<void>

  success(message: string, options?: MessageOptions): Promise<void>

  confirm(messageId: string, messageParams?: MessageParam, confirmListener?: ConfirmListener): Promise<void>

}
