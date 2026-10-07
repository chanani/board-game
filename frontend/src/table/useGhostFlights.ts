import { useReducedMotion } from 'motion/react';
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { ViewTransition } from '../games/gameModule';
import { useSound, type SoundName } from '../lib/sound';
import type { Rect } from './ghostGeometry';

export type Flight<Z extends string, C> = { card: C; from: Z; to: Z; delay: number; duration: number; flip: boolean };
export type FlightPlan<Z extends string, C> = { flights: Flight<Z, C>[]; sounds: { name: SoundName; delay: number }[] };
export type Ghost<C> = { id: number; width: number; card: C; from: Rect; to: Rect; delay: number; duration: number; flip: boolean };

const CLEANUP_PAD_MS = 50;

function measure(root: HTMLElement | null, attr: string, zone: string): Rect | null {
  const el = root?.querySelector<HTMLElement>(`[${attr}="${zone}"]`);
  if (!el) {
    return null;
  }
  const box = el.getBoundingClientRect();
  return box.width > 0 && box.height > 0 ? { x: box.left, y: box.top, width: box.width, height: box.height } : null;
}

function remember(root: HTMLElement | null, attr: string, cache: Map<string, Rect>) {
  root?.querySelectorAll<HTMLElement>(`[${attr}]`).forEach((el) => {
    const zone = el.getAttribute(attr) ?? '';
    const rect = measure(root, attr, zone);
    if (rect) {
      cache.set(zone, rect);
    }
  });
}

/**
 * 화면 전환마다 plan이 정한 카드 비행(유령 카드)과 소리를 낸다. 칸은 attr 값(예: data-uno-zone="discard")으로 찾고,
 * 지금 잴 수 없으면(손패가 비는 순간 등) 마지막으로 잰 자리를 쓴다. 동작 줄이기면 비행 없이 소리만.
 * plan은 렌더마다 바뀌지 않게 useCallback으로 넘긴다.
 */
export function useGhostFlights<V, Z extends string, C>(
  rootRef: RefObject<HTMLElement | null>,
  transition: ViewTransition<V> | null | undefined,
  plan: (from: V | null, to: V) => FlightPlan<Z, C>,
  attr: string,
  cardWidth: number,
  /** true면 고스트마다 제 비행이 끝나는 순간 지운다(내려앉은 카드가 다음 비행이 끝날 때까지 남아 보이지 않게). */
  dropLanded = false,
): { ghosts: Ghost<C>[] } {
  const { play } = useSound();
  const reduced = useReducedMotion() ?? false;
  const [ghosts, setGhosts] = useState<Ghost<C>[]>([]);
  const timers = useRef<number[]>([]);
  const nextId = useRef(1);
  const handled = useRef(0);
  const zones = useRef(new Map<string, Rect>());
  const playRef = useRef(play);
  playRef.current = play;

  useLayoutEffect(() => {
    if (!transition || !transition.animate || transition.seq <= handled.current) {
      remember(rootRef.current, attr, zones.current);
      return;
    }
    handled.current = transition.seq;
    const made = plan(transition.from, transition.to);
    made.sounds.forEach((sound) => {
      timers.current.push(window.setTimeout(() => playRef.current(sound.name), sound.delay));
    });
    const rectOf = (zone: Z) => measure(rootRef.current, attr, zone) ?? zones.current.get(zone) ?? null;
    const flying = reduced ? [] : made.flights.flatMap((flight) => {
      const from = rectOf(flight.from);
      const to = rectOf(flight.to);
      return from && to ? [{ id: nextId.current++, width: cardWidth, card: flight.card, from, to, delay: flight.delay, duration: flight.duration, flip: flight.flip }] : [];
    });
    remember(rootRef.current, attr, zones.current);
    if (flying.length === 0) {
      return;
    }
    setGhosts(flying);
    if (dropLanded) {
      flying.forEach((ghost) => {
        timers.current.push(window.setTimeout(() => setGhosts((current) => current.filter((one) => one.id !== ghost.id)), ghost.delay + ghost.duration));
      });
    }
    const end = Math.max(...flying.map((ghost) => ghost.delay + ghost.duration)) + CLEANUP_PAD_MS;
    timers.current.push(window.setTimeout(() => setGhosts([]), end));
  }, [transition, plan, attr, reduced, rootRef, cardWidth, dropLanded]);

  useLayoutEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  return { ghosts };
}
