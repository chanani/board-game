import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { chatApi, type ChatMessage, type ChatPush } from '../api/chat';
import { useToast } from '../components/Toast';
import { useRealtime } from '../realtime/RealtimeContext';

const MAX_MESSAGES = 200;
const DISCONNECTED_MESSAGE = '연결이 끊겨 있어요. 잠시 후 다시 시도해 주세요.';

type Options = { meId?: number };

function merge(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  incoming.forEach((message) => byId.set(message.id, message));
  return Array.from(byId.values()).sort((a, b) => a.id - b.id).slice(-MAX_MESSAGES);
}

const lastIdOf = (messages: ChatMessage[]) => messages.at(-1)?.id ?? 0;

const strip = ({ id, memberId, nickname, text, sentAt, spectator }: ChatPush): ChatMessage => ({ id, memberId, nickname, text, sentAt, spectator });

/**
 * 방 채팅. 기록은 REST로 한 번 불러오고, 새 메시지는 개인 큐로 받아 이 방 것만 남긴다.
 * 오류(너무 빨리 보냄 등)는 /user/queue/errors로 오며 useRoomChannel이 이미 알려 준다.
 */
export function useRoomChat(code: string, enabled: boolean, { meId }: Options = {}) {
  const { realtime, connected } = useRealtime();
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  /** 지금 막 받은 메시지(기록 불러오기로는 바뀌지 않는다). 대기실 말풍선이 쓴다. */
  const [latest, setLatest] = useState<ChatMessage | null>(null);
  const [readId, setReadId] = useState(0);
  const droppedRef = useRef(false);
  const initializedRef = useRef(false);
  const [reloadSeq, setReloadSeq] = useState(0);

  useEffect(() => {
    setMessages([]);
    setLatest(null);
    setReadId(0);
    initializedRef.current = false;
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
        // 처음 불러온 기록만 이미 지나간 대화로 보고 읽음 처리한다. 다시 연결돼 새로 불러온 기록은 건드리지 않는다.
        if (!initializedRef.current) {
          initializedRef.current = true;
          setReadId((current) => Math.max(current, lastIdOf(history)));
        }
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
    });
  }, [code, enabled, realtime]);

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

  const unread = useMemo(
    () => messages.filter((message) => message.id > readId && message.memberId !== meId).length,
    [messages, readId, meId],
  );

  const markRead = useCallback(() => {
    setReadId((current) => Math.max(current, lastIdOf(messages)));
  }, [messages]);

  return { messages, latest, send, unread, markRead };
}
