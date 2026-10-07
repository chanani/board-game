import { useCallback, type RefObject } from 'react';
import type { OldMaidView, PlayingCard } from '../../../api/types';
import { useGhostFlights, type Ghost } from '../../../table/useGhostFlights';
import type { ViewTransition } from '../../gameModule';
import { planOldMaidMotion } from './planOldMaidMotion';

export type OldMaidGhost = Ghost<PlayingCard | null>;

export function useOldMaidMotion(rootRef: RefObject<HTMLElement | null>, transition: ViewTransition<OldMaidView> | null | undefined, meId: number, cardWidth: number): { ghosts: OldMaidGhost[] } {
  const plan = useCallback((from: OldMaidView | null, to: OldMaidView) => planOldMaidMotion(from, to, meId), [meId]);
  return useGhostFlights(rootRef, transition, plan, 'data-oldmaid-zone', cardWidth);
}
