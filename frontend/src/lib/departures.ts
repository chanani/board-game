import type { Room } from '../api/types';

export type Departure = { memberId: number; text: string };

/** 내가 방에서 빠진 갱신이면, 같이 빠진 사람들의 알림은 이미 떠난 내게 의미가 없다. */
function wasRemoved(prev: Room, next: Room, meId: number): boolean {
  const had = prev.members.some((member) => member.id === meId);
  return had && !next.members.some((member) => member.id === meId);
}

/** 게임 중이던 방에서 나를 뺀 참가자가 빠졌으면, 사람마다 알림 문구를 만든다(끊겨 있던 사람은 자동 기권 문구). */
export function departures(prev: Room, next: Room, meId: number): Departure[] {
  if (prev.status !== 'PLAYING' || wasRemoved(prev, next, meId)) {
    return [];
  }
  const remaining = new Set(next.members.map((member) => member.id));
  return prev.members
    .filter((member) => member.id !== meId && !remaining.has(member.id))
    .map((member) => ({
      memberId: member.id,
      text: member.connected ? `${member.nickname}님이 기권하고 나갔어요` : `연결이 끊겨 ${member.nickname}님을 기권 처리했어요`,
    }));
}
