import { describe, expect, it } from 'vitest';
import { cardName, cardTilt, sortHand } from './cards';
import { drawTwo, num, reverse, skip, wild, wildFour } from './unoFixtures';

describe('우노 카드 이름', () => {
  it('색과 숫자·기호로 부른다', () => {
    expect(cardName(num('RED', 7, 13))).toBe('빨강 7');
    expect(cardName(skip('BLUE', 94))).toBe('파랑 건너뛰기');
    expect(cardName(reverse('GREEN', 71))).toBe('초록 방향 바꾸기');
    expect(cardName(drawTwo('YELLOW', 48))).toBe('노랑 +2');
    expect(cardName(wild(100))).toBe('와일드');
    expect(cardName(wildFour(104))).toBe('와일드 +4');
  });
});

describe('손패 정렬', () => {
  it('빨강·노랑·초록·파랑·와일드 순, 같은 색은 숫자 작은 순 → 건너뛰기 → 방향 바꾸기 → +2 → 와일드 → 와일드 +4', () => {
    const sorted = sortHand([wildFour(104), num('BLUE', 1, 76), drawTwo('RED', 23), wild(100), num('RED', 9, 17), skip('RED', 19), num('YELLOW', 0, 25), num('RED', 2, 3)]);

    expect(sorted.map(cardName)).toEqual(['빨강 2', '빨강 9', '빨강 건너뛰기', '빨강 +2', '노랑 0', '파랑 1', '와일드', '와일드 +4']);
  });
});

describe('버린 더미 각도', () => {
  it('카드 id로 정해져 -6도~6도 사이이고 다시 그려도 같다', () => {
    [0, 13, 57, 104].forEach((id) => {
      expect(cardTilt(id)).toBeGreaterThanOrEqual(-6);
      expect(cardTilt(id)).toBeLessThanOrEqual(6);
      expect(cardTilt(id)).toBe(cardTilt(id));
    });
  });
});
