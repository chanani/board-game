import { request } from './http';
import type { BotDifficulty, GameType, Room, RoomSummary, RoomTheme } from './types';

const path = (code: string) => `/api/rooms/${encodeURIComponent(code)}`;

export const roomsApi = {
  list: (gameType: GameType) => request<RoomSummary[]>(`/api/rooms?gameType=${gameType}`),
  async mine(): Promise<Room | null> {
    const room = await request<Room | undefined>('/api/rooms/me');
    return room ?? null;
  },
  get: (code: string) => request<Room>(path(code)),
  create: (name: string, gameType: GameType, maxPlayers: number, theme: RoomTheme, password?: string) =>
    request<Room>('/api/rooms', { method: 'POST', body: { name, gameType, maxPlayers, theme, password } }),
  join: (code: string, password?: string) => request<Room>(`${path(code)}/join`, { method: 'POST', body: { password } }),
  watch: (code: string) => request<Room>(`${path(code)}/watch`, { method: 'POST' }),
  seat: (code: string) => request<Room>(`${path(code)}/seat`, { method: 'POST' }),
  leave: (code: string) => request<void>(`${path(code)}/leave`, { method: 'POST' }),
  ready: (code: string, ready: boolean) => request<Room>(`${path(code)}/ready`, { method: 'POST', body: { ready } }),
  updateSettings: (code: string, maxPlayers: number, theme: RoomTheme) =>
    request<Room>(`${path(code)}/settings`, { method: 'PATCH', body: { maxPlayers, theme } }),
  start: (code: string) => request<Room>(`${path(code)}/start`, { method: 'POST' }),
  kick: (code: string, memberId: number) => request<void>(`${path(code)}/members/${memberId}/kick`, { method: 'POST' }),
  addBot: (code: string, difficulty: BotDifficulty) => request<Room>(`${path(code)}/bots`, { method: 'POST', body: { difficulty } }),
  changeBot: (code: string, botId: number, difficulty: BotDifficulty) =>
    request<Room>(`${path(code)}/bots/${botId}`, { method: 'PATCH', body: { difficulty } }),
  forfeit: (code: string, memberId: number) => request<void>(`${path(code)}/members/${memberId}/forfeit`, { method: 'POST' }),
};
