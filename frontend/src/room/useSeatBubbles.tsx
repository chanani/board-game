import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { ChatMessage } from '../api/chat';

/** 말풍선이 떠 있는 시간. 같은 사람이 새로 말하면 처음부터 다시 센다. */
export const SEAT_BUBBLE_MS = 4000;

/** key는 메시지 id라 새 말이면 말풍선을 다시 튀어나오게 한다. */
type Bubble = { key: number; text: string };
export type SeatBubbles = Map<number, Bubble>;

/**
 * 대기실 채팅 말풍선 상태. 지금 막 받은 메시지(latest)만 쓰고, 관전자의 말은 띄우지 않는다.
 * 사람마다 타이머를 하나씩 두고 4초 뒤 지운다.
 */
export function useSeatBubbles(latest: ChatMessage | null): SeatBubbles {
  const [bubbles, setBubbles] = useState<SeatBubbles>(() => new Map());
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  // 다시 마운트될 때(게임이 끝나 대기실로 돌아올 때 등) 이미 받은 지난 메시지는 띄우지 않는다.
  const shownId = useRef<number | null>(latest?.id ?? null);

  useEffect(() => {
    if (!latest || latest.spectator || shownId.current === latest.id) {
      return;
    }
    shownId.current = latest.id;
    const { memberId } = latest;
    clearTimeout(timers.current.get(memberId));
    setBubbles((current) => new Map(current).set(memberId, { key: latest.id, text: latest.text }));
    timers.current.set(memberId, setTimeout(() => {
      timers.current.delete(memberId);
      setBubbles((current) => withoutMember(current, memberId));
    }, SEAT_BUBBLE_MS));
  }, [latest]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  return bubbles;
}

function withoutMember(current: SeatBubbles, memberId: number): SeatBubbles {
  const next = new Map(current);
  next.delete(memberId);
  return next;
}

/**
 * 자리(아바타) 위에 뜨는 크림색 말풍선. 채팅창에 같은 말이 있으니 장식으로 숨긴다(aria-hidden).
 * 동작 줄이기 설정은 App의 MotionConfig가 따른다.
 */
/** 맨 위 자리는 펠트 가장자리에 가까우니 한 줄(lines=1)만 보여 펠트 밖으로 덜 솟게 한다. */
export function SeatBubble({ memberId, bubble, lines = 2 }: { memberId: number; bubble?: Bubble; lines?: 1 | 2 }) {
  if (!bubble) {
    return null;
  }
  return (
    <motion.span key={bubble.key} aria-hidden="true"
      initial={{ opacity: 0, scale: 0.6, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', bounce: 0.45, duration: 0.35 }}
      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-[160px] -translate-x-1/2 origin-bottom">
      <span data-testid={`seat-bubble-${memberId}`} aria-hidden="true" className={`${lines === 1 ? 'line-clamp-1' : 'line-clamp-2'} block max-w-[160px] break-words rounded-xl bg-[#fffaf0] px-2.5 py-1 text-center text-[11px] leading-snug font-semibold text-[#2e1d10] shadow-[0_4px_10px_rgb(0_0_0/0.3)]`}>
        {bubble.text}
      </span>
      <span aria-hidden="true" className="absolute left-1/2 top-full -translate-x-1/2 border-x-[6px] border-t-[6px] border-x-transparent border-t-[#fffaf0]" />
    </motion.span>
  );
}
