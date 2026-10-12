import { describe, expect, it } from 'vitest';
import { createStompClient, HEARTBEAT_MS, Realtime, type StompLike } from './Realtime';

class FakeStomp implements StompLike {
  connected = false;
  onConnect: () => void = () => {};
  onWebSocketClose: (event?: { code?: number; reason?: string }) => void = () => {};
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
  drop(code = 1006, reason = '') {
    this.connected = false;
    this.onWebSocketClose({ code, reason });
  }
}

describe('createStompClient', () => {
  it('하트비트를 서버와 같은 간격(2.5초)으로 주고받고, 세 번 놓치면 멈춘 연결을 기다리지 않고 버린다', () => {
    const client = createStompClient() as unknown as Record<string, unknown>;

    expect(HEARTBEAT_MS).toBe(2500);
    expect(client.heartbeatIncoming).toBe(HEARTBEAT_MS);
    expect(client.heartbeatOutgoing).toBe(HEARTBEAT_MS);
    expect(client.heartbeatToleranceMultiplier).toBe(3);
    expect(client.discardWebsocketOnCommFailure).toBe(true);
  });
});

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
    fake.drop(4001, 'SESSION_REPLACED');
    expect(replaced).toEqual([1]);

    off();
    fake.connect();
    fake.drop(4001, 'SESSION_REPLACED');
    expect(replaced).toEqual([1]);
  });

  it('멈춘 연결을 버릴 때 stompjs가 쓰는 4001은 다른 곳 로그인으로 보지 않는다', () => {
    const fake = new FakeStomp();
    const realtime = new Realtime(() => fake);
    const replaced: number[] = [];
    const states: boolean[] = [];
    realtime.onSessionReplaced(() => replaced.push(1));
    realtime.onConnectionChange((connected) => states.push(connected));
    fake.connect();

    fake.drop(4001, 'Quick discarding socket (#123456) without waiting for the shutdown sequence.');

    expect(replaced).toEqual([]);
    expect(states).toEqual([true, false]);
  });
});
