import type { OldMaidView } from '../../api/types';
import { useMediaQuery } from '../../lib/useMediaQuery';
import type { TableLayout } from '../../lib/useTableLayout';
import { CARD_ART_WIDTH, CORNER_EXTENT } from './cards';

/** 스펙 6.4 표: 내 손패·가운데 상대 부채·상대 자리 뒷면·버린 짝 카드 폭과 겹침 최소 폭(px). 높이는 폭의 1.5배. */
export type OldMaidSizes = { hand: number; pick: number; back: number; pair: number; handMinVisible: number; pickMinVisible: number };

export const OLD_MAID_SIZES: Record<TableLayout, OldMaidSizes> = {
  pc: { hand: 84, pick: 76, back: 30, pair: 44, handMinVisible: 34, pickMinVisible: 30 },
  landscape: { hand: 46, pick: 44, back: 20, pair: 30, handMinVisible: 20, pickMinVisible: 18 },
  portrait: { hand: 56, pick: 48, back: 20, pair: 32, handMinVisible: 22, pickMinVisible: 18 },
};

/** 높이가 낮은 PC(900px 미만)에서 1280×860 한 화면에 들어가는 작은 카드. */
export const OLD_MAID_PC_SHORT_SIZES: OldMaidSizes = { hand: 68, pick: 62, back: 24, pair: 36, handMinVisible: 28, pickMinVisible: 24 };
export const PC_TALL_QUERY = '(min-height: 900px)';
/** 고르는 카드를 들어 올리는 높이(카드 높이 비율). */
export const LIFT_RATIO = 0.18;

export function oldMaidSizes(layout: TableLayout, tall: boolean): OldMaidSizes {
  if (layout === 'pc' && !tall) {
    return OLD_MAID_PC_SHORT_SIZES;
  }
  return OLD_MAID_SIZES[layout];
}

export function useOldMaidSizes(layout: TableLayout): OldMaidSizes {
  const tall = useMediaQuery(PC_TALL_QUERY);
  return oldMaidSizes(layout, tall);
}

/** 내 손패 겹침 최소 폭: 배치 값과 모서리 표시 폭 중 큰 값. */
export function handMinVisible(sizes: OldMaidSizes): number {
  return Math.max(sizes.handMinVisible, Math.ceil((sizes.hand * CORNER_EXTENT) / CARD_ART_WIDTH));
}

/** 자리 부채에 그린 뒷면(shown)이 장수(count)보다 적으면 들린 자리를 그려진 자리로 비율 맞춰 옮긴다. */
export function scaledIndex(index: number, count: number, shown: number): number {
  if (count <= shown || count <= 1) {
    return index;
  }
  return Math.round((index * (shown - 1)) / (count - 1));
}

/** 스펙 6.6 차례 안내 문구. */
export function oldMaidInstruction(game: OldMaidView, meId: number, nicknameOf: (id: number) => string, wide: boolean): string {
  if (game.status === 'GAME_OVER' || game.currentPlayerId === null || game.targetId === null) {
    return '게임이 끝났어요.';
  }
  const drawer = nicknameOf(game.currentPlayerId);
  const target = nicknameOf(game.targetId);
  if (game.currentPlayerId === meId) {
    return wide ? `${target}님의 카드를 1장 고르세요.` : '카드를 1장 고르세요';
  }
  if (game.targetId === meId) {
    return wide ? `${drawer}님이 내 카드를 고르는 중…` : '내 카드를 고르는 중…';
  }
  const myRank = game.players.find((player) => player.playerId === meId)?.rank ?? null;
  if (myRank !== null) {
    return wide ? `${myRank}등으로 끝냈어요. 끝까지 지켜보세요.` : `${myRank}등으로 끝냈어요`;
  }
  return wide ? `${drawer}님이 ${target}님의 카드를 고르는 중…` : `${drawer}님의 차례예요`;
}

/** 가운데 큰 부채 위 한 줄. 끝났으면 null. */
export function pickCaption(game: OldMaidView, meId: number, nicknameOf: (id: number) => string): string | null {
  if (game.status === 'GAME_OVER' || game.currentPlayerId === null || game.targetId === null) {
    return null;
  }
  if (game.currentPlayerId === meId) {
    return `${nicknameOf(game.targetId)}님의 카드를 1장 고르세요`;
  }
  if (game.targetId === meId) {
    return '내 카드를 고르고 있어요';
  }
  return `${nicknameOf(game.currentPlayerId)}님이 ${nicknameOf(game.targetId)}님의 카드를 고르는 중`;
}

/** 들린 카드 강조 테두리(ring-4) 폭. 섞기 버튼과 겹치는지 잴 때 카드 폭에 더한다. */
const LIFT_RING = 4;

/**
 * 섞기 버튼을 둘 쪽. 기본은 손패 위 오른쪽(스펙 6.4)이고, 남이 고르는 내 카드(들린 카드)의 가로 범위가 그 자리와 겹치면 왼쪽으로 옮긴다
 * (버튼이 들린 카드를 가리지 않게, Task 10 판정). lifted는 손패 칸 왼쪽 끝 기준의 들린 카드 [왼쪽, 오른쪽](px), 칸 폭을 모르면 오른쪽.
 */
export function shuffleSide(lifted: { left: number; right: number } | null, boxWidth: number, buttonWidth: number): 'left' | 'right' {
  if (lifted === null || boxWidth <= 0) {
    return 'right';
  }
  return lifted.right + LIFT_RING > boxWidth - buttonWidth ? 'left' : 'right';
}
