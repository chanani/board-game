import { request } from './http';
import type { GameType, MemberStats, Ranking, RecentMatch } from './types';

export const recordsApi = {
  me: () => request<MemberStats>('/api/records/me'),
  member: (memberId: number) => request<MemberStats>(`/api/records/members/${memberId}`),
  matches: (memberId: number, gameType: GameType, limit = 10) =>
    request<RecentMatch[]>(`/api/records/members/${memberId}/matches?gameType=${gameType}&limit=${limit}`),
  rankings: (gameType: GameType) => request<Ranking[]>(`/api/records/rankings?gameType=${gameType}`),
};
