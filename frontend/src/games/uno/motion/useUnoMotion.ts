import { useReducedMotion } from 'motion/react';
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { UnoCard, UnoView } from '../../../api/types';
import { useSound } from '../../../lib/sound';
import type { ViewTransition } from '../../gameModule';
import { planUnoMotion, type UnoZone } from './planUnoMotion';

export type Rect = { x: number; y: number; width: number; height: number };
export type UnoGhost = { id: number; card: UnoCard | null; from: Rect; to: Rect; delay: number; duration: number; flip: boolean };

const CLEANUP_PAD_MS = 50;

function rectOf(root: HTMLElement | null, zone: UnoZone): Rect | null {
  const el = root?.querySelector<HTMLElement>(`[data-uno-zone="${zone}"]`);
  if (!el) {
    return null;
  }
  const box = el.getBoundingClientRect();
  return box.width > 0 && box.height > 0 ? { x: box.left, y: box.top, width: box.width, height: box.height } : null;
}

export function useUnoMotion(rootRef: RefObject<HTMLElement | null>, transition: ViewTransition<UnoView> | null | undefined, meId: number): { ghosts: UnoGhost[] } {
  const { play } = useSound();
  const reduced = useReducedMotion() ?? false;
  const [ghosts, setGhosts] = useState<UnoGhost[]>([]);
  const timers = useRef<number[]>([]);
  const nextId = useRef(1);
  const handled = useRef(0);
  const playRef = useRef(play);
  playRef.current = play;

  useLayoutEffect(() => {
    if (!transition || !transition.animate || transition.seq <= handled.current) {
      return;
    }
    handled.current = transition.seq;
    const plan = planUnoMotion(transition.from, transition.to, meId);
    plan.sounds.forEach((sound) => {
      timers.current.push(window.setTimeout(() => playRef.current(sound.name), sound.delay));
    });
    if (reduced) {
      return;
    }
    const made = plan.flights.flatMap((flight) => {
      const from = rectOf(rootRef.current, flight.from);
      const to = rectOf(rootRef.current, flight.to);
      return from && to ? [{ id: nextId.current++, card: flight.card, from, to, delay: flight.delay, duration: flight.duration, flip: flight.flip }] : [];
    });
    if (made.length === 0) {
      return;
    }
    setGhosts(made);
    const end = Math.max(...made.map((ghost) => ghost.delay + ghost.duration)) + CLEANUP_PAD_MS;
    timers.current.push(window.setTimeout(() => setGhosts([]), end));
  }, [transition, meId, reduced, rootRef]);

  useLayoutEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  return { ghosts };
}
