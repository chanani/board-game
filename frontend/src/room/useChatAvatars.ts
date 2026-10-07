import { useMemo, useRef } from 'react';
import type { ChatMessage } from '../api/chat';
import type { Room } from '../api/types';
import { roomAvatarOf } from '../lib/avatars';

type Cached = { source: ChatMessage; shown: ChatMessage };

/**
 * 채팅 메시지에 보낸 사람 그림 키를 붙인다. 방 정보가 갱신될 때마다 새 객체를 만들면 채팅 목록이 바뀐 것으로 보여
 * 스크롤이 맨 아래로 끌려가므로, 원본과 그림이 같으면 이전 객체(그리고 이전 배열)를 그대로 돌려준다.
 */
export function useChatAvatars(messages: ChatMessage[], room: Room | null): ChatMessage[] {
  const cache = useRef(new Map<number, Cached>());
  const previous = useRef<ChatMessage[]>([]);
  return useMemo(() => {
    const next = new Map<number, Cached>();
    const shown = messages.map((message) => {
      const avatar = room ? roomAvatarOf(room, message.memberId) : message.avatar;
      const cached = cache.current.get(message.id);
      const reusable = cached && cached.source === message && cached.shown.avatar === avatar;
      const entry = reusable ? cached : { source: message, shown: { ...message, avatar } };
      next.set(message.id, entry);
      return entry.shown;
    });
    cache.current = next;
    const same = shown.length === previous.current.length && shown.every((message, index) => message === previous.current[index]);
    if (same) {
      return previous.current;
    }
    previous.current = shown;
    return shown;
  }, [messages, room]);
}
