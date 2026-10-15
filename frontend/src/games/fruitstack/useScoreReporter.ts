import { useCallback, useEffect, useRef } from 'react';
import type { FruitStackView, GameAction } from '../../api/types';
import { REPORT_BACKOFF_MS } from './engine/constants';
import { planReport } from './engine/reconcile';

export type ScoreReporterOptions = {
  send: (action: GameAction) => void; connected: boolean; game: FruitStackView; meId: number; errorSeq: number;
  getLocal: () => { score: number; out: boolean } | null; elapsedMs: () => number; now?: () => number;
};

/** R18·R20·R21: 내 판의 점수·탈락을 서버에 보고한다. 언제 무엇을 보낼지는 planReport가 정한다. */
export function useScoreReporter(options: ScoreReporterOptions): { poke: () => void } {
  const latest = useRef(options);
  latest.current = options;
  const lastScoreSentAtRef = useRef<number | null>(null);
  const lastOutSentAtRef = useRef<number | null>(null);
  const holdUntilRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const seenErrorSeqRef = useRef(options.errorSeq);

  const run = useCallback(() => {
    const { send, connected, game, meId, getLocal, elapsedMs, now } = latest.current;
    const local = getLocal();
    if (!local) {
      return;
    }
    const at = (now ?? Date.now)();
    const mine = game.players.find((player) => player.playerId === meId);
    const plan = planReport({
      connected, gameOver: game.status === 'GAME_OVER', now: at, elapsedMs: elapsedMs(), local,
      server: mine ? { score: mine.score, state: mine.state } : null,
      lastScoreSentAt: lastScoreSentAtRef.current, lastOutSentAt: lastOutSentAtRef.current, holdUntil: holdUntilRef.current,
      // 혼자 하기는 상한이 없어 화면의 deadline이 비어 있다(S3).
      timed: game.deadline !== null,
    });
    if (plan.send) {
      send(plan.send);
      lastScoreSentAtRef.current = at;
      lastOutSentAtRef.current = plan.send.type === 'OUT' ? at : lastOutSentAtRef.current;
    }
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (plan.wakeAt !== null) {
      timerRef.current = window.setTimeout(run, Math.max(0, plan.wakeAt - at));
    }
  }, []);

  const { game, connected, errorSeq } = options;
  // R21: 보낸 보고가 거절되거나 답이 없으면 다음 보고를 미룬다.
  useEffect(() => {
    if (seenErrorSeqRef.current === errorSeq) {
      return;
    }
    seenErrorSeqRef.current = errorSeq;
    holdUntilRef.current = (latest.current.now ?? Date.now)() + REPORT_BACKOFF_MS;
    run();
  }, [errorSeq, run]);

  // 화면을 받을 때·다시 붙을 때 맞춘다(R21 (3)·(4)).
  useEffect(() => {
    run();
  }, [game, connected, run]);

  useEffect(() => () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
  }, []);

  return { poke: run };
}
