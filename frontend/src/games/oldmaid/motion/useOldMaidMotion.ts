import { useCallback, type RefObject } from 'react';
import type { OldMaidView, PlayingCard } from '../../../api/types';
import { useGhostFlights, type Ghost } from '../../../table/useGhostFlights';
import type { ViewTransition } from '../../gameModule';
import { planOldMaidMotion } from './planOldMaidMotion';

export type OldMaidGhost = Ghost<PlayingCard | null>;

export function useOldMaidMotion(rootRef: RefObject<HTMLElement | null>, transition: ViewTransition<OldMaidView> | null | undefined, meId: number, cardWidth: number): { ghosts: OldMaidGhost[] } {
  const plan = useCallback((from: OldMaidView | null, to: OldMaidView) => planOldMaidMotion(from, to, meId), [meId]);
  // 뽑은 카드가 내려앉은 뒤 짝이 버린 더미로 날아가는 동안 뽑은 카드 뒷면이 손패·자리 위에 남지 않게 고스트마다 바로 지운다.
  return useGhostFlights(rootRef, transition, plan, 'data-oldmaid-zone', cardWidth, true);
}
