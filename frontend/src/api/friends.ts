import { request } from './http';

/** online: 지금 사이트에 접속해 있는지(방 안팎과 상관없다). */
export type Friend = { memberId: number; nickname: string; avatar?: string; online: boolean };
/** 요청 한 건. memberId·nickname·avatar는 상대(받은 요청이면 보낸 사람, 보낸 요청이면 받는 사람)다. */
export type FriendRequest = { requestId: number; memberId: number; nickname: string; avatar?: string };
export type FriendRequests = { incoming: FriendRequest[]; outgoing: FriendRequest[] };
/** ACCEPTED: 상대가 먼저 보낸 요청이 있어서 바로 친구가 됐다. */
export type SendFriendResult = { status: 'REQUESTED' | 'ACCEPTED'; memberId: number; nickname: string };
/** 나와 찾은 사람의 사이. REQUEST_SENT: 내가 보내고 기다리는 중, REQUEST_RECEIVED: 그 사람이 나에게 보냈다. */
export type FriendSearchRelation = 'NONE' | 'FRIEND' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'SELF';
/** 닉네임으로 찾은 회원. relation은 찾은 그때의 사이다. */
export type FriendSearchResult = { memberId: number; nickname: string; avatar?: string; relation: FriendSearchRelation };
/** /user/queue/friends로 오는 알림. nickname은 상대 닉네임(UPDATED에는 없다). */
export type FriendSignal = { type: 'REQUEST_RECEIVED' | 'REQUEST_ACCEPTED' | 'UPDATED'; nickname?: string | null };

const REQUESTS = '/api/friends/requests';

export const friendsApi = {
  list: () => request<Friend[]>('/api/friends'),
  requests: () => request<FriendRequests>(REQUESTS),
  /** 닉네임이 정확히 같은 회원을 찾는다(요청은 보내지 않는다). 없으면 MEMBER_NOT_FOUND. */
  search: (nickname: string) => request<FriendSearchResult>(`/api/friends/search?nickname=${encodeURIComponent(nickname)}`),
  requestById: (memberId: number) => request<SendFriendResult>(REQUESTS, { method: 'POST', body: { memberId } }),
  accept: (requestId: number) => request<void>(`${REQUESTS}/${requestId}/accept`, { method: 'POST' }),
  decline: (requestId: number) => request<void>(`${REQUESTS}/${requestId}/decline`, { method: 'POST' }),
  cancel: (requestId: number) => request<void>(`${REQUESTS}/${requestId}`, { method: 'DELETE' }),
  remove: (memberId: number) => request<void>(`/api/friends/${memberId}`, { method: 'DELETE' }),
};
