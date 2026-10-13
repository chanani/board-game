import type { FruitStackSessionView, FruitStackView } from '../../api/types';
import type { LogDraft } from '../../lib/eventLog';
import type { Nickname } from '../gameModule';
import { formatScore } from './texts';

const START: LogDraft = { kind: 'start', text: '새 게임을 시작해요. 과일을 합쳐 점수를 쌓아요' };

// 이미 진행 중이거나 끝난 화면을 처음 받은 경우(새로고침·관전 입장)는 쓰지 않는다.
function describeFirst(next: FruitStackView): LogDraft[] {
  const fresh = next.status === 'IN_PROGRESS' && next.players.every((player) => player.score === 0);
  return fresh ? [START] : [];
}

function describeOuts(prev: FruitStackView, next: FruitStackView, nicknameOf: Nickname): LogDraft[] {
  const wasPlaying = (playerId: number) => prev.players.some((player) => player.playerId === playerId && player.state === 'PLAYING');
  return next.players
    .filter((player) => player.state === 'OUT' && wasPlaying(player.playerId))
    .map((player) => ({ kind: 'finish', actorId: player.playerId, text: `${nicknameOf(player.playerId)}님의 판이 가득 찼어요 (${formatScore(player.score)}점)` }));
}

function describeWinner(next: FruitStackView, nicknameOf: Nickname): LogDraft[] {
  const standings = next.result?.standings ?? [];
  if (next.winnerId !== null) {
    const score = standings.find((standing) => standing.playerId === next.winnerId)?.score ?? 0;
    return [{ kind: 'result', actorId: next.winnerId, text: `${nicknameOf(next.winnerId)}님이 ${formatScore(score)}점으로 이겼어요!` }];
  }
  const tied = standings.filter((standing) => standing.outcome === 'DRAW');
  if (tied.length === 0) {
    return [];
  }
  const names = tied.map((standing) => nicknameOf(standing.playerId)).join('님, ');
  return [{ kind: 'result', text: `${names}님이 ${formatScore(tied[0].score)}점으로 비겼어요` }];
}

function describeEnd(next: FruitStackView, nicknameOf: Nickname): LogDraft[] {
  const reason = next.result?.reason;
  if (reason === 'FORFEIT') {
    return next.winnerId === null ? [] : [{ kind: 'result', actorId: next.winnerId, text: `모두 나가서 ${nicknameOf(next.winnerId)}님이 이겼어요` }];
  }
  const timeout: LogDraft[] = reason === 'TIME_UP' ? [{ kind: 'timeout', text: '10분이 지나 지금 점수로 끝났어요' }] : [];
  return [...timeout, ...describeWinner(next, nicknameOf)];
}

/** 스펙 6.7: 이벤트 목록이 없으므로 이전 화면과 새 화면을 견준다. 기권은 방 채널이 이미 쓰고, 점수 변화는 쓰지 않는다. */
export function describeFruitStack(prev: FruitStackSessionView | null, next: FruitStackSessionView, nicknameOf: Nickname): LogDraft[] {
  if (!prev || prev.game.startedAt !== next.game.startedAt) {
    return describeFirst(next.game);
  }
  const ended = prev.game.status === 'IN_PROGRESS' && next.game.status === 'GAME_OVER';
  return [...describeOuts(prev.game, next.game, nicknameOf), ...(ended ? describeEnd(next.game, nicknameOf) : [])];
}
