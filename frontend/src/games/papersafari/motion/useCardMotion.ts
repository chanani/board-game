import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { CardView } from '../../../api/types';
import { useSound, type SoundName } from '../../../lib/sound';
import type { ViewTransition } from '../../../room/useRoomChannel';
import { inferMoves, type Move } from './inferMoves';
import { slotZone, zoneKey, DECK, type Zone } from './zones';

export const TRAVEL_MS = 420;
export const DEAL_STEP_MS = 50;
export const MAX_DEAL_MS = 1500;

export type Rect = { x: number; y: number; width: number; height: number };
export type Ghost = { id: number; card: CardView | null; from: Rect; to: Rect; delay: number };

type Flight = { card: CardView | null; from: Zone; to: Zone; delay: number };
type Plan = { flights: Flight[]; sounds: { name: SoundName; delay: number }[] };

const EMPTY: ReadonlySet<string> = new Set();

function rectOf(root: HTMLElement | null, zone: Zone): Rect | null {
  const el = root?.querySelector<HTMLElement>(`[data-zone="${zoneKey(zone)}"]`);
  if (!el) {
    return null;
  }
  const box = el.getBoundingClientRect();
  return { x: box.left, y: box.top, width: box.width, height: box.height };
}

function soundOfTravel(move: Extract<Move, { kind: 'travel' }>): SoundName {
  return move.from.kind === 'deck' || move.from.kind === 'discard' ? 'draw' : 'place';
}

function dealTargets(playerIds: number[]): Zone[] {
  return playerIds.flatMap((id) => [0, 1, 2].flatMap((column) => [0, 1].map((row) => slotZone(id, column, row))));
}

function planOf(moves: Move[]): Plan {
  const plan: Plan = { flights: [], sounds: [] };
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
    plan.sounds.push({ name: 'flip', delay: clock });
  });
  return plan;
}

function movesFor(transition: ViewTransition): Move[] {
  const moves = inferMoves(transition.from, transition.to);
  return transition.animate ? moves : moves.filter((move) => move.kind === 'deal');
}

export function useCardMotion(containerRef: RefObject<HTMLElement | null>, transition: ViewTransition | null) {
  const { play } = useSound();
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(EMPTY);
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
    if (!transition) {
      return undefined;
    }
    const plan = planOf(movesFor(transition));
    const root = containerRef.current;
    const flights = plan.flights.flatMap((flight) => {
      const from = rectOf(root, flight.from);
      const to = rectOf(root, flight.to);
      return from && to ? [{ ...flight, fromRect: from, toRect: to, id: nextId.current++ }] : [];
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
    plan.sounds.forEach((sound) => {
      timers.current.push(window.setTimeout(() => playRef.current(sound.name), sound.delay));
    });
    return clearAll;
  }, [transition, containerRef]);

  return { ghosts, hidden };
}
