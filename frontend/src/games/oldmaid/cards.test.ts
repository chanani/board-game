import { describe, expect, it } from 'vitest';
import type { Suit } from '../../api/types';
import { cardName, inkOf, isRed, JOKER_CARD, playingCard, RANK_ORDER, rankLabel } from './cards';

const SUITS: Suit[] = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];

describe('cards', () => {
  it('카드 번호는 서버와 같다(무늬 순서 × 13 + 랭크 순서, 조커 52)', () => {
    expect(playingCard('SPADES', 'ACE').id).toBe(0);
    expect(playingCard('HEARTS', 'TEN').id).toBe(22);
    expect(playingCard('CLUBS', 'KING').id).toBe(51);
    expect(JOKER_CARD).toEqual({ id: 52, suit: null, rank: 'JOKER' });
  });

  it('이름은 무늬 + 랭크 글자, 53장이 모두 다르다', () => {
    expect(cardName(playingCard('SPADES', 'ACE'))).toBe('스페이드 A');
    expect(cardName(playingCard('HEARTS', 'TEN'))).toBe('하트 10');
    expect(cardName(playingCard('DIAMONDS', 'KING'))).toBe('다이아몬드 K');
    expect(cardName(playingCard('CLUBS', 'SEVEN'))).toBe('클로버 7');
    expect(cardName(JOKER_CARD)).toBe('조커');
    const names = SUITS.flatMap((suit) => RANK_ORDER.map((rank) => cardName(playingCard(suit, rank))));
    expect(new Set([...names, cardName(JOKER_CARD)]).size).toBe(53);
  });

  it('하트·다이아몬드는 빨강, 조커는 보라', () => {
    expect(isRed('HEARTS')).toBe(true);
    expect(isRed('CLUBS')).toBe(false);
    expect(inkOf(playingCard('DIAMONDS', 'TWO'))).toBe('#C8283C');
    expect(inkOf(playingCard('SPADES', 'TWO'))).toBe('#1F2430');
    expect(inkOf(JOKER_CARD)).toBe('#5B3FA8');
    expect(rankLabel(playingCard('CLUBS', 'QUEEN'))).toBe('Q');
  });
});
