import type { PaperSafariView } from '../api/types';

type Nickname = (memberId: number) => string;

const SOURCE_LABELS = { DECK: '덱', DISCARD: '버린 카드 더미' } as const;

function heldChanges(prev: PaperSafariView, next: PaperSafariView, nicknameOf: Nickname): string[] {
  const before = prev.round.held;
  const after = next.round.held;
  if (!before && after) {
    return [`${nicknameOf(after.playerId)}님이 ${SOURCE_LABELS[after.source]}에서 카드를 가져왔어요`];
  }
  if (before && !after && next.roundNumber === prev.roundNumber) {
    return [`${nicknameOf(before.playerId)}님이 카드를 내려놓았어요`];
  }
  return [];
}

function phaseChanges(prev: PaperSafariView, next: PaperSafariView, nicknameOf: Nickname): string[] {
  if (prev.round.phase === 'SETUP_FLIP' && next.round.phase === 'DRAW' && prev.roundNumber === next.roundNumber) {
    return [`${nicknameOf(next.round.currentPlayerId)}님부터 시작해요`];
  }
  if (prev.round.phase !== 'PEEK' && next.round.phase === 'PEEK') {
    return [`${nicknameOf(next.round.currentPlayerId)}님이 코끼리로 카드를 엿보고 있어요`];
  }
  return [];
}

function roundResult(prev: PaperSafariView, next: PaperSafariView, nicknameOf: Nickname): string[] {
  if (prev.round.phase === 'ROUND_OVER' || next.round.phase !== 'ROUND_OVER' || !next.lastRoundResult) {
    return [];
  }
  const winner = next.lastRoundResult.players.find((player) => player.outcome === 'WIN');
  if (!winner) {
    return [`${next.roundNumber}라운드는 무승부예요`];
  }
  return [`${nicknameOf(winner.playerId)}님이 ${next.roundNumber}라운드에서 이겼어요`];
}

function gameResult(prev: PaperSafariView, next: PaperSafariView, nicknameOf: Nickname): string[] {
  if (prev.status === 'GAME_OVER' || next.status !== 'GAME_OVER' || next.winnerId === null) {
    return [];
  }
  return [`${nicknameOf(next.winnerId)}님이 게임에서 승리했어요! 🎉`];
}

function newRound(prev: PaperSafariView, next: PaperSafariView): string[] {
  if (next.roundNumber <= prev.roundNumber) {
    return [];
  }
  return [`${next.roundNumber}라운드를 시작해요`];
}

export function describeChanges(prev: PaperSafariView | null, next: PaperSafariView, nicknameOf: Nickname): string[] {
  if (!prev) {
    return [];
  }
  if (prev.status === 'GAME_OVER' && next.status !== 'GAME_OVER') {
    return ['새 게임을 시작해요'];
  }
  return [
    ...newRound(prev, next),
    ...heldChanges(prev, next, nicknameOf),
    ...phaseChanges(prev, next, nicknameOf),
    ...roundResult(prev, next, nicknameOf),
    ...gameResult(prev, next, nicknameOf),
  ];
}
