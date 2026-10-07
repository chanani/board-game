import type { PlayingCard, PlayingRank, Suit } from '../../api/types';

export const SUIT_ORDER: Suit[] = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];
export const RANK_ORDER: Exclude<PlayingRank, 'JOKER'>[] = ['ACE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'JACK', 'QUEEN', 'KING'];
export const SUIT_NAMES: Record<Suit, string> = { SPADES: '스페이드', HEARTS: '하트', DIAMONDS: '다이아몬드', CLUBS: '클로버' };
export const RANK_LABELS: Record<PlayingRank, string> = {
  ACE: 'A', TWO: '2', THREE: '3', FOUR: '4', FIVE: '5', SIX: '6', SEVEN: '7', EIGHT: '8', NINE: '9', TEN: '10',
  JACK: 'J', QUEEN: 'Q', KING: 'K', JOKER: '조커',
};
/** 카드 색은 규칙 정보라 테마와 상관없이 고정이다. */
export const INK_BLACK = '#1F2430';
export const INK_RED = '#C8283C';
export const JOKER_PURPLE = '#5B3FA8';
export const JOKER_GOLD = '#E8B931';
/** 왼쪽 위 모서리 표시가 차지하는 폭(카드 그림 폭 200 기준). 손패가 겹쳐도 이만큼은 늘 보이게 한다. */
export const CORNER_EXTENT = 60;
export const CARD_ART_WIDTH = 200;
const JOKER_ID = 52;
export const JOKER_CARD: PlayingCard = { id: JOKER_ID, suit: null, rank: 'JOKER' };

/** 서버와 같은 번호: 무늬 순서 × 13 + 랭크 순서. rank가 JOKER면 조커(무늬 무시). */
export function playingCard(suit: Suit, rank: PlayingRank): PlayingCard {
  if (rank === 'JOKER') {
    return JOKER_CARD;
  }
  return { id: SUIT_ORDER.indexOf(suit) * 13 + RANK_ORDER.indexOf(rank), suit, rank };
}

export function isRed(suit: Suit | null): boolean {
  return suit === 'HEARTS' || suit === 'DIAMONDS';
}

export function inkOf(card: PlayingCard): string {
  if (card.rank === 'JOKER') {
    return JOKER_PURPLE;
  }
  return isRed(card.suit) ? INK_RED : INK_BLACK;
}

export function rankLabel(card: PlayingCard): string {
  return RANK_LABELS[card.rank];
}

export function cardName(card: PlayingCard): string {
  if (card.rank === 'JOKER' || card.suit === null) {
    return '조커';
  }
  return `${SUIT_NAMES[card.suit]} ${RANK_LABELS[card.rank]}`;
}
