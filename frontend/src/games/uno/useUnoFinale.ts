import type { UnoView } from '../../api/types';
import type { ViewTransition } from '../gameModule';
import { useFinalePhase, type FinalePhase } from '../../table/useFinalePhase';

export { BANNER_MS, FINALE_DELAY_MS, type FinalePhase } from '../../table/useFinalePhase';

/** 우노: 기권으로 끝나면 연출 없이 바로 결과 창. */
export function useUnoFinale(game: UnoView, transition: ViewTransition<UnoView> | null | undefined): FinalePhase {
  return useFinalePhase(game, transition, game.result?.reason === 'FORFEIT');
}
