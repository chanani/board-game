import type { UnoStage, UnoView } from '../../api/types';
import type { TableLayout } from '../../lib/useTableLayout';

export type UnoSizes = { hand: number; back: number; center: number; minVisible: number };

/** 스펙 6.4 표: 내 손패·상대 뒷면·가운데 더미 카드 폭(px)과 손패 겹침 최소 보이는 폭. 높이는 폭의 1.5배. */
export const UNO_SIZES: Record<TableLayout, UnoSizes> = {
  pc: { hand: 88, back: 36, center: 96, minVisible: 32 },
  landscape: { hand: 56, back: 24, center: 64, minVisible: 24 },
  portrait: { hand: 60, back: 22, center: 64, minVisible: 24 },
};

const GAP = 6;
const FAN_STEP = 4;
const FAN_MAX = 24;

/** 손패 카드 왼쪽 끝 사이 간격. 화면 폭에 맞춰 겹치다가 최소 보이는 폭보다 좁아지면 그 폭으로 두고 가로 스크롤. */
export function handSpacing(count: number, containerWidth: number, sizes: UnoSizes): { step: number; scroll: boolean } {
  const loose = sizes.hand + GAP;
  if (count <= 1 || containerWidth <= 0) {
    return { step: loose, scroll: false };
  }
  const fit = (containerWidth - sizes.hand) / (count - 1);
  if (fit < sizes.minVisible) {
    return { step: sizes.minVisible, scroll: true };
  }
  return { step: Math.min(loose, fit), scroll: false };
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
