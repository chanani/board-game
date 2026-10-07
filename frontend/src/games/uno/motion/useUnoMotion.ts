import { useCallback, type RefObject } from 'react';
import type { UnoCard, UnoView } from '../../../api/types';
import { useGhostFlights, type Ghost } from '../../../table/useGhostFlights';
import type { ViewTransition } from '../../gameModule';
import { planUnoMotion } from './planUnoMotion';

export type { Rect } from './ghostGeometry';
export type UnoGhost = Ghost<UnoCard | null>;

export function useUnoMotion(rootRef: RefObject<HTMLElement | null>, transition: ViewTransition<UnoView> | null | undefined, meId: number, cardWidth = 64): { ghosts: UnoGhost[] } {
  const plan = useCallback((from: UnoView | null, to: UnoView) => planUnoMotion(from, to, meId), [meId]);
  // 낸 카드가 내려앉은 뒤 벌칙 카드가 내 손패로 날아가는 동안, 먼저 내려앉은 고스트(특히 뒷면)가 버린 더미·손패 위에 남지 않게
  // 고스트마다 제 비행이 끝나면 바로 지운다(도둑잡기와 같은 옵션).
  return useGhostFlights(rootRef, transition, plan, 'data-uno-zone', cardWidth, true);
}
