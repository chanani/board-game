import { describe, expect, it } from 'vitest';
import { handMinVisible, OLD_MAID_SIZES, oldMaidInstruction, oldMaidSizes, pickCaption, scaledIndex } from './layout';
import { oldMaidView } from './oldMaidFixtures';

const names: Record<number, string> = { 1: '앨리스', 2: '밥', 3: '캐롤' };
const nicknameOf = (id: number) => names[id];

describe('도둑잡기 배치', () => {
  it('스펙 6.4 크기, PC 낮은 화면은 작은 카드', () => {
    expect(OLD_MAID_SIZES.pc).toMatchObject({ hand: 84, pick: 76, back: 30, pair: 44 });
    expect(oldMaidSizes('pc', false).hand).toBe(68);
    expect(oldMaidSizes('portrait', false).pick).toBe(48);
    expect(handMinVisible(OLD_MAID_SIZES.pc)).toBeGreaterThanOrEqual(Math.ceil((84 * 60) / 200));
  });

  it('R10 14장이면 세로 360px에서 가운데 부채가 스크롤 없이 들어간다', () => {
    const { pick, pickMinVisible } = OLD_MAID_SIZES.portrait;
    expect(13 * pickMinVisible + pick).toBeLessThanOrEqual(328);
  });

  it('그린 뒷면이 장수보다 적으면 들린 자리를 비율로 옮긴다', () => {
    expect(scaledIndex(3, 5, 7)).toBe(3);
    expect(scaledIndex(13, 14, 7)).toBe(6);
    expect(scaledIndex(0, 14, 7)).toBe(0);
  });

  it('스펙 6.6 안내 문구', () => {
    expect(oldMaidInstruction(oldMaidView(), 1, nicknameOf, true)).toBe('밥님의 카드를 1장 고르세요.');
    expect(oldMaidInstruction(oldMaidView(), 1, nicknameOf, false)).toBe('카드를 1장 고르세요');
    expect(oldMaidInstruction(oldMaidView({ currentPlayerId: 3, targetId: 1 }), 1, nicknameOf, true)).toBe('캐롤님이 내 카드를 고르는 중…');
    expect(oldMaidInstruction(oldMaidView({ currentPlayerId: 3, targetId: 1 }), 1, nicknameOf, false)).toBe('내 카드를 고르는 중…');
    expect(oldMaidInstruction(oldMaidView({ currentPlayerId: 2, targetId: 3 }), 1, nicknameOf, true)).toBe('밥님이 캐롤님의 카드를 고르는 중…');
    expect(oldMaidInstruction(oldMaidView({ currentPlayerId: 2, targetId: 3 }), 1, nicknameOf, false)).toBe('밥님의 차례예요');
    const finished = oldMaidView({ currentPlayerId: 2, targetId: 3, players: [
      { playerId: 1, cardCount: 0, rank: 1, forfeited: false },
      { playerId: 2, cardCount: 3, rank: null, forfeited: false },
      { playerId: 3, cardCount: 2, rank: null, forfeited: false },
    ] });
    expect(oldMaidInstruction(finished, 1, nicknameOf, true)).toBe('1등으로 끝냈어요. 끝까지 지켜보세요.');
    expect(oldMaidInstruction(finished, 1, nicknameOf, false)).toBe('1등으로 끝냈어요');
    expect(oldMaidInstruction(oldMaidView({ status: 'GAME_OVER', currentPlayerId: null, targetId: null }), 1, nicknameOf, true)).toBe('게임이 끝났어요.');
  });

  it('가운데 위 한 줄', () => {
    expect(pickCaption(oldMaidView(), 1, nicknameOf)).toBe('밥님의 카드를 1장 고르세요');
    expect(pickCaption(oldMaidView({ currentPlayerId: 3, targetId: 1 }), 1, nicknameOf)).toBe('내 카드를 고르고 있어요');
    expect(pickCaption(oldMaidView({ currentPlayerId: 2, targetId: 3 }), 1, nicknameOf)).toBe('밥님이 캐롤님의 카드를 고르는 중');
    expect(pickCaption(oldMaidView({ status: 'GAME_OVER', currentPlayerId: null, targetId: null }), 1, nicknameOf)).toBeNull();
  });
});
