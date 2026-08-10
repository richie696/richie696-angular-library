export interface SseEvent {
  event?: string
  id?: string
  retry?: number
  data: string
}

/** 增量 SSE parser：支持 LF、CRLF、单独 CR、跨 chunk、EOF 尾帧和多 data 行。 */
export class SseParser {
  private buffer = ''

  constructor(private readonly maxBufferSize = 1024 * 1024) {}

  feed(chunk: string, emit: (event: SseEvent) => void): void {
    this.buffer += chunk
    if (this.buffer.length > this.maxBufferSize) {
      throw new Error(`SSE buffer overflow: exceeded ${this.maxBufferSize} bytes without event delimiter`)
    }
    let boundary: {index: number; length: number} | undefined
    while ((boundary = this.findBoundary())) {
      const block = this.buffer.slice(0, boundary.index)
      this.buffer = this.buffer.slice(boundary.index + boundary.length)
      this.emitBlock(block, emit)
    }
  }

  end(emit: (event: SseEvent) => void): void {
    if (this.buffer.trim()) {
      this.emitBlock(this.buffer, emit)
      this.buffer = ''
    }
  }

  private findBoundary(): {index: number; length: number} | undefined {
    const matches = ['\n\n', '\r\r', '\r\n\r\n']
      .map((separator) => ({index: this.buffer.indexOf(separator), length: separator.length}))
      .filter((item) => item.index >= 0)
      .sort((a, b) => a.index - b.index)
    return matches[0]
  }

  private emitBlock(block: string, emit: (event: SseEvent) => void): void {
    if (!block.trim()) return
    const normalized = block.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const data: string[] = []
    let event: string | undefined
    let id: string | undefined
    let retry: number | undefined
    for (const line of normalized.split('\n')) {
      if (!line || line.startsWith(':')) continue
      const separator = line.indexOf(':')
      const field = separator >= 0 ? line.slice(0, separator) : line
      const value = separator >= 0 ? line.slice(separator + 1).replace(/^ /, '') : ''
      switch (field) {
        case 'data': data.push(value); break
        case 'event': event = value; break
        case 'id': id = value; break
        case 'retry': if (/^\d+$/.test(value)) retry = Number(value); break
      }
    }
    if (data.length > 0) emit({event, id, retry, data: data.join('\n')})
  }
}
