import type { FruitStackPlayerState, GameAction } from '../../../api/types';
import { OUT_RETRY_MS, SCORE_REPORT_GAP_MS, SCORE_RUSH_FROM_MS } from './constants';

export type ReportInput = {
  connected: boolean; gameOver: boolean; now: number; elapsedMs: number;
  local: { score: number; out: boolean };
  server: { score: number; state: FruitStackPlayerState } | null;
  lastScoreSentAt: number | null; lastOutSentAt: number | null; holdUntil: number;
};
export type ReportPlan = { send: GameAction | null; wakeAt: number | null };

const NOTHING: ReportPlan = { send: null, wakeAt: null };
const due = (lastAt: number | null, now: number, gap: number) => lastAt === null || now - lastAt >= gap;

/** R18·R20·R21: 지금 보낼 보고와 다음에 다시 볼 시각. */
export function planReport({ connected, gameOver, now, elapsedMs, local, server, lastScoreSentAt, lastOutSentAt, holdUntil }: ReportInput): ReportPlan {
  if (!connected || gameOver || !server || server.state !== 'PLAYING') {
    return NOTHING;
  }
  if (now < holdUntil) {
    return { send: null, wakeAt: holdUntil };
  }
  if (local.out) {
    return due(lastOutSentAt, now, OUT_RETRY_MS)
      ? { send: { type: 'OUT', score: Math.max(local.score, server.score) }, wakeAt: now + OUT_RETRY_MS }
      : { send: null, wakeAt: (lastOutSentAt ?? now) + OUT_RETRY_MS };
  }
  if (local.score <= server.score) {
    return NOTHING;
  }
  const gap = elapsedMs >= SCORE_RUSH_FROM_MS ? 0 : SCORE_REPORT_GAP_MS;
  return due(lastScoreSentAt, now, gap)
    ? { send: { type: 'SCORE', score: local.score }, wakeAt: null }
    : { send: null, wakeAt: (lastScoreSentAt ?? now) + gap };
}
