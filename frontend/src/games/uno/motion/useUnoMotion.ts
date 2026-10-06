import { useReducedMotion } from 'motion/react';
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { UnoCard, UnoView } from '../../../api/types';
import { useSound } from '../../../lib/sound';
import type { ViewTransition } from '../../gameModule';
import { type Rect } from './ghostGeometry';
import { planUnoMotion, type UnoZone } from './planUnoMotion';

export type { Rect };
export type UnoGhost = { id: number; width: number; card: UnoCard | null; from: Rect; to: Rect; delay: number; duration: number; flip: boolean };

const CLEANUP_PAD_MS = 50;

function measure(root: HTMLElement | null, zone: string): Rect | null {
  const el = root?.querySelector<HTMLElement>(`[data-uno-zone="${zone}"]`);
  if (!el) {
    return null;
  }
  const box = el.getBoundingClientRect();
  return box.width > 0 && box.height > 0 ? { x: box.left, y: box.top, width: box.width, height: box.height } : null;
}

/** 지금 잴 수 없으면(마지막 카드를 내서 손패가 비는 순간 등) 마지막으로 잰 자리를 쓴다. */
function rectOf(root: HTMLElement | null, zone: UnoZone, cache: Map<string, Rect>): Rect | null {
  return measure(root, zone) ?? cache.get(zone) ?? null;
}

function remember(root: HTMLElement | null, cache: Map<string, Rect>) {
  root?.querySelectorAll<HTMLElement>('[data-uno-zone]').forEach((el) => {
    const zone = el.getAttribute('data-uno-zone') ?? '';
    const rect = measure(root, zone);
    if (rect) {
      cache.set(zone, rect);
    }
  });
}

export function useUnoMotion(rootRef: RefObject<HTMLElement | null>, transition: ViewTransition<UnoView> | null | undefined, meId: number, cardWidth = 64): { ghosts: UnoGhost[] } {
  const { play } = useSound();
  const reduced = useReducedMotion() ?? false;
  const [ghosts, setGhosts] = useState<UnoGhost[]>([]);
  const timers = useRef<number[]>([]);
  const nextId = useRef(1);
  const handled = useRef(0);
  const zones = useRef(new Map<string, Rect>());
  const playRef = useRef(play);
  playRef.current = play;

  useLayoutEffect(() => {
    if (!transition || !transition.animate || transition.seq <= handled.current) {
      remember(rootRef.current, zones.current);
      return;
    }
    handled.current = transition.seq;
    const plan = planUnoMotion(transition.from, transition.to, meId);
    plan.sounds.forEach((sound) => {
      timers.current.push(window.setTimeout(() => playRef.current(sound.name), sound.delay));
    });
    const made = reduced ? [] : plan.flights.flatMap((flight) => {
      const from = rectOf(rootRef.current, flight.from, zones.current);
      const to = rectOf(rootRef.current, flight.to, zones.current);
      return from && to ? [{ id: nextId.current++, width: cardWidth, card: flight.card, from, to, delay: flight.delay, duration: flight.duration, flip: flight.flip }] : [];
    });
    remember(rootRef.current, zones.current);
    if (made.length === 0) {
      return;
    }
    setGhosts(made);
    const end = Math.max(...made.map((ghost) => ghost.delay + ghost.duration)) + CLEANUP_PAD_MS;
    timers.current.push(window.setTimeout(() => setGhosts([]), end));
  }, [transition, meId, reduced, rootRef, cardWidth]);

  useLayoutEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  return { ghosts };
}
