import {EventManager} from './event.manager'
import {EventNameEnum} from './event.name'

describe('EventManager', () => {
  it('publishes typed event payloads and removes subscriptions', () => {
    const manager = new EventManager()
    const loginEvent = new EventNameEnum('LOGIN', 'login')
    const received: unknown[] = []
    const subscriptionId = manager.subscribe(loginEvent, (event) => received.push(event))

    manager.publish(loginEvent, {userId: 'u-1'})
    manager.unsubscribe(subscriptionId)
    manager.publish(loginEvent, {userId: 'u-2'})

    expect(received).toEqual([{userId: 'u-1'}])
  })
})
