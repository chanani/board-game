import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useToast } from '../components/Toast';
import { useRealtime } from '../realtime/RealtimeContext';
import { isEmoteId, type EmoteId } from './emotes';

/** 말풍선이 떠 있는 시간. 같은 사람이 새로 보내면 처음부터 다시 센다. */
export const EMOTE_BUBBLE_MS = 2500;
/** 보낸 뒤 이 시간 동안은 표정 버튼을 잠근다(서버도 잇단 표현을 막는다). */
export const EMOTE_COOLDOWN_MS = 1000;
const DISCONNECTED_MESSAGE = '연결이 끊겨 있어요. 잠시 후 다시 시도해 주세요.';

type EmotePush = { roomCode?: string; id: number; memberId: number; emote: string };
/** key는 서버가 매번 새로 주는 id라 같은 표정을 다시 보내도 말풍선이 다시 튀어나온다. */
export type EmoteBubbleState = { key: number; emote: EmoteId };

export type RoomEmotes = {
  bubbles: Map<number, EmoteBubbleState>;
  /** 보냈으면 true. 잠금 중이거나 연결이 끊겼으면 false. */
  send: (emote: EmoteId) => boolean;
  coolingDown: boolean;
};

/**
 * 방 감정 표현. 개인 큐로 오는 이 방의 표현만 사람별 말풍선으로 2.5초 띄운다(저장하지 않는다).
 * 오류(너무 빨리 보냄 등)는 /user/queue/errors로 오며 useRoomChannel이 조용히 넘긴다.
 */
export function useRoomEmotes(code: string, enabled: boolean): RoomEmotes {
  const { realtime } = useRealtime();
  const toast = useToast();
  const [bubbles, setBubbles] = useState<Map<number, EmoteBubbleState>>(() => new Map());
  const [coolingDown, setCoolingDown] = useState(false);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const coolTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((memberId: number, bubble: EmoteBubbleState) => {
    clearTimeout(timers.current.get(memberId));
    setBubbles((current) => new Map(current).set(memberId, bubble));
    timers.current.set(memberId, setTimeout(() => {
      timers.current.delete(memberId);
      setBubbles((current) => withoutMember(current, memberId));
    }, EMOTE_BUBBLE_MS));
  }, []);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const target = code.toUpperCase();
    return realtime.subscribe('/user/queue/emote', (body) => {
      const push = body as EmotePush;
      if (push.roomCode?.toUpperCase() !== target || !isEmoteId(push.emote)) {
        return;
      }
      show(push.memberId, { key: push.id, emote: push.emote });
    });
  }, [code, enabled, realtime, show]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      clearTimeout(coolTimer.current);
    };
  }, []);

  const send = useCallback(
    (emote: EmoteId) => {
      if (coolTimer.current !== undefined) {
        return false;
      }
      if (!realtime.publish(`/app/rooms/${code}/emote`, { emote })) {
        toast.show(DISCONNECTED_MESSAGE);
        return false;
      }
      setCoolingDown(true);
      coolTimer.current = setTimeout(() => {
        coolTimer.current = undefined;
        setCoolingDown(false);
      }, EMOTE_COOLDOWN_MS);
      return true;
    },
    [code, realtime, toast],
  );

  return { bubbles, send, coolingDown };
}

function withoutMember(current: Map<number, EmoteBubbleState>, memberId: number): Map<number, EmoteBubbleState> {
  const next = new Map(current);
  next.delete(memberId);
  return next;
}

/** 방 화면(RoomPage)이 채운다. 없으면(단독 테이블 테스트 등) 감정 표현 버튼·말풍선을 그리지 않는다. */
export const EmoteContext = createContext<RoomEmotes | null>(null);

export function useEmotes(): RoomEmotes | null {
  return useContext(EmoteContext);
}
