import { Client } from '@stomp/stompjs';

type Message = { body: string };
type Subscription = { unsubscribe: () => void };

export interface StompLike {
  connected: boolean;
  onConnect: () => void;
  onWebSocketClose: (event?: { code?: number }) => void;
  activate(): void;
  deactivate(): void;
  subscribe(destination: string, callback: (message: Message) => void): Subscription;
  publish(frame: { destination: string; body: string; headers?: Record<string, string> }): void;
}

type Handler = (body: unknown) => void;

/** 서버가 같은 계정의 새 로그인으로 이전 웹소켓을 닫을 때 쓰는 닫힘 코드. */
export const SESSION_REPLACED_CLOSE_CODE = 4001;
type Entry = { destination: string; handler: Handler; subscription?: Subscription };

export function createStompClient(): StompLike {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return new Client({
    brokerURL: `${protocol}://${window.location.host}/ws`,
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
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
      if (event?.code === SESSION_REPLACED_CLOSE_CODE) {
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
