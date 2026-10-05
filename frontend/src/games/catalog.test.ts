import { describe, expect, it } from 'vitest';
import { entryBySlug, lobbyPath } from './catalog';

describe('catalog', () => {
  it('게임 종류로 로비 주소를 만든다', () => {
    expect(lobbyPath('PAPER_SAFARI')).toBe('/games/paper-safari');
  });

  it('주소 조각으로 게임을 찾고 모르는 조각은 undefined', () => {
    expect(entryBySlug('paper-safari')?.gameType).toBe('PAPER_SAFARI');
    expect(entryBySlug('chess')).toBeUndefined();
  });
});
