import { describe, expect, it } from 'vitest';
import { fanAngle, handSpacing, UNO_SIZES, unoInstruction } from './layout';
import { unoView } from './unoFixtures';

const nick = (id: number) => ({ 1: '앨리스', 2: '밥', 3: '캐롤' })[id] ?? '떠난 플레이어';

describe('손패 간격', () => {
  it('폭에 맞춰 겹치고 최소 보이는 폭보다 좁아지면 가로 스크롤한다', () => {
    expect(handSpacing(7, 360, UNO_SIZES.portrait)).toEqual({ step: 50, scroll: false });
    expect(handSpacing(20, 360, UNO_SIZES.portrait)).toEqual({ step: 24, scroll: true });
    expect(handSpacing(3, 1000, UNO_SIZES.pc)).toEqual({ step: 94, scroll: false });
    expect(handSpacing(1, 360, UNO_SIZES.portrait)).toEqual({ step: 66, scroll: false });
  });

  it('배치마다 카드 크기가 정해져 있다', () => {
    expect(UNO_SIZES.pc).toEqual({ hand: 88, back: 36, center: 96, minVisible: 32 });
    expect(UNO_SIZES.landscape).toEqual({ hand: 56, back: 24, center: 64, minVisible: 24 });
    expect(UNO_SIZES.portrait).toEqual({ hand: 60, back: 22, center: 64, minVisible: 24 });
  });
});

describe('PC 부채꼴 각도', () => {
  it('±12도 안에서 고르게 기울이고 한 장이면 똑바로 둔다', () => {
    expect(fanAngle(0, 7)).toBe(-12);
    expect(fanAngle(3, 7)).toBe(0);
    expect(fanAngle(6, 7)).toBe(12);
    expect(fanAngle(0, 2)).toBe(-2);
    expect(fanAngle(0, 1)).toBe(0);
  });
});

describe('차례 안내 문구', () => {
  it('내 단계마다 PC와 좁은 화면 문구가 다르다', () => {
    expect(unoInstruction(unoView({ stage: 'PLAY' }), 1, nick, true)).toBe('낼 카드를 고르거나 카드를 뽑으세요.');
    expect(unoInstruction(unoView({ stage: 'PLAY' }), 1, nick, false)).toBe('카드를 내거나 뽑으세요');
    expect(unoInstruction(unoView({ stage: 'DRAWN' }), 1, nick, true)).toBe('뽑은 카드를 낼까요? 아니면 갖고 넘기세요.');
    expect(unoInstruction(unoView({ stage: 'DRAWN' }), 1, nick, false)).toBe('뽑은 카드를 낼까요?');
    expect(unoInstruction(unoView({ stage: 'CHOOSE_COLOR' }), 1, nick, true)).toBe('첫 카드가 와일드예요. 색을 골라 주세요.');
    expect(unoInstruction(unoView({ stage: 'CHOOSE_COLOR' }), 1, nick, false)).toBe('색을 골라 주세요');
    expect(unoInstruction(unoView({ stage: 'CHALLENGE' }), 1, nick, true)).toBe('와일드 +4에 도전할지 골라 주세요.');
    expect(unoInstruction(unoView({ stage: 'CHALLENGE' }), 1, nick, false)).toBe('도전할지 골라 주세요');
  });

  it('남의 차례와 끝난 게임', () => {
    expect(unoInstruction(unoView({ stage: 'CHALLENGE', currentPlayerId: 2 }), 1, nick, true)).toBe('밥님이 도전할지 고르는 중…');
    expect(unoInstruction(unoView({ stage: 'PLAY', currentPlayerId: 3 }), 1, nick, false)).toBe('캐롤님의 차례예요.');
    expect(unoInstruction(unoView({ status: 'GAME_OVER', stage: null, currentPlayerId: null }), 1, nick, true)).toBe('게임이 끝났어요.');
  });
});
