import { useCallback, useState } from 'react';
import type { PaperSafariView } from '../api/types';
import { gameOverKey, isDismissed, markDismissed } from '../lib/dismissals';

/** 게임 종료 창을 닫았는지 sessionStorage에 기억해, 방에 다시 들어와도 같은 결과 창을 또 띄우지 않는다. */
export function useGameOverDismissal(code: string, game: PaperSafariView | null) {
  const key = game ? gameOverKey(code, game) : null;
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const dismissed = key !== null && (dismissedKey === key || isDismissed(key));

  const dismiss = useCallback(() => {
    if (key === null) {
      return;
    }
    markDismissed(key);
    setDismissedKey(key);
  }, [key]);

  return { dismissed, dismiss };
}
