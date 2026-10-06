import type { PaperSafariView } from '../api/types';

const STORAGE_KEY = 'bg.dismissedGameOver';
const MAX_ENTRIES = 20;

/** 서버가 경기 식별자를 주지 않으므로, 같은 게임 결과면 같은 값이 되는 방 코드 · 승자 · 토큰 조합을 쓴다. */
export function gameOverKey(code: string, game: PaperSafariView): string {
  return `${code}:${game.winnerId}:${JSON.stringify(game.tokens)}`;
}

function readKeys(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function isDismissed(key: string): boolean {
  return readKeys().includes(key);
}

export function markDismissed(key: string): void {
  const keys = [...readKeys().filter((item) => item !== key), key].slice(-MAX_ENTRIES);
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // 저장소를 쓸 수 없으면 이번 화면에서만 닫힌다.
  }
}
