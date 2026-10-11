import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { friendsApi, type FriendRequest, type FriendSearchRelation, type FriendSearchResult } from '../api/friends';
import { ApiError, messageOf } from '../api/http';
import { MemberAvatar } from '../components/Avatar';
import { CheckIcon, CloseIcon } from '../components/icons';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui';
import { FriendSearchCard } from './FriendSearchCard';
import { relationOf, type FriendRelation, type FriendsState } from './FriendsContext';

const NICKNAME_MAX = 10;

/** 닉네임으로 찾지 못했을 때는 서버의 일반 문구("회원을 찾을 수 없습니다") 대신 무엇을 고치면 되는지 알려 준다. */
function searchErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === 'MEMBER_NOT_FOUND') {
    return '닉네임을 다시 확인해주세요.';
  }
  return messageOf(error);
}

const LIVE_RELATION: Record<FriendRelation, FriendSearchRelation> = {
  me: 'SELF', friend: 'FRIEND', incoming: 'REQUEST_RECEIVED', outgoing: 'REQUEST_SENT', none: 'NONE',
};

type Lists = Pick<FriendsState, 'friends' | 'incoming' | 'outgoing'>;

/** 찾은 사람과, 찾은 그때 내가 들고 있던 목록(그 뒤로 목록을 새로 받았는지 가리는 데 쓴다). */
type Found = { member: FriendSearchResult; lists: Lists };

function sameLists(seen: Lists, now: Lists): boolean {
  return seen.friends === now.friends && seen.incoming === now.incoming && seen.outgoing === now.outgoing;
}

/**
 * 카드에 보여 줄 사이. 검색 응답은 찾은 그때의 사이라, 그 뒤에 목록을 새로 받았으면(요청·수락·취소·알림·주기적 갱신)
 * 더 새것인 목록을 따른다. 그래서 카드와 아래 "보낸 요청" 목록이 어긋나지 않는다.
 */
function relationFor(found: Found, friends: FriendsState): FriendSearchRelation {
  if (sameLists(found.lists, friends)) {
    return found.member.relation;
  }
  return LIVE_RELATION[relationOf(friends, found.member.memberId)];
}

const iconButton = 'grid h-8 w-8 shrink-0 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-mustard-300 disabled:opacity-45';

function RequestRow({ request, children }: { request: FriendRequest; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 px-1 py-1">
      <MemberAvatar memberId={request.memberId} avatar={request.avatar} size={32} />
      <span className="min-w-0 flex-1 truncate font-bold">{request.nickname}</span>
      {children}
    </li>
  );
}

function Section({ title, count, empty, children }: { title: string; count: number; empty: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-1">
      <h3 className="px-1 text-xs font-bold text-stone-500">{title} {count > 0 ? count : ''}</h3>
      {count === 0 ? <p className="px-1 py-1 text-sm text-stone-500">{empty}</p> : <ul className="flex flex-col">{children}</ul>}
    </section>
  );
}

/** 닉네임으로 사람을 찾아 친구 요청을 보내고, 받은 요청(수락·거절)과 보낸 요청(취소)을 본다. */
export function FriendAddTab({ friends }: { friends: FriendsState }) {
  const toast = useToast();
  const [nickname, setNickname] = useState('');
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<Found | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const trimmed = nickname.trim();
  // 검색 응답이 도착한 때의 목록을 기억해 두려고, 늘 지금 목록을 가리키게 둔다.
  const listsRef = useRef<Lists>(friends);
  listsRef.current = friends;

  // 입력을 고치면 안내를 지우고, 다 지우면 찾아 둔 카드도 치운다.
  const edit = (value: string) => {
    setNickname(value);
    setError(null);
    if (!value.trim()) {
      setFound(null);
    }
  };

  // 찾기만 한다. 요청은 카드의 버튼을 눌러야 간다.
  const search = async (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed || searching) {
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const member = await friendsApi.search(trimmed);
      setFound({ member, lists: listsRef.current });
    } catch (failure) {
      setFound(null);
      setError(searchErrorMessage(failure));
    } finally {
      setSearching(false);
    }
  };

  // 한 줄을 처리하는 동안 그 줄의 버튼을 잠그고, 실패하면 서버 안내를 토스트로 보여 준다.
  const act = async (requestId: number, action: (requestId: number) => Promise<void>) => {
    setBusyId(requestId);
    try {
      await action(requestId);
    } catch (error) {
      toast.show(messageOf(error));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <form onSubmit={search} role="search" aria-label="닉네임으로 친구 찾기" className="flex items-center gap-2">
          <input aria-label="친구로 추가할 닉네임" value={nickname} maxLength={NICKNAME_MAX} placeholder="닉네임을 입력해 주세요" autoComplete="off"
            onChange={(event) => edit(event.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-cream-300 bg-cream px-3 py-2 text-sm shadow-[inset_0_2px_4px_rgb(0_0_0/0.12)] outline-none focus:border-mustard-400 focus:ring-2 focus:ring-mustard-300/50" />
          <Button type="submit" disabled={!trimmed || searching} className="shrink-0">검색</Button>
        </form>
        {error ? <p role="alert" className="px-1 text-xs font-bold text-red-700">{error}</p> : null}
        {found ? <FriendSearchCard member={found.member} relation={relationFor(found, friends)} onRequest={friends.requestById} /> : null}
      </div>
      <hr className="border-wood-700/15" />
      <div className="flex max-h-[min(45vh,300px)] flex-col gap-3 overflow-y-auto">
        <Section title="받은 요청" count={friends.incoming.length} empty="받은 요청이 없어요.">
          {friends.incoming.map((request) => (
            <RequestRow key={request.requestId} request={request}>
              <button type="button" aria-label={`${request.nickname}님 요청 수락`} disabled={busyId === request.requestId}
                onClick={() => void act(request.requestId, friends.accept)} className={`${iconButton} bg-green-600 text-white hover:bg-green-500`}>
                <CheckIcon className="h-4 w-4" />
              </button>
              <button type="button" aria-label={`${request.nickname}님 요청 거절`} disabled={busyId === request.requestId}
                onClick={() => void act(request.requestId, friends.decline)} className={`${iconButton} bg-stone-200 text-stone-700 hover:bg-stone-300`}>
                <CloseIcon className="h-4 w-4" />
              </button>
            </RequestRow>
          ))}
        </Section>
        <Section title="보낸 요청" count={friends.outgoing.length} empty="보낸 요청이 없어요.">
          {friends.outgoing.map((request) => (
            <RequestRow key={request.requestId} request={request}>
              <span className="shrink-0 text-xs text-stone-500">기다리는 중</span>
              <button type="button" aria-label={`${request.nickname}님에게 보낸 요청 취소`} disabled={busyId === request.requestId}
                onClick={() => void act(request.requestId, friends.cancel)} className={`${iconButton} bg-stone-200 text-stone-700 hover:bg-stone-300`}>
                <CloseIcon className="h-4 w-4" />
              </button>
            </RequestRow>
          ))}
        </Section>
      </div>
    </div>
  );
}
