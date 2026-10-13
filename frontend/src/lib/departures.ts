import type { Room, RoomMember } from '../api/types';

export type Departure = { memberId: number; text: string };

/** 내가 그 방의 참가자나 관전자인지. */
export function isPresent(room: Room, meId: number): boolean {
  return room.members.some((member) => member.id === meId) || room.spectators.some((spectator) => spectator.id === meId);
}

/** 내가 방에서 빠진 갱신이면, 같이 빠진 사람들의 알림은 이미 떠난 내게 의미가 없다. */
function wasRemoved(prev: Room, next: Room, meId: number): boolean {
  const had = prev.members.some((member) => member.id === meId);
  return had && !next.members.some((member) => member.id === meId);
}

const departureText = (member: RoomMember, finished: boolean): string => {
  if (finished) {
    return `${member.nickname}님이 나갔어요`;
  }
  return member.connected ? `${member.nickname}님이 기권하고 나갔어요` : `연결이 끊겨 ${member.nickname}님을 기권 처리했어요`;
};

/**
 * 게임 중이던 방에서 나를 뺀 참가자가 빠졌으면, 사람마다 알림 문구를 만든다(끊겨 있던 사람은 자동 기권 문구).
 * finished: 이미 자기 판을 끝내 나가도 기권이 아닌 사람(과일 쌓기에서 탈락한 사람). 그 사람은 "나갔어요"로만 알린다.
 */
export function departures(prev: Room, next: Room, meId: number, finished: (memberId: number) => boolean = () => false): Departure[] {
  if (prev.status !== 'PLAYING' || wasRemoved(prev, next, meId)) {
    return [];
  }
  const remaining = new Set(next.members.map((member) => member.id));
  return prev.members
    .filter((member) => member.id !== meId && !remaining.has(member.id))
    .map((member) => ({ memberId: member.id, text: departureText(member, finished(member.id)) }));
}
