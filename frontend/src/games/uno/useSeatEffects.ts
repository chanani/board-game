import { useCallback, useEffect, useRef, useState } from 'react';
import type { UnoEvent } from '../../api/types';

export const BUBBLE_MS = 1500;
export const SHAKE_MS = 600;
export const SKIP_MS = 800;

export type SeatEffect = { bubble: boolean; shake: boolean; skipped: boolean };
type Kind = keyof SeatEffect;

const NONE: SeatEffect = { bubble: false, shake: false, skipped: false };
const maxSeq = (events: UnoEvent[]) => events.reduce((max, event) => Math.max(max, event.seq), 0);

function targetOf(event: UnoEvent): { kind: Kind; id: number | null; ms: number } | null {
  if (event.type === 'UNO_CALL') {
    return { kind: 'bubble', id: event.actorId, ms: BUBBLE_MS };
  }
  if (event.type === 'UNO_CAUGHT') {
    return { kind: 'shake', id: event.targetId, ms: SHAKE_MS };
  }
  if (event.type === 'SKIP') {
    return { kind: 'skipped', id: event.targetId, ms: SKIP_MS };
  }
  return null;
}

/** 새 이벤트마다 자리에 잠깐 보이는 효과(우노 말풍선·흔들림·건너뛰기 표시)를 켜고 시간이 지나면 끈다. */
export function useSeatEffects(events: UnoEvent[]): Record<number, SeatEffect> {
  const [effects, setEffects] = useState<Record<number, SeatEffect>>({});
  const seen = useRef<number | null>(null);
  const timers = useRef(new Map<string, number>());
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  const set = useCallback((id: number, kind: Kind, value: boolean) => {
    setEffects((current) => ({ ...current, [id]: { ...(current[id] ?? NONE), [kind]: value } }));
  }, []);

  useEffect(() => {
    const latest = maxSeq(events);
    const previous = seen.current;
    // 새 판은 순번이 다시 시작하므로 줄어들면 기억만 되돌린다.
    seen.current = latest;
    if (previous === null || latest <= previous) {
      return;
    }
    events.filter((event) => event.seq > previous).forEach((event) => {
      const target = targetOf(event);
      if (!target || target.id === null) {
        return;
      }
      const id = target.id;
      set(id, target.kind, true);
      const key = `${id}:${target.kind}`;
      window.clearTimeout(timers.current.get(key));
      timers.current.set(key, window.setTimeout(() => set(id, target.kind, false), target.ms));
    });
  }, [events, set]);

  return effects;
}
