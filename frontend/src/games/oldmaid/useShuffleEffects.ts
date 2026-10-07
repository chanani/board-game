import { useEffect, useRef, useState } from 'react';
import type { OldMaidEvent } from '../../api/types';
import { latestSeq } from './describe';

export const SHUFFLE_MS = 600;

/** 새 섞기 이벤트의 사람을 0.6초 동안 돌려준다(자리 부채가 섞이는 모양). 처음 받은 화면은 보이지 않는다. */
export function useShuffleEffects(events: OldMaidEvent[]): Set<number> {
  const [active, setActive] = useState<Set<number>>(() => new Set());
  const seen = useRef<number | null>(null);
  const timers = useRef(new Map<number, number>());
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  useEffect(() => {
    const latest = latestSeq(events);
    const previous = seen.current;
    // 새 판은 순번이 다시 시작하므로 줄어들면 기억만 되돌린다.
    seen.current = latest;
    if (previous === null || latest <= previous) {
      return;
    }
    events
      .filter((event) => event.seq > previous && event.type === 'SHUFFLE' && event.actorId !== null)
      .forEach((event) => {
        const id = event.actorId as number;
        setActive((current) => new Set(current).add(id));
        window.clearTimeout(timers.current.get(id));
        timers.current.set(id, window.setTimeout(() => setActive((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        }), SHUFFLE_MS));
      });
  }, [events]);

  return active;
}
