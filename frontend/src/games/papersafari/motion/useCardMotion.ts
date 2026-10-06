import { useReducedMotion } from 'motion/react';
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { CardView } from '../../../api/types';
import { useSound, type SoundName } from '../../../lib/sound';
import type { ViewTransition } from '../../../room/useRoomChannel';
import { inferMoves, type Move } from './inferMoves';
import { slotZone, zoneKey, DECK, type Zone } from './zones';

export const TRAVEL_MS = 420;
export const DEAL_STEP_MS = 50;
export const MAX_DEAL_MS = 1500;
export const LIFT_MS = 800;

export type Rect = { x: number; y: number; width: number; height: number };
export type Ghost = { id: number; card: CardView | null; from: Rect; to: Rect; delay: number };

type Flight = { card: CardView | null; from: Zone; to: Zone; delay: number };
type Plan = { flights: Flight[]; sounds: { name: SoundName; delay: number }[]; lifts: string[] };

const EMPTY: ReadonlySet<string> = new Set();

function rectOf(root: HTMLElement | null, zone: Zone): Rect | null {
  const el = root?.querySelector<HTMLElement>(`[data-zone="${zoneKey(zone)}"]`);
  if (!el) {
    return null;
  }
  const box = el.getBoundingClientRect();
  return { x: box.left, y: box.top, width: box.width, height: box.height };
}

function hasArea(rect: Rect): boolean {
  return rect.width > 0 && rect.height > 0;
}

function sizedLike(rect: Rect, model: Rect): Rect {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  return { x: cx - model.width / 2, y: cy - model.height / 2, width: model.width, height: model.height };
}

// 빈 손 영역처럼 크기가 0인 쪽은 반대쪽 카드 크기로, 그 중심에 맞춘다. 양쪽 다 0이면 날릴 수 없다.
export function normalizeEnds(from: Rect | null, to: Rect | null): { from: Rect; to: Rect } | null {
  if (!from || !to) {
    return null;
  }
  if (hasArea(from) && hasArea(to)) {
    return { from, to };
  }
  if (hasArea(to)) {
    return { from: sizedLike(from, to), to };
  }
  if (hasArea(from)) {
    return { from, to: sizedLike(to, from) };
  }
  return null;
}

function soundOfTravel(move: Extract<Move, { kind: 'travel' }>): SoundName {
  return move.from.kind === 'deck' || move.from.kind === 'discard' ? 'draw' : 'place';
}

function dealTargets(playerIds: number[]): Zone[] {
  return playerIds.flatMap((id) => [0, 1, 2].flatMap((column) => [0, 1].map((row) => slotZone(id, column, row))));
}

function planOf(moves: Move[]): Plan {
  const plan: Plan = { flights: [], sounds: [], lifts: [] };
  let clock = 0;
  moves.forEach((move) => {
    if (move.kind === 'travel') {
      plan.flights.push({ card: move.card, from: move.from, to: move.to, delay: clock });
      plan.sounds.push({ name: soundOfTravel(move), delay: clock });
      clock += TRAVEL_MS;
      return;
    }
    if (move.kind === 'deal') {
      const targets = dealTargets(move.playerIds);
      const step = Math.min(DEAL_STEP_MS, MAX_DEAL_MS / Math.max(targets.length, 1));
      targets.forEach((to, index) => {
        plan.flights.push({ card: null, from: DECK, to, delay: clock + index * step });
        if (index % 2 === 0 && index < 12) {
          plan.sounds.push({ name: 'draw', delay: clock + index * step });
        }
      });
      clock += targets.length * step + TRAVEL_MS;
      return;
    }
    if (move.kind === 'peek') {
      plan.lifts.push(zoneKey(move.at));
    }
    plan.sounds.push({ name: 'flip', delay: clock });
  });
  return plan;
}

function movesFor(transition: ViewTransition, reduced: boolean): Move[] {
  const moves = inferMoves(transition.from, transition.to);
  const kept = transition.animate ? moves : moves.filter((move) => move.kind === 'deal');
  return reduced ? kept.filter((move) => move.kind !== 'deal') : kept;
}

export function useCardMotion(containerRef: RefObject<HTMLElement | null>, transition: ViewTransition | null, resetKey = 0) {
  const { play } = useSound();
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(EMPTY);
  const [lifted, setLifted] = useState<ReadonlySet<string>>(EMPTY);
  const reduced = useReducedMotion() ?? false;
  const timers = useRef<number[]>([]);
  const nextId = useRef(1);
  const playRef = useRef(play);
  playRef.current = play;

  useLayoutEffect(() => {
    const clearAll = () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current = [];
    };
    clearAll();
    setGhosts([]);
    setHidden(EMPTY);
    setLifted(EMPTY);
    if (!transition) {
      return undefined;
    }
    const plan = planOf(movesFor(transition, reduced));
    const root = containerRef.current;
    const flights = plan.flights.flatMap((flight) => {
      const ends = normalizeEnds(rectOf(root, flight.from), rectOf(root, flight.to));
      return ends ? [{ ...flight, fromRect: ends.from, toRect: ends.to, id: nextId.current++ }] : [];
    });
    if (flights.length > 0) {
      setGhosts(flights.map((flight) => ({ id: flight.id, card: flight.card, from: flight.fromRect, to: flight.toRect, delay: flight.delay })));
      setHidden(new Set(flights.map((flight) => zoneKey(flight.to))));
    }
    flights.forEach((flight) => {
      const key = zoneKey(flight.to);
      const landsLater = flights.some((other) => other.id !== flight.id && other.delay > flight.delay && zoneKey(other.to) === key);
      timers.current.push(window.setTimeout(() => {
        setGhosts((current) => current.filter((ghost) => ghost.id !== flight.id));
        if (landsLater) {
          return;
        }
        setHidden((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
      }, flight.delay + TRAVEL_MS));
    });
    if (plan.lifts.length > 0) {
      setLifted(new Set(plan.lifts));
      timers.current.push(window.setTimeout(() => setLifted(EMPTY), LIFT_MS));
    }
    plan.sounds.forEach((sound) => {
      timers.current.push(window.setTimeout(() => playRef.current(sound.name), sound.delay));
    });
    return clearAll;
  }, [transition, containerRef, reduced]);

  // 서버 오류가 오면 진행 중인 연출을 바로 끝낸다.
  const lastReset = useRef(resetKey);
  useLayoutEffect(() => {
    if (lastReset.current === resetKey) {
      return;
    }
    lastReset.current = resetKey;
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    setGhosts([]);
    setHidden(EMPTY);
    setLifted(EMPTY);
  }, [resetKey]);

  return { ghosts, hidden, lifted };
}
