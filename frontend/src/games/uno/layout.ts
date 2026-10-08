import type { UnoStage, UnoView } from '../../api/types';
import { useMediaQuery } from '../../lib/useMediaQuery';
import type { TableLayout } from '../../lib/useTableLayout';
import { CARD_ART_WIDTH, CORNER_EXTENT } from './cards';
import { fanSpacing } from '../../table/fan';
export { FAN_RADIUS, fanAngle, fanDrop, fanOverhang, fanRoom, fanUnderhang, HAND_GLOW, handHeadroom } from '../../table/fan';

export type UnoSizes = { hand: number; back: number; center: number; minVisible: number };

/** 스펙 6.4 표: 내 손패·상대 뒷면·가운데 더미 카드 폭(px)과 손패 겹침 최소 보이는 폭. 높이는 폭의 1.5배.
 * 눕힌 휴대폰은 손패까지 한 화면 높이(약 390px)에 들어가도록 작게 둔다. */
export const UNO_SIZES: Record<TableLayout, UnoSizes> = {
  pc: { hand: 88, back: 36, center: 96, minVisible: 34 },
  landscape: { hand: 48, back: 22, center: 52, minVisible: 22 },
  portrait: { hand: 60, back: 22, center: 64, minVisible: 24 },
};

/** 높이가 낮은 PC 화면(900px 미만)에서 테이블 전체가 스크롤 없이 보이도록 쓰는 작은 카드. */
export const UNO_PC_SHORT_SIZES: UnoSizes = { hand: 72, back: 26, center: 72, minVisible: 28 };

/** 이 높이 이상이면 PC가 큰 카드를 쓴다. */
export const PC_TALL_QUERY = '(min-height: 900px)';

export function unoSizes(layout: TableLayout, tall: boolean): UnoSizes {
  if (layout === 'pc' && !tall) {
    return UNO_PC_SHORT_SIZES;
  }
  return UNO_SIZES[layout];
}

/** 배치와 화면 높이에 맞는 카드 크기. */
export function useUnoSizes(layout: TableLayout): UnoSizes {
  const tall = useMediaQuery(PC_TALL_QUERY);
  return unoSizes(layout, tall);
}

/** 겹친 카드가 적어도 보여 줘야 하는 폭: 배치별 최소 폭과 왼쪽 위 모서리 표시 폭 중 큰 값. */
export function minVisibleOf(sizes: UnoSizes): number {
  return Math.max(sizes.minVisible, Math.ceil((sizes.hand * CORNER_EXTENT) / CARD_ART_WIDTH));
}

/** 손패 카드 왼쪽 끝 사이 간격과 줄 양끝 여백(공통 부채 간격에 우노 카드 크기를 넣는다). */
export function handSpacing(count: number, containerWidth: number, sizes: UnoSizes, angle = 0): { step: number; scroll: boolean; inset: number } {
  return fanSpacing(count, containerWidth, sizes.hand, minVisibleOf(sizes), angle);
}

const MY_TEXT: Record<UnoStage, [string, string]> = {
  PLAY: ['낼 카드를 고르거나 카드를 뽑으세요.', '카드를 내거나 뽑으세요'],
  DRAWN: ['뽑은 카드를 낼까요? 아니면 갖고 넘기세요.', '뽑은 카드를 낼까요?'],
  CHOOSE_COLOR: ['첫 카드가 와일드예요. 색을 골라 주세요.', '색을 골라 주세요'],
};

/** 스펙 6.6 차례 안내 문구. */
export function unoInstruction(game: UnoView, meId: number, nicknameOf: (id: number) => string, wide: boolean): string {
  if (game.status === 'GAME_OVER' || game.stage === null || game.currentPlayerId === null) {
    return '게임이 끝났어요.';
  }
  if (game.currentPlayerId !== meId) {
    const name = nicknameOf(game.currentPlayerId);
    return `${name}님의 차례예요.`;
  }
  const [pc, narrow] = MY_TEXT[game.stage];
  return wide ? pc : narrow;
}
