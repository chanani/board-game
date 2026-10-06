import { request } from './http';

export type ChatMessage = { id: number; memberId: number; nickname: string; text: string; sentAt: string };

/** 개인 큐(/user/queue/chat)로 오는 메시지에는 어느 방의 글인지가 함께 온다. */
export type ChatPush = ChatMessage & { roomCode: string };

export const chatApi = {
  history: (code: string) => request<ChatMessage[]>(`/api/rooms/${encodeURIComponent(code)}/chat`),
};
