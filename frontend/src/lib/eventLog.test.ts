import { describe, expect, it } from 'vitest';
import { describeChanges, LOG_LIMIT, prependLog } from './eventLog';
import type { PaperSafariView } from '../api/types';

const nick = (id: number) => ({ 1: '앨리스', 2: '밥' })[id] ?? '플레이어';

function view(overrides: Omit<Partial<PaperSafariView>, 'round'> & { round?: Partial<PaperSafariView['round']> }): PaperSafariView {
  const base: PaperSafariView = {
    viewerId: 1,
    status: 'IN_ROUND',
    roundNumber: 1,
    round: { phase: 'DRAW', currentPlayerId: 1, deckSize: 30, discardTop: null, held: null, boards: [] },
    lastRoundResult: null,
    winnerId: null,
  };
  return { ...base, ...overrides, round: { ...base.round, ...overrides.round } };
}

describe('describeChanges', () => {
  it('처음 받은 화면은 기록하지 않는다', () => {
    expect(describeChanges(null, view({}), nick).map((entry) => entry.text)).toEqual([]);
  });

  it('카드를 가져오고 내려놓는 것을 기록한다', () => {
    const drawn = view({ round: { phase: 'PLACE', held: { playerId: 1, source: 'DECK', card: null } } });
    expect(describeChanges(view({}), drawn, nick).map((entry) => entry.text)).toEqual(['앨리스님이 덱에서 카드를 가져왔어요']);
    const placed = view({ round: { phase: 'DRAW', currentPlayerId: 2 } });
    expect(describeChanges(drawn, placed, nick).map((entry) => entry.text)).toEqual(['앨리스님이 카드를 내려놓았어요']);
  });

  it('기록마다 종류와 행동한 사람을 담는다', () => {
    const drawn = view({ round: { phase: 'PLACE', held: { playerId: 1, source: 'DECK', card: null } } });
    expect(describeChanges(view({}), drawn, nick)[0]).toMatchObject({ kind: 'draw-deck', actorId: 1 });
    const fromDiscard = view({ round: { phase: 'PLACE', held: { playerId: 2, source: 'DISCARD', card: null } } });
    expect(describeChanges(view({}), fromDiscard, nick)[0]).toMatchObject({ kind: 'draw-discard', actorId: 2 });
    const placed = view({ round: { phase: 'DRAW', currentPlayerId: 2 } });
    expect(describeChanges(drawn, placed, nick)[0]).toMatchObject({ kind: 'place', actorId: 1 });
  });

  it('버린 카드 더미에서 가져온 카드를 되돌리면 되돌렸다고 기록한다', () => {
    const drawn = view({ round: { phase: 'PLACE', held: { playerId: 1, source: 'DISCARD', card: null } } });
    const undone = view({ round: { phase: 'DRAW', currentPlayerId: 1 } });
    expect(describeChanges(drawn, undone, nick).map((entry) => entry.text)).toEqual(['앨리스님이 가져온 카드를 되돌렸어요']);
  });

  it('준비 단계가 끝나면 시작 플레이어를 알린다', () => {
    const setup = view({ round: { phase: 'SETUP_FLIP', currentPlayerId: 2 } });
    const started = view({ round: { phase: 'DRAW', currentPlayerId: 2 } });
    expect(describeChanges(setup, started, nick).map((entry) => entry.text)).toEqual(['밥님부터 시작해요']);
  });

  it('코끼리 엿보기를 알린다', () => {
    const placing = view({ round: { phase: 'PLACE', held: { playerId: 1, source: 'DECK', card: null } } });
    const peeking = view({ round: { phase: 'PEEK' } });
    expect(describeChanges(placing, peeking, nick).map((entry) => entry.text)).toEqual(['앨리스님이 카드를 내려놓았어요', '앨리스님이 코끼리로 카드를 엿보고 있어요']);
  });

  it('게임 승자를 알린다', () => {
    const over = view({
      status: 'GAME_OVER',
      winnerId: 1,
      round: { phase: 'ROUND_OVER' },
      lastRoundResult: { players: [{ playerId: 1, score: 1, outcome: 'WIN' }, { playerId: 2, score: 9, outcome: 'LOSE' }] },
    });
    expect(describeChanges(view({}), over, nick).map((entry) => entry.text)).toEqual(['앨리스님이 게임에서 승리했어요!']);
  });

  it('최저점이 동점이면 무승부로 끝났다고 알린다', () => {
    const draw = view({
      status: 'GAME_OVER',
      round: { phase: 'ROUND_OVER' },
      lastRoundResult: { players: [{ playerId: 1, score: 3, outcome: 'DRAW' }, { playerId: 2, score: 3, outcome: 'DRAW' }] },
    });
    expect(describeChanges(view({}), draw, nick).map((entry) => entry.text)).toEqual(['무승부로 끝났어요']);
  });

  it('끝난 게임 뒤 새 게임이 시작되면 알린다', () => {
    const over = view({ status: 'GAME_OVER', winnerId: 1, round: { phase: 'ROUND_OVER' } });
    const fresh = view({ roundNumber: 1, round: { phase: 'SETUP_FLIP' } });
    expect(describeChanges(over, fresh, nick).map((entry) => entry.text)).toEqual(['새 게임을 시작해요']);
  });

  it('시간 초과 자동 행동은 autoActSeq가 늘 때 한 번만 시간 초과로 기록한다', () => {
    const before = view({ round: { phase: 'PLACE', currentPlayerId: 2, held: { playerId: 2, source: 'DECK', card: null } }, autoActSeq: 0, lastAutoActorIds: [] });
    const after = view({ round: { phase: 'DRAW', currentPlayerId: 1 }, autoActSeq: 1, lastAutoActorIds: [2] });
    const timeouts = describeChanges(before, after, nick).filter((entry) => entry.kind === 'timeout');
    expect(timeouts).toEqual([{ kind: 'timeout', actorId: 2, text: '시간이 지나 밥님 대신 카드를 내려놓았어요' }]);
    const again = view({ round: { phase: 'DRAW', currentPlayerId: 1 }, autoActSeq: 1, lastAutoActorIds: [2] });
    expect(describeChanges(after, again, nick).filter((entry) => entry.kind === 'timeout')).toEqual([]);
  });

  it('시작 뒤집기 시간 초과는 안 뒤집은 사람마다 기록한다', () => {
    const before = view({ round: { phase: 'SETUP_FLIP' }, autoActSeq: 2 });
    const after = view({ round: { phase: 'DRAW' }, autoActSeq: 3, lastAutoActorIds: [1, 2] });
    expect(describeChanges(before, after, nick).filter((entry) => entry.kind === 'timeout').map((entry) => entry.text))
      .toEqual(['시간이 지나 앨리스님 대신 카드를 뒤집었어요', '시간이 지나 밥님 대신 카드를 뒤집었어요']);
  });

  it('진행 기록은 새 것을 앞에 붙이고 게임 동안 200개까지 남긴다', () => {
    const entry = (id: number) => ({ id, at: id, kind: 'other' as const, text: String(id) });
    const old = Array.from({ length: 199 }, (_, index) => entry(index));
    const next = prependLog(old, [entry(1000), entry(1001)]);
    expect(LOG_LIMIT).toBe(200);
    expect(next).toHaveLength(200);
    expect(next[0].id).toBe(1000);
    expect(next.at(-1)?.id).toBe(197);
  });
});
