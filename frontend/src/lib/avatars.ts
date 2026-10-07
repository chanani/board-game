import type { ChatMessage } from '../api/chat';
import type { Room } from '../api/types';

/** 서버 Avatar enum과 같은 순서·키. 기본 그림은 회원 id를 12로 나눈 나머지 자리다(백엔드 Avatar.defaultFor와 같다). */
export const AVATAR_KEYS = ['CAT', 'DOG', 'RABBIT', 'BEAR', 'PANDA', 'FOX', 'FROG', 'CHICK', 'PIG', 'KOALA', 'TIGER', 'PENGUIN'] as const;
export type AvatarKey = (typeof AVATAR_KEYS)[number];

export const AVATAR_LABELS: Record<AvatarKey, string> = {
  CAT: '고양이', DOG: '강아지', RABBIT: '토끼', BEAR: '곰', PANDA: '판다', FOX: '여우',
  FROG: '개구리', CHICK: '병아리', PIG: '돼지', KOALA: '코알라', TIGER: '호랑이', PENGUIN: '펭귄',
};

export function isAvatarKey(value: unknown): value is AvatarKey {
  return typeof value === 'string' && (AVATAR_KEYS as readonly string[]).includes(value);
}

export function defaultAvatar(memberId: number): AvatarKey {
  const count = AVATAR_KEYS.length;
  return AVATAR_KEYS[((Math.trunc(memberId) % count) + count) % count];
}

/** 서버가 준 키가 없거나 모르는 키면 회원 id로 정한 기본 그림을 쓴다. */
export function avatarOf(key: string | null | undefined, memberId: number): AvatarKey {
  return isAvatarKey(key) ? key : defaultAvatar(memberId);
}

/** 방에 있는 사람(참가자·관전자)의 그림. 방을 떠난 사람은 id로 정한 기본 그림. */
export function roomAvatarOf(room: Room, memberId: number): AvatarKey {
  const person = room.members.find((member) => member.id === memberId) ?? room.spectators.find((spectator) => spectator.id === memberId);
  return avatarOf(person?.avatar, memberId);
}

/**
 * 방금 내 그림을 바꿨으면 다음 방 갱신을 기다리지 않고 내 자리에 바로 보이게 방 정보의 내 그림을 바꿔 둔다.
 * 바꿀 것이 없으면 같은 객체를 돌려줘 방 변화에 걸린 효과가 다시 돌지 않는다.
 */
export function withMyAvatar<T extends Room | null>(room: T, meId: number, mine: string | null | undefined): T {
  if (!room || !isAvatarKey(mine)) {
    return room;
  }
  const stale = (person: { id: number; avatar?: string }) => person.id === meId && person.avatar !== mine;
  if (!room.members.some(stale) && !room.spectators.some(stale)) {
    return room;
  }
  const patch = <P extends { id: number; avatar?: string }>(person: P): P => (person.id === meId ? { ...person, avatar: mine } : person);
  return { ...room, members: room.members.map(patch), spectators: room.spectators.map(patch) };
}

/** 채팅 메시지에 보낸 사람의 그림 키를 붙인다(방 정보 기준). */
export function withChatAvatars(messages: ChatMessage[], room: Room | null): ChatMessage[] {
  if (!room) {
    return messages;
  }
  return messages.map((message) => ({ ...message, avatar: roomAvatarOf(room, message.memberId) }));
}
