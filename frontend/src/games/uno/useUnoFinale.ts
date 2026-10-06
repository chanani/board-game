import { useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { UnoView } from '../../api/types';
import type { ViewTransition } from '../gameModule';

export const FINALE_DELAY_MS = 450;
export const BANNER_MS = 1400;
export type FinalePhase = 'playing' | 'flying' | 'banner' | 'done';

type Timed = { seq: number; phase: 'flying' | 'banner' | 'done' };

/**
 * 마지막 카드가 날아간 뒤 "게임 끝!" 배너 → 결과 창. 이미 끝난 화면(동기화·다시 입장)·기권 종료·동작 줄이기는 바로 결과 창.
 * 게임이 끝나지 않았으면 렌더 중에 곧바로 playing이라, 새 판의 첫 화면에 결과 창이 잠깐 비치지 않는다.
 */
export function useUnoFinale(game: UnoView, transition: ViewTransition<UnoView> | null | undefined): FinalePhase {
  const reduced = Boolean(useReducedMotion());
  const over = game.status === 'GAME_OVER';
  const live = over && !reduced && game.result?.reason !== 'FORFEIT' && Boolean(transition && transition.animate && transition.to === game && transition.from?.status === 'IN_PROGRESS');
  const seq = transition?.seq ?? 0;
  const [timed, setTimed] = useState<Timed | null>(null);
  useEffect(() => {
    if (!live) {
      return undefined;
    }
    setTimed({ seq, phase: 'flying' });
    const toBanner = window.setTimeout(() => setTimed({ seq, phase: 'banner' }), FINALE_DELAY_MS);
    const toDone = window.setTimeout(() => setTimed({ seq, phase: 'done' }), FINALE_DELAY_MS + BANNER_MS);
    return () => {
      window.clearTimeout(toBanner);
      window.clearTimeout(toDone);
    };
  }, [live, seq]);
  if (!over) {
    return 'playing';
  }
  if (!live) {
    return 'done';
  }
  return timed?.seq === seq ? timed.phase : 'flying';
}
