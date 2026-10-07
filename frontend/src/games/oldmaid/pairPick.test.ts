import { describe, expect, it } from 'vitest';
import { discardChoice, firstPair, isPair, keepInHand, toggleSelection } from './pairPick';
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

  it('최대 두 장: 다시 누르면 풀고, 세 번째를 누르면 먼저 고른 카드를 놓는다', () => {
    expect(toggleSelection([], 1)).toEqual([1]);
    expect(toggleSelection([1], 1)).toEqual([]);
    expect(toggleSelection([1, 2], 3)).toEqual([2, 3]);
    expect(keepInHand([S7.id, 99], [S7, H7])).toEqual([S7.id]);
  });

  it('처음 버리기 단계: 고른 두 장이 짝일 때만 버리기가 켜지고, 짝이 아니면 안내', () => {
    const game = { stage: 'OPENING_DISCARD' as const, canDiscard: true, hand: [S7, D2, H7] };

    expect(discardChoice(game, [])).toEqual({ ids: null, hint: null, glowIds: [] });
    expect(discardChoice(game, [S7.id])).toEqual({ ids: null, hint: null, glowIds: [] });
    expect(discardChoice(game, [H7.id, S7.id])).toEqual({ ids: [H7.id, S7.id], hint: null, glowIds: [] });
    expect(discardChoice(game, [S7.id, D2.id])).toEqual({ ids: null, hint: '같은 숫자 두 장을 골라 주세요', glowIds: [] });
    expect(discardChoice({ ...game, canDiscard: false }, [H7.id, S7.id]).ids).toBeNull();
  });

  it('짝 버리기 단계: 뽑은 짝을 빛내고, 덜 골랐으면 그 짝을 버린다', () => {
    const game = { stage: 'DISCARD' as const, canDiscard: true, hand: [D2, H7, JOKER, S7] };

    expect(firstPair(game.hand)).toEqual([H7, S7]);
    expect(discardChoice(game, [])).toEqual({ ids: [H7.id, S7.id], hint: null, glowIds: [H7.id, S7.id] });
    expect(discardChoice(game, [S7.id, H7.id]).ids).toEqual([S7.id, H7.id]);
    expect(discardChoice(game, [S7.id, D2.id])).toMatchObject({ ids: null, hint: '같은 숫자 두 장을 골라 주세요' });
  });
});
