import { describe, expect, it } from 'vitest';
import { drawnPairIds, firstPair, isPair, keepInHand, NOT_A_PAIR_HINT, pickCard } from './pairPick';
import { card, JOKER } from './oldMaidFixtures';

const S7 = card('SPADES', 'SEVEN');
const H7 = card('HEARTS', 'SEVEN');
const D2 = card('DIAMONDS', 'TWO');

describe('pairPick', () => {
  it('R3 같은 숫자 두 장만 짝이고 조커와 자기 자신은 아니다', () => {
    expect(isPair(S7, H7)).toBe(true);
    expect(isPair(S7, D2)).toBe(false);
    expect(isPair(JOKER, JOKER)).toBe(false);
    expect(isPair(S7, S7)).toBe(false);
  });

  it('누르기: 첫 장은 고르고 다시 누르면 풀며, 같은 숫자 두 번째 장은 두 장을 바로 보낸다', () => {
    const hand = [S7, D2, H7];

    expect(pickCard(hand, [], S7.id)).toEqual({ ids: [S7.id], send: null, hint: null });
    expect(pickCard(hand, [S7.id], S7.id)).toEqual({ ids: [], send: null, hint: null });
    expect(pickCard(hand, [S7.id], H7.id)).toEqual({ ids: [], send: [S7.id, H7.id], hint: null });
    expect(keepInHand([S7.id, 99], [S7, H7])).toEqual([S7.id]);
  });

  it('누르기: 두 번째 장이 다른 숫자(조커 포함)면 보내지 않고 새로 누른 카드만 고른 채 안내', () => {
    expect(NOT_A_PAIR_HINT).toBe('같은 숫자 두 장을 고르세요');
    expect(pickCard([S7, D2, H7], [S7.id], D2.id)).toEqual({ ids: [D2.id], send: null, hint: NOT_A_PAIR_HINT });
    expect(pickCard([S7, JOKER], [JOKER.id], S7.id)).toEqual({ ids: [S7.id], send: null, hint: NOT_A_PAIR_HINT });
  });

  it('R37 짝 버리기 단계에서만 뽑은 짝을 빛낸다', () => {
    const game = { stage: 'DISCARD' as const, canDiscard: true, hand: [D2, H7, JOKER, S7] };

    expect(firstPair(game.hand)).toEqual([H7, S7]);
    expect(drawnPairIds(game)).toEqual([H7.id, S7.id]);
    expect(drawnPairIds({ ...game, stage: 'OPENING_DISCARD' })).toEqual([]);
    expect(drawnPairIds({ ...game, canDiscard: false })).toEqual([]);
  });
});
