import { useEffect, useState } from 'react';
import type { UnoView } from '../../api/types';
import type { ViewTransition } from '../gameModule';

export const FINALE_DELAY_MS = 450;
export const BANNER_MS = 1400;
export type FinalePhase = 'playing' | 'flying' | 'banner' | 'done';

/** 마지막 카드가 날아간 뒤 "게임 끝!" 배너 → 결과 창. 이미 끝난 화면을 받았으면(동기화·다시 입장) 바로 결과 창. */
export function useUnoFinale(game: UnoView, transition: ViewTransition<UnoView> | null | undefined): FinalePhase {
  const over = game.status === 'GAME_OVER';
  const live = Boolean(transition?.animate && transition.from?.status === 'IN_PROGRESS' && transition.to.status === 'GAME_OVER');
  const [phase, setPhase] = useState<FinalePhase>(() => (over ? (live ? 'flying' : 'done') : 'playing'));
  useEffect(() => {
    if (!over) {
      setPhase('playing');
      return undefined;
    }
    if (!live) {
      setPhase('done');
      return undefined;
    }
    setPhase('flying');
    const toBanner = window.setTimeout(() => setPhase('banner'), FINALE_DELAY_MS);
    const toDone = window.setTimeout(() => setPhase('done'), FINALE_DELAY_MS + BANNER_MS);
    return () => {
      window.clearTimeout(toBanner);
      window.clearTimeout(toDone);
    };
  }, [over, live, transition?.seq]);
  return phase;
}
