import type { PaperSafariView } from '../api/types';

const STORAGE_KEY = 'bg.dismissedGameOver';
const MAX_ENTRIES = 20;

/** 서버가 경기 식별자를 주지 않으므로, 같은 게임 결과면 같은 값이 되는 방 코드 · 승자 · 점수 조합을 쓴다. */
export function gameOverKey(code: string, game: PaperSafariView): string {
  const scores = game.lastRoundResult?.players.map((player) => [player.playerId, player.score]) ?? null;
  return `${code}:${game.winnerId}:${JSON.stringify(scores)}`;
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

function writeKeys(keys: string[]): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // 저장소를 쓸 수 없으면 이번 화면에서만 닫힌다.
  }
}

export function markDismissed(key: string): void {
  writeKeys([...readKeys().filter((item) => item !== key), key].slice(-MAX_ENTRIES));
}

/** 새 게임이 시작되면 그 방에서 닫았던 결과 기록을 지운다. 승자·점수가 같은 다음 게임 결과가 가려지지 않게 한다. */
export function clearDismissals(code: string): void {
  const keys = readKeys();
  const kept = keys.filter((item) => !item.startsWith(`${code}:`));
  if (kept.length !== keys.length) {
    writeKeys(kept);
  }
}
