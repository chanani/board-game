import type { UnoCard, UnoCardKind, UnoColor } from '../../api/types';

export const COLOR_ORDER: UnoColor[] = ['RED', 'YELLOW', 'GREEN', 'BLUE'];
export const COLOR_NAMES: Record<UnoColor, string> = { RED: '빨강', YELLOW: '노랑', GREEN: '초록', BLUE: '파랑' };
/** 카드 색은 규칙 정보라 테마와 상관없이 고정이다(D22). */
export const COLOR_HEX: Record<UnoColor, string> = { RED: '#D93A3A', YELLOW: '#F2B705', GREEN: '#2E9E4F', BLUE: '#2B6CD4' };
export const WILD_HEX = '#1F2430';

const KIND_ORDER: Record<UnoCardKind, number> = { NUMBER: 0, SKIP: 1, REVERSE: 2, DRAW_TWO: 3, WILD: 4, WILD_DRAW_FOUR: 5 };
const SYMBOLS: Record<UnoCardKind, (card: UnoCard) => string> = {
  NUMBER: (card) => String(card.number),
  SKIP: () => '건너뛰기',
  REVERSE: () => '방향 바꾸기',
  DRAW_TWO: () => '+2',
  WILD: () => '와일드',
  WILD_DRAW_FOUR: () => '와일드 +4',
};

export function isWild(card: UnoCard): boolean {
  return card.kind === 'WILD' || card.kind === 'WILD_DRAW_FOUR';
}

export function cardName(card: UnoCard): string {
  const symbol = SYMBOLS[card.kind](card);
  return card.color ? `${COLOR_NAMES[card.color]} ${symbol}` : symbol;
}

function colorRank(card: UnoCard): number {
  return card.color ? COLOR_ORDER.indexOf(card.color) : COLOR_ORDER.length;
}

export function sortHand(cards: UnoCard[]): UnoCard[] {
  return [...cards].sort((a, b) => colorRank(a) - colorRank(b)
    || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
    || (a.number ?? 0) - (b.number ?? 0)
    || a.id - b.id);
}

/** 버린 더미 맨 위 카드의 기울기(-6°~+6°). 무작위가 아니라 id로 정해 다시 그려도 같다. */
export function cardTilt(id: number): number {
  return ((id * 37) % 13) - 6;
}
