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
  create: (name: string, gameType: GameType, maxPlayers: number, password?: string) =>
    request<Room>('/api/rooms', { method: 'POST', body: { name, gameType, maxPlayers, password } }),
  join: (code: string, password?: string) => request<Room>(`${path(code)}/join`, { method: 'POST', body: { password } }),
  watch: (code: string) => request<Room>(`${path(code)}/watch`, { method: 'POST' }),
  seat: (code: string) => request<Room>(`${path(code)}/seat`, { method: 'POST' }),
  leave: (code: string) => request<void>(`${path(code)}/leave`, { method: 'POST' }),
  ready: (code: string, ready: boolean) => request<Room>(`${path(code)}/ready`, { method: 'POST', body: { ready } }),
  start: (code: string) => request<Room>(`${path(code)}/start`, { method: 'POST' }),
  kick: (code: string, memberId: number) => request<void>(`${path(code)}/members/${memberId}/kick`, { method: 'POST' }),
  forfeit: (code: string, memberId: number) => request<void>(`${path(code)}/members/${memberId}/forfeit`, { method: 'POST' }),
};
