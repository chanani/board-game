import { useCallback, useEffect, useState } from 'react';
import type { PaperSafariView } from '../api/types';
import { clearDismissals, gameOverKey, isDismissed, markDismissed } from '../lib/dismissals';

/**
 * 게임 종료 창을 닫았는지 sessionStorage에 기억해, 방에 다시 들어와도 같은 결과 창을 또 띄우지 않는다.
 * 방이 다시 게임 중이 되면 그 방의 기록을 지워, 승자·토큰이 같은 다음 게임 결과도 다시 보여준다.
 */
export function useGameOverDismissal(code: string, game: PaperSafariView | null, playing: boolean) {
  const key = game ? gameOverKey(code, game) : null;
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const dismissed = key !== null && (dismissedKey === key || isDismissed(key));

  useEffect(() => {
    if (!playing) {
      return;
    }
    clearDismissals(code);
    setDismissedKey(null);
  }, [playing, code]);

  const dismiss = useCallback(() => {
    if (key === null) {
      return;
    }
    markDismissed(key);
    setDismissedKey(key);
  }, [key]);

  return { dismissed, dismiss };
}
