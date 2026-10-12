import { request } from './http';
import type { GameType, Room } from './types';

/**
 * /user/queue/invites로 오는 알림. INVITED는 내가 초대받았다(memberId·nickname = 초대한 사람),
 * DECLINED는 내가 보낸 초대를 상대가 거절했다(memberId·nickname = 거절한 사람, 방 정보는 없다).
 */
export type InviteSignal = {
  type: 'INVITED' | 'DECLINED';
  inviteId?: string | null;
  memberId: number;
  nickname: string;
  roomCode?: string | null;
  roomName?: string | null;
  gameType?: GameType | null;
  gameTypeName?: string | null;
  /** 초대가 살아 있는 시간(초). 지나면 서버가 받아 주지 않는다. */
  expiresInSeconds?: number | null;
};

/** cooldownSeconds가 지나야 같은 친구를 다시 초대할 수 있다. */
export type InviteSent = { cooldownSeconds: number };

const path = (code: string) => `/api/rooms/${encodeURIComponent(code)}/invites`;
const one = (code: string, inviteId: string) => `${path(code)}/${encodeURIComponent(inviteId)}`;

export const invitesApi = {
  send: (code: string, friendId: number) => request<InviteSent>(path(code), { method: 'POST', body: { friendId } }),
  /** 초대로 들어간다. 비공개방이어도 비밀번호를 묻지 않는다. */
  accept: (code: string, inviteId: string) => request<Room>(`${one(code, inviteId)}/accept`, { method: 'POST' }),
  decline: (code: string, inviteId: string) => request<void>(`${one(code, inviteId)}/decline`, { method: 'POST' }),
};
