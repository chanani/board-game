import { useCallback, useEffect, useRef, useState } from 'react';
import { chatApi, type ChatMessage, type ChatPush } from '../api/chat';
import { useToast } from '../components/Toast';
import { useSound } from '../lib/sound';
import { useRealtime } from '../realtime/RealtimeContext';

const MAX_MESSAGES = 200;
/** 남의 메시지가 잇달아 와도 알림음은 이 간격 안에 한 번만 울린다. */
export const CHAT_SOUND_GAP_MS = 400;
const DISCONNECTED_MESSAGE = '연결이 끊겨 있어요. 잠시 후 다시 시도해 주세요.';

function merge(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  incoming.forEach((message) => byId.set(message.id, message));
  return Array.from(byId.values()).sort((a, b) => a.id - b.id).slice(-MAX_MESSAGES);
}

const strip = ({ id, memberId, nickname, text, sentAt, spectator }: ChatPush): ChatMessage => ({ id, memberId, nickname, text, sentAt, spectator });

/**
 * 방 채팅. 기록은 REST로 한 번 불러오고, 새 메시지는 개인 큐로 받아 이 방 것만 남긴다.
 * 오류(너무 빨리 보냄 등)는 /user/queue/errors로 오며 useRoomChannel이 이미 알려 준다.
 */
export function useRoomChat(code: string, enabled: boolean, meId?: number) {
  const { realtime, connected } = useRealtime();
  const toast = useToast();
  const notify = useChatSound(code, meId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  /** 지금 막 받은 메시지(기록 불러오기로는 바뀌지 않는다). 대기실 말풍선이 쓴다. */
  const [latest, setLatest] = useState<ChatMessage | null>(null);
  const droppedRef = useRef(false);
  const [reloadSeq, setReloadSeq] = useState(0);

  useEffect(() => {
    setMessages([]);
    setLatest(null);
  }, [code]);

  // 연결이 끊긴 동안 놓친 메시지는 다시 연결되면 기록으로 채운다.
  useEffect(() => {
    if (!connected) {
      droppedRef.current = true;
      return;
    }
    if (droppedRef.current) {
      droppedRef.current = false;
      setReloadSeq((current) => current + 1);
    }
  }, [connected]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    let cancelled = false;
    chatApi
      .history(code)
      .then((history) => {
        if (cancelled) {
          return;
        }
        setMessages((current) => merge(current, history));
      })
      .catch(() => undefined); // 방에서 나간 경우 등은 방 채널이 알리고 화면을 옮긴다.
    return () => {
      cancelled = true;
    };
  }, [code, enabled, reloadSeq]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const target = code.toUpperCase();
    return realtime.subscribe('/user/queue/chat', (body) => {
      const push = body as ChatPush;
      if (push.roomCode?.toUpperCase() !== target) {
        return;
      }
      const message = strip(push);
      setMessages((current) => merge(current, [message]));
      setLatest(message);
      notify(message);
    });
  }, [code, enabled, realtime, notify]);

  const send = useCallback(
    (text: string) => {
      if (realtime.publish(`/app/rooms/${code}/chat`, { text })) {
        return true;
      }
      toast.show(DISCONNECTED_MESSAGE);
      return false;
    },
    [code, realtime, toast],
  );

  return { messages, latest, send };
}

/**
 * 실시간으로 막 도착한 남의 메시지에만 '톡' 알림음을 낸다. 기록 불러오기·재연결 동기화는 이 길을 거치지 않아 울리지 않는다.
 * 같은 메시지가 두 번 와도 한 번만, 잇달아 오면 400ms 안의 것은 건너뛴다. 소리 켜기/끄기·음량은 useSound가 따른다.
 */
function useChatSound(code: string, meId: number | undefined) {
  const { play } = useSound();
  const playRef = useRef(play);
  const meRef = useRef(meId);
  const lastAt = useRef(Number.NEGATIVE_INFINITY);
  const lastId = useRef(0);
  useEffect(() => {
    playRef.current = play;
    meRef.current = meId;
  });
  useEffect(() => {
    lastId.current = 0;
  }, [code]);
  return useCallback((message: ChatMessage) => {
    const fresh = message.id > lastId.current;
    lastId.current = Math.max(lastId.current, message.id);
    if (!fresh || message.memberId === meRef.current) {
      return;
    }
    const now = Date.now();
    if (now - lastAt.current < CHAT_SOUND_GAP_MS) {
      return;
    }
    lastAt.current = now;
    playRef.current('chat');
  }, []);
}
