import { request } from './http';
import type { GameType, Room, RoomSummary } from './types';

const path = (code: string) => `/api/rooms/${encodeURIComponent(code)}`;

export const roomsApi = {
  list: (gameType: GameType) => request<RoomSummary[]>(`/api/rooms?gameType=${gameType}`),
  async mine(): Promise<Room | null> {
    const room = await request<Room | undefined>('/api/rooms/me');
    return room ?? null;
  },
  get: (code: string) => request<Room>(path(code)),
  create: (name: string, gameType: GameType) => request<Room>('/api/rooms', { method: 'POST', body: { name, gameType } }),
  join: (code: string) => request<Room>(`${path(code)}/join`, { method: 'POST' }),
  leave: (code: string) => request<void>(`${path(code)}/leave`, { method: 'POST' }),
  start: (code: string) => request<Room>(`${path(code)}/start`, { method: 'POST' }),
  forfeit: (code: string, memberId: number) => request<void>(`${path(code)}/members/${memberId}/forfeit`, { method: 'POST' }),
};
