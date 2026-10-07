import { ApiError, request } from './http';
import type { Member } from './types';

export const authApi = {
  async me(): Promise<Member | null> {
    try {
      return await request<Member>('/api/members/me');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return null;
      }
      throw error;
    }
  },
  login: (loginId: string, password: string) =>
    request<Member>('/api/auth/login', { method: 'POST', body: { loginId, password } }),
  signup: (loginId: string, nickname: string, password: string) =>
    request<Member>('/api/members', { method: 'POST', body: { loginId, nickname, password } }),
  changeAvatar: (avatar: string) => request<Member>('/api/members/me/avatar', { method: 'PATCH', body: { avatar } }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
};
