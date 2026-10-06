import { createContext, useContext, type ReactNode } from 'react';

/** 채팅에서 사람마다 쓰는 색: 이름 글자색과 옅은 말풍선 바탕. */
export type ChatTone = { name: string; bubble: string };

export const CHAT_TONES: ChatTone[] = [
  { name: 'text-orange-700', bubble: 'bg-orange-100' },
  { name: 'text-teal-700', bubble: 'bg-teal-100' },
  { name: 'text-violet-700', bubble: 'bg-violet-100' },
  { name: 'text-pink-700', bubble: 'bg-pink-100' },
  { name: 'text-blue-700', bubble: 'bg-blue-100' },
];

type Occupants = { members: { id: number }[]; spectators: { id: number }[] };

/** 방에 들어온 순서(참가자, 그다음 관전자)로 사람마다 색 번호를 정한다. */
export function chatOrderOf(room: Occupants): Map<number, number> {
  const ids = [...room.members, ...room.spectators].map((occupant) => occupant.id);
  return new Map(ids.map((id, index) => [id, index]));
}

/** 방에 없는 사람(이미 나간 사람)은 번호로 색을 정해, 같은 사람은 늘 같은 색이 되게 한다. */
export function toneOf(order: Map<number, number>, memberId: number): ChatTone {
  const index = order.get(memberId) ?? memberId;
  return CHAT_TONES[index % CHAT_TONES.length];
}

const ChatOrderContext = createContext<Map<number, number>>(new Map());

export function ChatColorProvider({ order, children }: { order: Map<number, number>; children: ReactNode }) {
  return <ChatOrderContext.Provider value={order}>{children}</ChatOrderContext.Provider>;
}

export function useChatTone(): (memberId: number) => ChatTone {
  const order = useContext(ChatOrderContext);
  return (memberId) => toneOf(order, memberId);
}
