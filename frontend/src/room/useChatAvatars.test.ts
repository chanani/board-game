import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../api/chat';
import type { Room } from '../api/types';
import { useChatAvatars } from './useChatAvatars';

const room: Room = {
  code: 'ABC234', name: '방', gameType: 'UNO', gameTypeName: '우노', status: 'WAITING', hostId: 1, maxPlayers: 4, locked: false, theme: 'WOOD',
  members: [{ id: 2, nickname: '밥', avatar: 'FROG', host: false, connected: true, offlineSeconds: 0, ready: false }],
  spectators: [],
};
const messages: ChatMessage[] = [{ id: 1, memberId: 2, nickname: '밥', text: '안녕', sentAt: '' }];

describe('useChatAvatars', () => {
  it('보낸 사람 그림을 붙이고, 그림이 같은 방 정보 갱신에는 같은 배열·객체를 돌려준다', () => {
    const { result, rerender } = renderHook(({ shown }) => useChatAvatars(messages, shown), { initialProps: { shown: room } });
    const first = result.current;
    expect(first[0].avatar).toBe('FROG');

    rerender({ shown: { ...room, members: room.members.map((member) => ({ ...member, connected: false })) } });
    expect(result.current).toBe(first);

    rerender({ shown: { ...room, members: room.members.map((member) => ({ ...member, avatar: 'PIG' })) } });
    expect(result.current).not.toBe(first);
    expect(result.current[0].avatar).toBe('PIG');
  });
});
