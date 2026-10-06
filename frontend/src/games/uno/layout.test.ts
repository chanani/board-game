import { describe, expect, it } from 'vitest';
import { fanAngle, fanOverhang, handSpacing, UNO_PC_SHORT_SIZES, UNO_SIZES, unoInstruction, unoSizes } from './layout';
import { unoView } from './unoFixtures';

const nick = (id: number) => ({ 1: '앨리스', 2: '밥', 3: '캐롤' })[id] ?? '떠난 플레이어';

describe('손패 간격', () => {
  it('폭에 맞춰 겹치고 최소 보이는 폭보다 좁아지면 가로 스크롤한다', () => {
    expect(handSpacing(7, 360, UNO_SIZES.portrait)).toEqual({ step: 48, scroll: false, inset: 6 });
    expect(handSpacing(20, 360, UNO_SIZES.portrait)).toEqual({ step: 24, scroll: true, inset: 22 });
    expect(handSpacing(3, 1000, UNO_SIZES.pc)).toEqual({ step: 94, scroll: false, inset: 6 });
    expect(handSpacing(1, 360, UNO_SIZES.portrait)).toEqual({ step: 66, scroll: false, inset: 6 });
  });

  it('첫 카드와 마지막 카드가 늘 폭 안에 다 보인다(2~20장, 320/360/1024px)', () => {
    const layouts = [UNO_SIZES.portrait, UNO_SIZES.landscape, UNO_SIZES.pc, UNO_PC_SHORT_SIZES];
    layouts.forEach((sizes) => {
      [320, 360, 1024].forEach((width) => {
        for (let count = 2; count <= 20; count += 1) {
          const angle = Math.abs(fanAngle(0, count));
          const { step, scroll, inset } = handSpacing(count, width, sizes, angle);
          const overhang = fanOverhang(sizes.hand, angle);
          const inner = inset * 2 + (count - 1) * step + sizes.hand;
          expect(inset).toBeGreaterThanOrEqual(overhang);
          if (scroll) {
            // 스크롤 줄은 양끝 16px을 흐리게 하므로, 끝 카드는 그 흐린 띠 밖에서 시작하고 끝난다.
            expect(inset - overhang).toBeGreaterThanOrEqual(16);
            expect(step).toBe(sizes.minVisible);
            continue;
          }
          expect(inner).toBeLessThanOrEqual(width);
          expect(step).toBeGreaterThanOrEqual(sizes.minVisible);
        }
      });
    });
  });

  it('기운 카드가 옆으로 삐져나오는 폭을 잰다', () => {
    expect(fanOverhang(88, 0)).toBe(0);
    expect(fanOverhang(88, 12)).toBeCloseTo(12.76, 1);
  });

  it('배치마다 카드 크기가 정해져 있다', () => {
    expect(UNO_SIZES.pc).toEqual({ hand: 88, back: 36, center: 96, minVisible: 32 });
    expect(UNO_SIZES.landscape).toEqual({ hand: 48, back: 22, center: 52, minVisible: 22 });
    expect(UNO_SIZES.portrait).toEqual({ hand: 60, back: 22, center: 64, minVisible: 24 });
    expect(UNO_PC_SHORT_SIZES).toEqual({ hand: 72, back: 26, center: 72, minVisible: 28 });
  });

  it('PC는 화면 높이가 낮으면 작은 카드를 쓴다', () => {
    expect(unoSizes('pc', true)).toBe(UNO_SIZES.pc);
    expect(unoSizes('pc', false)).toBe(UNO_PC_SHORT_SIZES);
    expect(unoSizes('landscape', false)).toBe(UNO_SIZES.landscape);
    expect(unoSizes('portrait', true)).toBe(UNO_SIZES.portrait);
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
