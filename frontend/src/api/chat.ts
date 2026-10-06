import { request } from './http';

/** spectator: 보낸 시점에 관전자였는지(서버가 채운다). 예전 기록에는 없을 수 있다. */
export type ChatMessage = { id: number; memberId: number; nickname: string; text: string; sentAt: string; spectator?: boolean };

/** 개인 큐(/user/queue/chat)로 오는 메시지에는 어느 방의 글인지가 함께 온다. */
export type ChatPush = ChatMessage & { roomCode: string };

export const chatApi = {
  history: (code: string) => request<ChatMessage[]>(`/api/rooms/${encodeURIComponent(code)}/chat`),
};
