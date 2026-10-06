import { describe, expect, it } from 'vitest';
import { Realtime, type StompLike } from './Realtime';

class FakeStomp implements StompLike {
  connected = false;
  onConnect: () => void = () => {};
  onWebSocketClose: (event?: { code?: number }) => void = () => {};
  subscriptions: { destination: string; callback: (message: { body: string }) => void; active: boolean }[] = [];
  published: { destination: string; body: string }[] = [];

  activate() {}
  deactivate() {}
  subscribe(destination: string, callback: (message: { body: string }) => void) {
    const entry = { destination, callback, active: true };
    this.subscriptions.push(entry);
    return { unsubscribe: () => { entry.active = false; } };
  }
  publish(frame: { destination: string; body: string }) {
    this.published.push(frame);
  }
  connect() {
    this.connected = true;
    this.onConnect();
  }
  drop(code = 1006) {
    this.connected = false;
    this.onWebSocketClose({ code });
  }
}

describe('Realtime', () => {
  it('연결되면 등록된 구독을 붙이고 메시지를 JSON으로 넘긴다', () => {
    const fake = new FakeStomp();
    const realtime = new Realtime(() => fake);
    const received: unknown[] = [];
    realtime.subscribe('/topic/rooms/ABCDEF', (body) => received.push(body));

    fake.connect();
    fake.subscriptions[0].callback({ body: '{"code":"ABCDEF"}' });

    expect(fake.subscriptions.map((s) => s.destination)).toEqual(['/topic/rooms/ABCDEF']);
    expect(received).toEqual([{ code: 'ABCDEF' }]);
  });

  it('재연결되면 구독을 다시 붙이고 해제한 구독은 붙이지 않는다', () => {
    const fake = new FakeStomp();
    const realtime = new Realtime(() => fake);
    realtime.subscribe('/user/queue/game', () => {});
    const off = realtime.subscribe('/user/queue/errors', () => {});
    fake.connect();
    off();

    fake.drop();
    fake.connect();

    expect(fake.subscriptions.map((s) => s.destination)).toEqual(['/user/queue/game', '/user/queue/errors', '/user/queue/game']);
  });

  it('연결 상태를 알리고 끊겨 있으면 보내지 않는다', () => {
    const fake = new FakeStomp();
    const realtime = new Realtime(() => fake);
    const states: boolean[] = [];
    realtime.onConnectionChange((connected) => states.push(connected));

    expect(realtime.publish('/app/x', {})).toBe(false);
    fake.connect();
    expect(realtime.publish('/app/x', { type: 'READY' })).toBe(true);
    fake.drop();

    expect(fake.published).toEqual([{ destination: '/app/x', body: '{"type":"READY"}', headers: { 'content-type': 'application/json' } }]);
    expect(states).toEqual([true, false]);
  });

  it('닫힘 코드 4001이면 다른 곳에서 로그인했다고 알린다', () => {
    const fake = new FakeStomp();
    const realtime = new Realtime(() => fake);
    const replaced: number[] = [];
    const off = realtime.onSessionReplaced(() => replaced.push(1));
    fake.connect();

    fake.drop(1006);
    expect(replaced).toEqual([]);
    fake.connect();
    fake.drop(4001);
    expect(replaced).toEqual([1]);

    off();
    fake.connect();
    fake.drop(4001);
    expect(replaced).toEqual([1]);
  });
});
