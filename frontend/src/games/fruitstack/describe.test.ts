import { describe, expect, it } from 'vitest';
import type { FruitStackEndReason, FruitStackStanding } from '../../api/types';
import { describeFruitStack } from './describe';
import { FRUIT_STARTED_AT, fruitPlayer, fruitSession } from './fruitStackFixtures';

const nick = (id: number) => `P${id}`;
const START = { kind: 'start', text: '새 게임을 시작해요. 과일을 합쳐 점수를 쌓아요' };
const standing = (playerId: number, score: number, outcome: FruitStackStanding['outcome'], rank: number, state: FruitStackStanding['state'] = 'OUT'): FruitStackStanding =>
  ({ playerId, score, outcome, rank, state });
const ended = (reason: FruitStackEndReason, standings: FruitStackStanding[], winnerId: number | null) =>
  fruitSession({
    status: 'GAME_OVER', deadline: null, winnerId, result: { reason, standings },
    players: standings.map((entry) => fruitPlayer(entry.playerId, entry.score, entry.state)).sort((a, b) => a.playerId - b.playerId),
  });

describe('describeFruitStack(스펙 6.7)', () => {
  it('처음 받은 0점 진행 화면은 시작 줄을 쓴다', () => {
    expect(describeFruitStack(null, fruitSession(), nick)).toEqual([START]);
  });

  it('진행 중이거나 끝난 화면을 처음 받으면 쓰지 않는다', () => {
    expect(describeFruitStack(null, fruitSession({ players: [fruitPlayer(1, 6), fruitPlayer(2)] }), nick)).toEqual([]);
    expect(describeFruitStack(null, ended('ALL_OUT', [standing(1, 0, 'DRAW', 1), standing(2, 0, 'DRAW', 1)], null), nick)).toEqual([]);
  });

  it('같은 방의 다음 경기는 시작 줄을 쓴다', () => {
    const prev = ended('ALL_OUT', [standing(1, 320, 'WIN', 1), standing(2, 100, 'LOSE', 2)], 1);

    expect(describeFruitStack(prev, fruitSession({ startedAt: FRUIT_STARTED_AT + 90_000 }), nick)).toEqual([START]);
  });

  it('탈락하면 한 줄을 쓴다', () => {
    const prev = fruitSession({ participantIds: [1, 2, 3], players: [fruitPlayer(1, 10), fruitPlayer(2, 1200), fruitPlayer(3)] });
    const next = fruitSession({ participantIds: [1, 2, 3], players: [fruitPlayer(1, 10), fruitPlayer(2, 1250, 'OUT'), fruitPlayer(3)] });

    expect(describeFruitStack(prev, next, nick)).toEqual([{ kind: 'finish', actorId: 2, text: 'P2님의 판이 가득 찼어요 (1,250점)' }]);
  });

  it('점수만 바뀌면 쓰지 않고 같은 화면 두 번에도 쓰지 않는다', () => {
    const next = fruitSession({ players: [fruitPlayer(1, 10), fruitPlayer(2, 3, 'OUT')] });

    expect(describeFruitStack(fruitSession(), fruitSession({ players: [fruitPlayer(1, 10), fruitPlayer(2, 3)] }), nick)).toEqual([]);
    expect(describeFruitStack(next, next, nick)).toEqual([]);
    const over = ended('ALL_OUT', [standing(1, 320, 'WIN', 1), standing(2, 100, 'LOSE', 2)], 1);
    expect(describeFruitStack(over, over, nick)).toEqual([]);
  });

  it('승자 한 명으로 끝나면', () => {
    const prev = fruitSession({ players: [fruitPlayer(1, 300), fruitPlayer(2, 100, 'OUT')] });
    const allOut = ended('ALL_OUT', [standing(1, 320, 'WIN', 1), standing(2, 100, 'LOSE', 2)], 1);
    const decided = ended('DECIDED', [standing(1, 320, 'WIN', 1, 'PLAYING'), standing(2, 100, 'LOSE', 2)], 1);
    const result = { kind: 'result', actorId: 1, text: 'P1님이 320점으로 이겼어요!' };

    expect(describeFruitStack(prev, allOut, nick)).toEqual([{ kind: 'finish', actorId: 1, text: 'P1님의 판이 가득 찼어요 (320점)' }, result]);
    expect(describeFruitStack(prev, decided, nick)).toEqual([result]);
  });

  it('시간이 다 되어 비기면', () => {
    const prev = fruitSession({ players: [fruitPlayer(1, 40), fruitPlayer(2, 40)] });
    const next = ended('TIME_UP', [standing(1, 40, 'DRAW', 1, 'PLAYING'), standing(2, 40, 'DRAW', 1, 'PLAYING')], null);

    expect(describeFruitStack(prev, next, nick)).toEqual([
      { kind: 'timeout', text: '10분이 지나 지금 점수로 끝났어요' },
      { kind: 'result', text: 'P1님, P2님이 40점으로 비겼어요' },
    ]);
  });

  it('시간이 다 되어 한 명이 이기면 시간 줄 다음에 승자 줄을 쓴다', () => {
    const prev = fruitSession({ players: [fruitPlayer(1, 70), fruitPlayer(2, 40)] });
    const next = ended('TIME_UP', [standing(1, 70, 'WIN', 1, 'PLAYING'), standing(2, 40, 'LOSE', 2, 'PLAYING')], 1);

    expect(describeFruitStack(prev, next, nick).map((line) => line.kind)).toEqual(['timeout', 'result']);
  });

  it('상대가 모두 나가 끝나면', () => {
    const next = ended('FORFEIT', [standing(1, 12, 'WIN', 1, 'PLAYING'), standing(2, 90, 'LOSE', 2, 'FORFEITED')], 1);

    expect(describeFruitStack(fruitSession({ players: [fruitPlayer(1, 12), fruitPlayer(2, 90)] }), next, nick)).toEqual([{ kind: 'result', actorId: 1, text: '모두 나가서 P1님이 이겼어요' }]);
  });

  it('기권은 쓰지 않는다', () => {
    const prev = fruitSession({ participantIds: [1, 2, 3], players: [fruitPlayer(1), fruitPlayer(2), fruitPlayer(3)] });
    const next = fruitSession({ participantIds: [1, 2, 3], players: [fruitPlayer(1), fruitPlayer(2, 0, 'FORFEITED'), fruitPlayer(3)] });

    expect(describeFruitStack(prev, next, nick)).toEqual([]);
  });
});
