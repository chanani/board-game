import { describe, expect, it } from 'vitest';
import { botLabel, botOf, DIFFICULTY_BUTTON } from './bots';

describe('컴퓨터 표기', () => {
  it('라벨은 "컴퓨터 · 하/중/상"이다', () => {
    expect(botLabel('EASY')).toBe('컴퓨터 · 하');
    expect(botLabel('MEDIUM')).toBe('컴퓨터 · 중');
    expect(botLabel('HARD')).toBe('컴퓨터 · 상');
    expect(DIFFICULTY_BUTTON.HARD).toBe('상 · 어려움');
  });
  it('botOf는 사람이면 undefined, 난이도가 없는 컴퓨터는 중이다', () => {
    expect(botOf({ bot: false })).toBeUndefined();
    expect(botOf(null)).toBeUndefined();
    expect(botOf({ bot: true, difficulty: null })).toBe('MEDIUM');
    expect(botOf({ bot: true, difficulty: 'HARD' })).toBe('HARD');
  });
});
