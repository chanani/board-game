import { useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { ViewTransition } from '../games/gameModule';

export const FINALE_DELAY_MS = 450;
/** "게임 끝!" 알림을 보이는 시간. 세 게임이 같은 길이를 쓰고, 그 뒤에 결과 창이 열린다. */
export const BANNER_MS = 1800;
export type FinalePhase = 'playing' | 'flying' | 'banner' | 'done';

type Timed = { seq: number; phase: 'flying' | 'banner' | 'done' };
type Finishable = { status: string };

/**
 * 마지막 카드가 날아간 뒤 "게임 끝!" 배너 → 결과 창. 이미 끝난 화면(동기화·다시 입장)·instant(기권 끝 등)·동작 줄이기는 바로 결과 창.
 * 게임이 끝나지 않았으면 렌더 중에 곧바로 playing이라, 새 판의 첫 화면에 결과 창이 잠깐 비치지 않는다.
 * delayMs는 배너까지 기다리는 시간. 마지막 비행이 더 긴 게임(도둑잡기 뽑기+짝 버리기)은 그만큼 늘려 준다.
 */
export function useFinalePhase<G extends Finishable>(
  game: G, transition: ViewTransition<G> | null | undefined, instant: boolean, delayMs: number = FINALE_DELAY_MS,
): FinalePhase {
  const reduced = Boolean(useReducedMotion());
  const over = game.status === 'GAME_OVER';
  const live = over && !reduced && !instant
    && Boolean(transition && transition.animate && transition.to === game && transition.from?.status === 'IN_PROGRESS');
  const seq = transition?.seq ?? 0;
  const [timed, setTimed] = useState<Timed | null>(null);
  useEffect(() => {
    if (!live) {
      return undefined;
    }
    setTimed({ seq, phase: 'flying' });
    const toBanner = window.setTimeout(() => setTimed({ seq, phase: 'banner' }), delayMs);
    const toDone = window.setTimeout(() => setTimed({ seq, phase: 'done' }), delayMs + BANNER_MS);
    return () => {
      window.clearTimeout(toBanner);
      window.clearTimeout(toDone);
    };
  }, [live, seq, delayMs]);
  if (!over) {
    return 'playing';
  }
  if (!live) {
    return 'done';
  }
  return timed?.seq === seq ? timed.phase : 'flying';
}
