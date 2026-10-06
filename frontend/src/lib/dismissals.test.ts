import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PaperSafariView } from '../api/types';
import { clearDismissals, gameOverKey, isDismissed, markDismissed } from './dismissals';

const game = { winnerId: 2, tokens: { '1': 1, '2': 3 } } as unknown as PaperSafariView;

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe('결과 모달 닫음 기록', () => {
  it('방 코드·승자·토큰으로 식별자를 만든다', () => {
    expect(gameOverKey('ABC234', game)).toBe('ABC234:2:{"1":1,"2":3}');
  });

  it('닫았다고 적으면 닫은 것으로 본다', () => {
    const key = gameOverKey('ABC234', game);
    expect(isDismissed(key)).toBe(false);

    markDismissed(key);

    expect(isDismissed(key)).toBe(true);
    expect(JSON.parse(window.sessionStorage.getItem('bg.dismissedGameOver') ?? '[]')).toEqual([key]);
  });

  it('저장소가 막혀 있어도 던지지 않고 닫지 않은 것으로 본다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });

    expect(() => markDismissed('X')).not.toThrow();
    expect(isDismissed('X')).toBe(false);
  });

  it('깨진 값이 있어도 닫지 않은 것으로 본다', () => {
    window.sessionStorage.setItem('bg.dismissedGameOver', '{not json');

    expect(isDismissed('X')).toBe(false);
  });

  it('최근 20개만 기억한다', () => {
    Array.from({ length: 25 }, (_, index) => markDismissed(`k${index}`));

    const stored = JSON.parse(window.sessionStorage.getItem('bg.dismissedGameOver') ?? '[]');
    expect(stored).toHaveLength(20);
    expect(isDismissed('k4')).toBe(false);
    expect(isDismissed('k5')).toBe(true);
    expect(isDismissed('k24')).toBe(true);
  });

  it('한 방의 기록만 지우고 다른 방 기록은 남긴다', () => {
    markDismissed('ABC234:1:{}');
    markDismissed('ABC234:2:{}');
    markDismissed('XYZ789:1:{}');

    clearDismissals('ABC234');

    expect(isDismissed('ABC234:1:{}')).toBe(false);
    expect(isDismissed('ABC234:2:{}')).toBe(false);
    expect(isDismissed('XYZ789:1:{}')).toBe(true);
  });
});
