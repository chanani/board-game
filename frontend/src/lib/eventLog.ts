import type { PaperSafariView } from '../api/types';

type Nickname = (memberId: number) => string;

const SOURCE_LABELS = { DECK: '덱', DISCARD: '버린 카드 더미' } as const;

/** 되돌리기(CANCEL_DRAW)는 같은 사람의 DRAW 단계로 돌아간다. 카드를 내려놓으면 차례가 넘어가거나 엿보기가 된다. */
function isUndo(holderId: number, next: PaperSafariView): boolean {
  return next.round.phase === 'DRAW' && next.round.currentPlayerId === holderId;
}

function heldChanges(prev: PaperSafariView, next: PaperSafariView, nicknameOf: Nickname): string[] {
  const before = prev.round.held;
  const after = next.round.held;
  if (!before && after) {
    return [`${nicknameOf(after.playerId)}님이 ${SOURCE_LABELS[after.source]}에서 카드를 가져왔어요`];
  }
  if (before && !after && before.source === 'DISCARD' && isUndo(before.playerId, next)) {
    return [`${nicknameOf(before.playerId)}님이 가져온 카드를 되돌렸어요`];
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

function gameResult(prev: PaperSafariView, next: PaperSafariView, nicknameOf: Nickname): string[] {
  if (prev.status === 'GAME_OVER' || next.status !== 'GAME_OVER') {
    return [];
  }
  if (next.winnerId === null) {
    return ['무승부로 끝났어요'];
  }
  return [`${nicknameOf(next.winnerId)}님이 게임에서 승리했어요! 🎉`];
}

export function describeChanges(prev: PaperSafariView | null, next: PaperSafariView, nicknameOf: Nickname): string[] {
  if (!prev) {
    return [];
  }
  if (prev.status === 'GAME_OVER' && next.status !== 'GAME_OVER') {
    return ['새 게임을 시작해요'];
  }
  return [
    ...heldChanges(prev, next, nicknameOf),
    ...phaseChanges(prev, next, nicknameOf),
    ...gameResult(prev, next, nicknameOf),
  ];
}
