import { Client, TickerStrategy } from '@stomp/stompjs';

type Message = { body: string };
type Subscription = { unsubscribe: () => void };

export interface StompLike {
  connected: boolean;
  onConnect: () => void;
  onWebSocketClose: (event?: { code?: number; reason?: string }) => void;
  activate(): void;
  deactivate(): void;
  subscribe(destination: string, callback: (message: Message) => void): Subscription;
  publish(frame: { destination: string; body: string; headers?: Record<string, string> }): void;
}

type Handler = (body: unknown) => void;

/** 서버가 같은 계정의 새 로그인으로 이전 웹소켓을 닫을 때 쓰는 닫힘 코드와 이유. */
export const SESSION_REPLACED_CLOSE_CODE = 4001;
export const SESSION_REPLACED_REASON = 'SESSION_REPLACED';

/**
 * 하트비트 간격(ms). 서버(WebSocketConfig.HEARTBEAT)와 같은 값이다.
 * 서버는 이 간격마다 "그동안 보낸 게 없으면" 하트비트를 보내므로 정상일 때도 공백이 5초까지 벌어진다.
 * 그래서 세 배(7.5초) 넘게 조용할 때만 끊긴 것으로 보고, 확인도 이 간격마다 하므로 멈춘 연결은 7.5~10초 안에 알아챈다.
 */
export const HEARTBEAT_MS = 2500;
const HEARTBEAT_TOLERANCE = 3;
type Entry = { destination: string; handler: Handler; subscription?: Subscription };

export function createStompClient(): StompLike {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return new Client({
    brokerURL: `${protocol}://${window.location.host}/ws`,
    reconnectDelay: 3000,
    heartbeatIncoming: HEARTBEAT_MS,
    heartbeatOutgoing: HEARTBEAT_MS,
    heartbeatToleranceMultiplier: HEARTBEAT_TOLERANCE,
    // 가려진 탭은 타이머가 느려져 하트비트를 제때 못 보낸다. 워커에서 보내 서버가 살아 있는 연결을 닫지 않게 한다.
    heartbeatStrategy: TickerStrategy.Worker,
    // 멈춘 연결은 닫기 인사를 기다려도 답이 없다. 기다리지 않고 버린 뒤 바로 다시 연결한다.
    discardWebsocketOnCommFailure: true,
  }) as unknown as StompLike;
}

export class Realtime {
  private readonly client: StompLike;
  private readonly entries = new Map<number, Entry>();
  private readonly listeners = new Set<(connected: boolean) => void>();
  private readonly replacedListeners = new Set<() => void>();
  private nextId = 1;

  constructor(factory: () => StompLike = createStompClient) {
    this.client = factory();
    this.client.onConnect = () => {
      this.entries.forEach((entry) => this.attach(entry));
      this.emit(true);
    };
    this.client.onWebSocketClose = (event) => {
      this.emit(false);
      // 멈춘 연결을 버릴 때 stompjs도 4001을 쓰므로 서버가 보낸 이유까지 본다.
      if (event?.code === SESSION_REPLACED_CLOSE_CODE && event.reason === SESSION_REPLACED_REASON) {
        this.replacedListeners.forEach((listener) => listener());
      }
    };
  }

  start(): void {
    this.client.activate();
  }

  stop(): void {
    this.client.deactivate();
  }

  isConnected(): boolean {
    return this.client.connected;
  }

  subscribe(destination: string, handler: Handler): () => void {
    const id = this.nextId++;
    const entry: Entry = { destination, handler };
    this.entries.set(id, entry);
    if (this.client.connected) {
      this.attach(entry);
    }
    return () => {
      entry.subscription?.unsubscribe();
      this.entries.delete(id);
    };
  }

  publish(destination: string, body: unknown): boolean {
    if (!this.client.connected) {
      return false;
    }
    this.client.publish({ destination, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
    return true;
  }

  onConnectionChange(listener: (connected: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onSessionReplaced(listener: () => void): () => void {
    this.replacedListeners.add(listener);
    return () => {
      this.replacedListeners.delete(listener);
    };
  }

  private attach(entry: Entry): void {
    entry.subscription = this.client.subscribe(entry.destination, (message) => entry.handler(JSON.parse(message.body)));
  }

  private emit(connected: boolean): void {
    this.listeners.forEach((listener) => listener(connected));
  }
}
