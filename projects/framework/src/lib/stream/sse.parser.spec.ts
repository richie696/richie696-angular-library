import {SseParser} from './sse.parser'

describe('SseParser', () => {
  it('parses CRLF events split across chunks and flushes the EOF frame', () => {
    const parser = new SseParser()
    const events: unknown[] = []

    parser.feed('id: 1\r\nevent: token\r\ndata: {"a":', (event) => events.push(event))
    parser.feed('1}\r\n\r\ndata: tail', (event) => events.push(event))
    parser.end((event) => events.push(event))

    expect(events).toEqual([
      {id: '1', event: 'token', retry: undefined, data: '{"a":1}'},
      {id: undefined, event: undefined, retry: undefined, data: 'tail'}
    ])
  })

  it('keeps multiple data lines and ignores comments', () => {
    const parser = new SseParser()
    const events: string[] = []

    parser.feed(': heartbeat\ndata: first\ndata: second\n\n', (event) => events.push(event.data))

    expect(events).toEqual(['first\nsecond'])
  })

  it('protects against an unbounded event buffer', () => {
    const parser = new SseParser(4)

    expect(() => parser.feed('12345', () => undefined)).toThrowError(/buffer overflow/)
  })
})
