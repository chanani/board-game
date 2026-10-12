import { Client, TickerStrategy } from '@stomp/stompjs';

type Message = { body: string };
type Subscription = { unsubscribe: () => void };
type FrameSource = { addEventListener(type: 'message', listener: () => void): void };

export interface StompLike {
  connected: boolean;
  onConnect: () => void;
  onWebSocketClose: (event?: { code?: number; reason?: string }) => void;
  activate(): void;
  deactivate(): void;
  /** 지금 소켓을 버리고 다시 연결하게 한다(닫힘 알림 → reconnectDelay 뒤 재연결). */
  forceDisconnect(): void;
  /** 지금 연결의 소켓. 받은 프레임(하트비트 포함)을 세는 데만 쓴다. */
  webSocket?: FrameSource;
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
/** 정상 연결은 5초 안에 하트비트라도 온다. 그보다 조금 더 조용했으면 돌아온 화면·네트워크에서 그 연결을 믿지 않는다. */
export const STALE_AFTER_MS = 6000;
/** 끊긴 뒤 다시 연결을 시도하기까지. 15초 차례에서 3초는 길어 1초로 둔다. */
export const RECONNECT_DELAY_MS = 1000;
/** 연결 시도가 이 시간 안에 끝나지 않으면(멈춘 네트워크) 버리고 다시 시도한다. */
const CONNECTION_TIMEOUT_MS = 4000;
type Entry = { destination: string; handler: Handler; subscription?: Subscription };

export function createStompClient(): StompLike {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return new Client({
    brokerURL: `${protocol}://${window.location.host}/ws`,
    reconnectDelay: RECONNECT_DELAY_MS,
    connectionTimeout: CONNECTION_TIMEOUT_MS,
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
  private lastFrameAt = 0;

  constructor(factory: () => StompLike = createStompClient) {
    this.client = factory();
    this.client.onConnect = () => {
      this.watchFrames();
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

  /** 연결돼 있지 않거나, 연결돼 있다는데 한동안 아무 프레임도 오지 않았으면 true. */
  isStale(now: number = Date.now()): boolean {
    return !this.client.connected || now - this.lastFrameAt > STALE_AFTER_MS;
  }

  /**
   * 지금 연결을 버리고 다시 연결한다. 바로 끊김을 알리므로 안내 배너가 뜨고, 다시 붙으면 구독과 방·게임 화면 동기화가 따라온다.
   * 이미 끊겨 다시 연결하는 중이면 아무것도 하지 않고 false.
   */
  reconnect(): boolean {
    if (!this.client.connected) {
      return false;
    }
    this.client.forceDisconnect();
    return true;
  }

  /** 화면이 다시 보이거나 네트워크가 돌아왔을 때 부른다. 연결이 멈춰 있었으면 다시 연결한다. */
  recover(now: number = Date.now()): boolean {
    if (!this.isStale(now)) {
      return false;
    }
    return this.reconnect();
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

  /** 새 연결의 소켓에서 오는 모든 프레임(하트비트 포함)의 시각을 적는다. 버려진 옛 소켓의 늦은 프레임은 세지 않는다. */
  private watchFrames(): void {
    const socket = this.client.webSocket;
    this.lastFrameAt = Date.now();
    socket?.addEventListener('message', () => {
      if (this.client.webSocket === socket) {
        this.lastFrameAt = Date.now();
      }
    });
  }

  private attach(entry: Entry): void {
    entry.subscription = this.client.subscribe(entry.destination, (message) => entry.handler(JSON.parse(message.body)));
  }

  private emit(connected: boolean): void {
    this.listeners.forEach((listener) => listener(connected));
  }
}
