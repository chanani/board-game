import type { FruitStackView } from '../../api/types';
import type { Nickname } from '../gameModule';

/** state가 PLAYING인 사람(자리 순). */
export function aliveIds(game: FruitStackView): number[] {
  return game.players.filter((player) => player.state === 'PLAYING').map((player) => player.playerId);
}

/** R26 (나): 살아 있는 사람이 한 명이고 견줄 사람이 있을 때, 그 사람이 이기려면 더 얻어야 할 점수. 아니면 null. */
export function pointsToWin(game: FruitStackView, aliveScore?: number): { playerId: number; points: number } | null {
  const alive = game.players.filter((player) => player.state === 'PLAYING');
  // 기권한 사람의 점수는 승패에 쓰지 않으므로 견주지 않는다(R27).
  const rivals = game.players.filter((player) => player.state === 'OUT');
  if (alive.length !== 1 || rivals.length === 0) {
    return null;
  }
  const best = Math.max(...rivals.map((player) => player.score));
  const points = best - (aliveScore ?? alive[0].score) + 1;
  return points < 1 ? null : { playerId: alive[0].playerId, points };
}

export function formatScore(score: number): string {
  return String(Math.trunc(score)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 남은 시간을 올림한 초로 "m:ss". */
export function formatClock(remainingMs: number | null): string {
  const seconds = remainingMs === null ? 0 : Math.max(0, Math.ceil(remainingMs / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** 스펙 6.6. myScore는 내 판의 점수(보고 전의 합치기까지 담긴 값). */
export function instructionOf(game: FruitStackView, meId: number, nicknameOf: Nickname, wide: boolean, myScore: number | null): string {
  if (game.status === 'GAME_OVER') {
    return '게임이 끝났어요.';
  }
  const mine = game.players.find((player) => player.playerId === meId);
  if (mine?.state === 'PLAYING') {
    const left = pointsToWin(game, myScore ?? mine.score);
    if (left?.playerId === meId) {
      const points = formatScore(left.points);
      return wide ? `혼자 남았어요. ${points}점만 더 얻으면 이겨요.` : `${points}점만 더 얻으면 이겨요`;
    }
    return wide ? '끌어서 자리를 정하고 놓으면 떨어져요.' : '끌어서 놓으면 떨어져요';
  }
  const left = pointsToWin(game);
  if (left) {
    const name = nicknameOf(left.playerId);
    const points = formatScore(left.points);
    return wide ? `${name}님이 ${points}점만 더 얻으면 이겨요.` : `${name}님 ${points}점 남음`;
  }
  if (mine?.state === 'OUT') {
    return wide ? '판이 가득 찼어요. 남은 사람의 판을 지켜보세요.' : '남은 판을 지켜보세요';
  }
  return wide ? '모두 과일을 쌓는 중…' : '과일을 쌓는 중…';
}
