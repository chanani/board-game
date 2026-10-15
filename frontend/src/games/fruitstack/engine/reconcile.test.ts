import { describe, expect, it } from 'vitest';
import { planReport, type ReportInput } from './reconcile';

const input = (overrides: Partial<ReportInput> = {}): ReportInput => ({
  connected: true, gameOver: false, now: 10_000, elapsedMs: 10_000, local: { score: 30, out: false },
  server: { score: 10, state: 'PLAYING' }, lastScoreSentAt: null, lastOutSentAt: null, holdUntil: 0, ...overrides,
});
const NOTHING = { send: null, wakeAt: null };

describe('R18·R20·R21 보고 계획', () => {
  it('R18 내 점수가 서버보다 크면 총점을 보낸다', () => {
    expect(planReport(input())).toEqual({ send: { type: 'SCORE', score: 30 }, wakeAt: null });
  });

  it('R18 마지막으로 보낸 지 500ms가 안 됐으면 그때 깨어난다', () => {
    expect(planReport(input({ lastScoreSentAt: 9_700 }))).toEqual({ send: null, wakeAt: 10_200 });
    expect(planReport(input({ lastScoreSentAt: 9_500 }))).toEqual({ send: { type: 'SCORE', score: 30 }, wakeAt: null });
  });

  it('R18 경기 마지막 3초는 묶지 않고 바로 보낸다', () => {
    expect(planReport(input({ elapsedMs: 597_000, lastScoreSentAt: 9_990 }))).toEqual({ send: { type: 'SCORE', score: 30 }, wakeAt: null });
    expect(planReport(input({ elapsedMs: 596_999, lastScoreSentAt: 9_990 }))).toEqual({ send: null, wakeAt: 10_490 });
  });

  it('S3 상한이 없는 혼자 하기는 10분이 지나도 계속 500ms로 묶는다', () => {
    expect(planReport(input({ timed: false, elapsedMs: 900_000, lastScoreSentAt: 9_990 }))).toEqual({ send: null, wakeAt: 10_490 });
    expect(planReport(input({ timed: false, elapsedMs: 900_000, lastScoreSentAt: 9_400 }))).toEqual({ send: { type: 'SCORE', score: 30 }, wakeAt: null });
  });

  it('점수가 같거나 서버가 더 크면 보내지 않는다', () => {
    expect(planReport(input({ local: { score: 10, out: false } }))).toEqual(NOTHING);
    expect(planReport(input({ local: { score: 5, out: false } }))).toEqual(NOTHING);
  });

  it('R21 끊겼거나 끝났거나 내가 참가자가 아니거나 서버에서 이미 탈락이면 아무것도 보내지 않는다', () => {
    expect(planReport(input({ connected: false }))).toEqual(NOTHING);
    expect(planReport(input({ gameOver: true }))).toEqual(NOTHING);
    expect(planReport(input({ server: null }))).toEqual(NOTHING);
    expect(planReport(input({ server: { score: 10, state: 'OUT' }, local: { score: 30, out: true } }))).toEqual(NOTHING);
    expect(planReport(input({ server: { score: 10, state: 'FORFEITED' } }))).toEqual(NOTHING);
  });

  it('R20·R21 내 판이 탈락인데 서버는 아직 모르면 탈락을 보내고 1초에 한 번까지 다시 보낸다', () => {
    const out = { score: 30, out: true };

    expect(planReport(input({ local: out }))).toEqual({ send: { type: 'OUT', score: 30 }, wakeAt: 11_000 });
    expect(planReport(input({ local: out, lastOutSentAt: 9_400 }))).toEqual({ send: null, wakeAt: 10_400 });
    expect(planReport(input({ local: out, lastOutSentAt: 9_000 }))).toEqual({ send: { type: 'OUT', score: 30 }, wakeAt: 11_000 });
    expect(planReport(input({ local: { score: 5, out: true } })).send).toEqual({ type: 'OUT', score: 10 });
  });

  it('R21 미루는 동안에는 보내지 않고 그 시각에 깨어난다', () => {
    expect(planReport(input({ holdUntil: 15_000 }))).toEqual({ send: null, wakeAt: 15_000 });
    expect(planReport(input({ holdUntil: 15_000, local: { score: 30, out: true } }))).toEqual({ send: null, wakeAt: 15_000 });
    expect(planReport(input({ holdUntil: 10_000 })).send).toEqual({ type: 'SCORE', score: 30 });
  });
});
