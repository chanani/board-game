import { describe, expect, it } from 'vitest';
import { describeChanges } from './eventLog';
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
    expect(describeChanges(view({}), over, nick).map((entry) => entry.text)).toEqual(['앨리스님이 게임에서 승리했어요! 🎉']);
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
});
