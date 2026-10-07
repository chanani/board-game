import { describe, expect, it } from 'vitest';
import type { Room } from '../api/types';
import { AVATAR_KEYS, avatarOf, defaultAvatar, roomAvatarOf, withMyAvatar } from './avatars';

const room: Room = {
  code: 'ABC234', name: '방', gameType: 'UNO', gameTypeName: '우노', status: 'WAITING', hostId: 1, maxPlayers: 4, locked: false, theme: 'WOOD',
  members: [
    { id: 1, nickname: '앨리스', avatar: 'FROG', host: true, connected: true, offlineSeconds: 0, ready: false },
    { id: 2, nickname: '밥', host: false, connected: true, offlineSeconds: 0, ready: false },
  ],
  spectators: [{ id: 3, nickname: '캐롤', avatar: 'KOALA' }],
};

describe('프로필 그림 키', () => {
  it('서버 enum과 같은 12종이고, 기본 그림은 id를 12로 나눈 나머지 자리다', () => {
    expect(AVATAR_KEYS).toEqual(['CAT', 'DOG', 'RABBIT', 'BEAR', 'PANDA', 'FOX', 'FROG', 'CHICK', 'PIG', 'KOALA', 'TIGER', 'PENGUIN']);
    expect(defaultAvatar(1)).toBe('DOG');
    expect(defaultAvatar(12)).toBe('CAT');
    expect(defaultAvatar(23)).toBe('PENGUIN');
  });

  it('모르는 키나 빈 값은 기본 그림으로 바꾼다', () => {
    expect(avatarOf('TIGER', 5)).toBe('TIGER');
    expect(avatarOf('DRAGON', 5)).toBe('FOX');
    expect(avatarOf(undefined, 5)).toBe('FOX');
  });

  it('방의 참가자·관전자 그림을 찾고, 방에 없는 사람은 기본 그림이다', () => {
    expect(roomAvatarOf(room, 1)).toBe('FROG');
    expect(roomAvatarOf(room, 2)).toBe('RABBIT');
    expect(roomAvatarOf(room, 3)).toBe('KOALA');
    expect(roomAvatarOf(room, 9)).toBe('KOALA');
  });

  it('내 그림을 막 바꿨으면 방 정보의 내 그림을 바꾸고, 같으면 같은 객체를 돌려준다', () => {
    const patched = withMyAvatar(room, 1, 'PIG');
    expect(patched.members[0].avatar).toBe('PIG');
    expect(patched.members[1]).toBe(room.members[1]);
    expect(withMyAvatar(room, 1, 'FROG')).toBe(room);
    expect(withMyAvatar(room, 1, undefined)).toBe(room);
    expect(withMyAvatar(null, 1, 'PIG')).toBeNull();
    expect(withMyAvatar(room, 3, 'CAT').spectators[0].avatar).toBe('CAT');
  });
});
