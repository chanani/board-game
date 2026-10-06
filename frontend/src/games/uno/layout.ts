import type { UnoStage, UnoView } from '../../api/types';
import { useMediaQuery } from '../../lib/useMediaQuery';
import type { TableLayout } from '../../lib/useTableLayout';

export type UnoSizes = { hand: number; back: number; center: number; minVisible: number };

/** 스펙 6.4 표: 내 손패·상대 뒷면·가운데 더미 카드 폭(px)과 손패 겹침 최소 보이는 폭. 높이는 폭의 1.5배.
 * 눕힌 휴대폰은 손패까지 한 화면 높이(약 390px)에 들어가도록 작게 둔다. */
export const UNO_SIZES: Record<TableLayout, UnoSizes> = {
  pc: { hand: 88, back: 36, center: 96, minVisible: 32 },
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

const GAP = 6;
const FAN_STEP = 4;
const FAN_MAX = 24;
// 낼 수 있는 카드의 빛·새 카드 테두리가 줄 끝에서 잘리지 않게 남겨 두는 폭.
const GLOW_ROOM = 6;
// 가로 스크롤 줄은 양끝 16px을 흐리게 하므로 끝 카드를 그 밖으로 민다.
const FADE_ROOM = 16;

/** 카드(폭 width, 높이 1.5배)가 angle도 기울면 원래 자리보다 옆으로 삐져나오는 폭. */
export function fanOverhang(width: number, angle: number): number {
  const radians = (Math.abs(angle) * Math.PI) / 180;
  const extent = width * Math.cos(radians) + width * 1.5 * Math.sin(radians);
  return Math.max(0, (extent - width) / 2);
}

/**
 * 손패 카드 왼쪽 끝 사이 간격과 줄 양끝 여백. 화면 폭에 맞춰 겹치다가 최소 보이는 폭보다 좁아지면 그 폭으로 두고 가로 스크롤.
 * 여백(inset)은 기운 카드가 삐져나오는 폭과 빛 테두리를 품어서 첫 카드와 마지막 카드가 잘리지 않게 한다.
 */
export function handSpacing(count: number, containerWidth: number, sizes: UnoSizes, angle = 0): { step: number; scroll: boolean; inset: number } {
  const loose = sizes.hand + GAP;
  const inset = Math.ceil(fanOverhang(sizes.hand, angle)) + GLOW_ROOM;
  if (count <= 1 || containerWidth <= 0) {
    return { step: loose, scroll: false, inset };
  }
  const fit = Math.floor((containerWidth - inset * 2 - sizes.hand) / (count - 1));
  if (fit < sizes.minVisible) {
    return { step: sizes.minVisible, scroll: true, inset: inset + FADE_ROOM };
  }
  return { step: Math.min(loose, fit), scroll: false, inset };
}

/** PC 부채꼴: 카드마다 최대 ±12° 안에서 고르게 기울인다(장수가 적으면 덜 벌린다). */
export function fanAngle(index: number, count: number): number {
  if (count <= 1) {
    return 0;
  }
  const spread = Math.min(FAN_MAX, (count - 1) * FAN_STEP);
  return -spread / 2 + (spread * index) / (count - 1);
}

const MY_TEXT: Record<UnoStage, [string, string]> = {
  PLAY: ['낼 카드를 고르거나 카드를 뽑으세요.', '카드를 내거나 뽑으세요'],
  DRAWN: ['뽑은 카드를 낼까요? 아니면 갖고 넘기세요.', '뽑은 카드를 낼까요?'],
  CHOOSE_COLOR: ['첫 카드가 와일드예요. 색을 골라 주세요.', '색을 골라 주세요'],
  CHALLENGE: ['와일드 +4에 도전할지 골라 주세요.', '도전할지 골라 주세요'],
};

/** 스펙 6.6 차례 안내 문구. */
export function unoInstruction(game: UnoView, meId: number, nicknameOf: (id: number) => string, wide: boolean): string {
  if (game.status === 'GAME_OVER' || game.stage === null || game.currentPlayerId === null) {
    return '게임이 끝났어요.';
  }
  if (game.currentPlayerId !== meId) {
    const name = nicknameOf(game.currentPlayerId);
    return game.stage === 'CHALLENGE' ? `${name}님이 도전할지 고르는 중…` : `${name}님의 차례예요.`;
  }
  const [pc, narrow] = MY_TEXT[game.stage];
  return wide ? pc : narrow;
}
