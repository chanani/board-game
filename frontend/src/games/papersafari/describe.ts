import type { PaperSafariView } from '../../api/types';
import type { LogDraft } from '../../lib/eventLog';

type Nickname = (memberId: number) => string;

const SOURCE_LABELS = { DECK: '덱', DISCARD: '버린 카드 더미' } as const;

/** 되돌리기(CANCEL_DRAW)는 같은 사람의 DRAW 단계로 돌아간다. 카드를 내려놓으면 차례가 넘어가거나 엿보기가 된다. */
function isUndo(holderId: number, next: PaperSafariView): boolean {
  return next.round.phase === 'DRAW' && next.round.currentPlayerId === holderId;
}

function heldChanges(prev: PaperSafariView, next: PaperSafariView, nicknameOf: Nickname): LogDraft[] {
  const before = prev.round.held;
  const after = next.round.held;
  if (!before && after) {
    const kind = after.source === 'DECK' ? 'draw-deck' : 'draw-discard';
    return [{ kind, actorId: after.playerId, text: `${nicknameOf(after.playerId)}님이 ${SOURCE_LABELS[after.source]}에서 카드를 가져왔어요` }];
  }
  if (before && !after && before.source === 'DISCARD' && isUndo(before.playerId, next)) {
    return [{ kind: 'undo', actorId: before.playerId, text: `${nicknameOf(before.playerId)}님이 가져온 카드를 되돌렸어요` }];
  }
  if (before && !after && next.roundNumber === prev.roundNumber) {
    return [{ kind: 'place', actorId: before.playerId, text: `${nicknameOf(before.playerId)}님이 카드를 내려놓았어요` }];
  }
  return [];
}

function phaseChanges(prev: PaperSafariView, next: PaperSafariView, nicknameOf: Nickname): LogDraft[] {
  if (prev.round.phase === 'SETUP_FLIP' && next.round.phase === 'DRAW' && prev.roundNumber === next.roundNumber) {
    return [{ kind: 'start', actorId: next.round.currentPlayerId, text: `${nicknameOf(next.round.currentPlayerId)}님부터 시작해요` }];
  }
  if (prev.round.phase !== 'PEEK' && next.round.phase === 'PEEK') {
    return [{ kind: 'peek', actorId: next.round.currentPlayerId, text: `${nicknameOf(next.round.currentPlayerId)}님이 코끼리로 카드를 엿보고 있어요` }];
  }
  return [];
}

function gameResult(prev: PaperSafariView, next: PaperSafariView, nicknameOf: Nickname): LogDraft[] {
  if (prev.status === 'GAME_OVER' || next.status !== 'GAME_OVER') {
    return [];
  }
  if (next.winnerId === null) {
    return [{ kind: 'result', text: '무승부로 끝났어요' }];
  }
  return [{ kind: 'result', actorId: next.winnerId, text: `${nicknameOf(next.winnerId)}님이 게임에서 승리했어요!` }];
}

const AUTO_ACTIONS: Record<string, string> = {
  SETUP_FLIP: '카드를 뒤집었어요',
  DRAW: '카드를 가져와 내려놓았어요',
  PLACE: '카드를 내려놓았어요',
  PEEK: '카드를 엿보았어요',
};

/** 서버가 시간 초과로 대신 행동하면 autoActSeq가 는다. 늘어난 그 한 번만 기록한다. */
function timeouts(prev: PaperSafariView, next: PaperSafariView, nicknameOf: Nickname): LogDraft[] {
  if ((next.autoActSeq ?? 0) <= (prev.autoActSeq ?? 0)) {
    return [];
  }
  const action = AUTO_ACTIONS[prev.round.phase] ?? '행동했어요';
  return (next.lastAutoActorIds ?? []).map((actorId) => ({ kind: 'timeout', actorId, text: `시간이 지나 ${nicknameOf(actorId)}님 대신 ${action}` }));
}

export function describePaperSafari(prev: PaperSafariView | null, next: PaperSafariView, nicknameOf: Nickname): LogDraft[] {
  if (!prev) {
    return [];
  }
  if (prev.status === 'GAME_OVER' && next.status !== 'GAME_OVER') {
    return [{ kind: 'other', text: '새 게임을 시작해요' }];
  }
  return [
    ...heldChanges(prev, next, nicknameOf),
    ...phaseChanges(prev, next, nicknameOf),
    // 같은 화면 변화의 기록 중 가장 마지막(최신)에 두어 차례 안내 바의 마지막 기록 줄에 보이게 한다.
    ...timeouts(prev, next, nicknameOf),
    ...gameResult(prev, next, nicknameOf),
  ];
}
