import { request } from './http';
import type { GameSummary } from './types';

export const gamesApi = {
  list: () => request<GameSummary[]>('/api/games'),
};
