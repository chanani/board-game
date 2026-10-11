import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { friendsApi, type Friend, type FriendRequest, type FriendSignal, type SendFriendResult } from '../api/friends';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { usePolling } from '../lib/usePolling';
import { useRealtime } from '../realtime/RealtimeContext';

export type FriendsState = {
  meId: number;
  friends: Friend[];
  /** 내가 받은 요청. 헤더 아이콘과 "친구 추가" 탭의 숫자 배지가 이 개수다. */
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  refresh: () => Promise<void>;
  requestByNickname: (nickname: string) => Promise<SendFriendResult>;
  requestById: (memberId: number) => Promise<SendFriendResult>;
  accept: (requestId: number) => Promise<void>;
  decline: (requestId: number) => Promise<void>;
  cancel: (requestId: number) => Promise<void>;
  remove: (memberId: number) => Promise<void>;
};

/** 나와 그 사람의 사이. incoming: 그 사람이 나에게 요청을 보냈다, outgoing: 내가 보내고 기다리는 중. */
export type FriendRelation = 'me' | 'friend' | 'incoming' | 'outgoing' | 'none';

/** 접속 여부는 따로 밀어 주지 않아서 이 간격으로 다시 불러온다(요청·수락은 알림이 오면 바로 불러온다). */
export const FRIENDS_POLL_MS = 20000;

const FriendsContext = createContext<FriendsState | null>(null);

type Lists = Pick<FriendsState, 'friends' | 'incoming' | 'outgoing'>;
const EMPTY: Lists = { friends: [], incoming: [], outgoing: [] };

function toastOf(signal: FriendSignal): string | null {
  if (signal.type === 'REQUEST_RECEIVED' && signal.nickname) {
    return `${signal.nickname}님이 친구 요청을 보냈어요.`;
  }
  if (signal.type === 'REQUEST_ACCEPTED' && signal.nickname) {
    return `${signal.nickname}님과 친구가 됐어요.`;
  }
  return null;
}

export function FriendsProvider({ children }: { children: ReactNode }) {
  const { member } = useAuth();
  const { realtime } = useRealtime();
  const toast = useToast();
  const [lists, setLists] = useState<Lists>(EMPTY);

  const refresh = useCallback(async () => {
    const [friends, requests] = await Promise.all([friendsApi.list(), friendsApi.requests()]);
    setLists({ friends, incoming: requests.incoming, outgoing: requests.outgoing });
  }, []);

  usePolling(refresh, FRIENDS_POLL_MS);

  useEffect(() => realtime.subscribe('/user/queue/friends', (body) => {
    const message = toastOf(body as FriendSignal);
    if (message) {
      toast.show(message, 'info');
    }
    void refresh().catch(() => undefined);
  }), [realtime, refresh, toast]);

  const value = useMemo<FriendsState | null>(() => {
    if (!member) {
      return null;
    }
    // 성공하든 실패하든(이미 처리된 요청 등) 목록을 다시 불러와 화면을 서버와 맞춘다.
    const synced = <T,>(action: Promise<T>) => action.finally(() => refresh().catch(() => undefined));
    return {
      meId: member.id,
      ...lists,
      refresh,
      requestByNickname: (nickname) => synced(friendsApi.requestByNickname(nickname)),
      requestById: (memberId) => synced(friendsApi.requestById(memberId)),
      accept: (requestId) => synced(friendsApi.accept(requestId)),
      decline: (requestId) => synced(friendsApi.decline(requestId)),
      cancel: (requestId) => synced(friendsApi.cancel(requestId)),
      remove: (memberId) => synced(friendsApi.remove(memberId)),
    };
  }, [member, lists, refresh]);

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

/** 친구 기능을 쓸 수 없는 곳(FriendsProvider 밖)에서는 null이라, 쓰는 쪽은 친구 버튼을 그리지 않는다. */
export function useFriends(): FriendsState | null {
  return useContext(FriendsContext);
}

export function relationOf(state: Lists & { meId: number }, memberId: number): FriendRelation {
  if (memberId === state.meId) {
    return 'me';
  }
  if (state.friends.some((friend) => friend.memberId === memberId)) {
    return 'friend';
  }
  if (state.incoming.some((request) => request.memberId === memberId)) {
    return 'incoming';
  }
  return state.outgoing.some((request) => request.memberId === memberId) ? 'outgoing' : 'none';
}
