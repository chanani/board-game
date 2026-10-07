import { useCallback, type RefObject } from 'react';
import type { UnoCard, UnoView } from '../../../api/types';
import { useGhostFlights, type Ghost } from '../../../table/useGhostFlights';
import type { ViewTransition } from '../../gameModule';
import { planUnoMotion } from './planUnoMotion';

export type { Rect } from './ghostGeometry';
export type UnoGhost = Ghost<UnoCard | null>;

export function useUnoMotion(rootRef: RefObject<HTMLElement | null>, transition: ViewTransition<UnoView> | null | undefined, meId: number, cardWidth = 64): { ghosts: UnoGhost[] } {
  const plan = useCallback((from: UnoView | null, to: UnoView) => planUnoMotion(from, to, meId), [meId]);
  return useGhostFlights(rootRef, transition, plan, 'data-uno-zone', cardWidth);
}
