import { useState, type FormEvent, type ReactNode } from 'react';
import type { FriendRequest, SendFriendResult } from '../api/friends';
import { ApiError, messageOf } from '../api/http';
import { MemberAvatar } from '../components/Avatar';
import { CheckIcon, CloseIcon } from '../components/icons';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui';
import type { FriendsState } from './FriendsContext';

type Notice = { tone: 'ok' | 'error'; text: string };

const NICKNAME_MAX = 10;

/** 요청이 잘 갔을 때의 안내. 상대가 먼저 보낸 요청이 있었다면 바로 친구가 된다. */
export function sentMessage(result: SendFriendResult): string {
  return result.status === 'ACCEPTED' ? `${result.nickname}님과 친구가 됐어요.` : `${result.nickname}님에게 친구 요청을 보냈어요.`;
}

/** 닉네임으로 찾지 못했을 때는 서버의 일반 문구("회원을 찾을 수 없습니다") 대신 무엇을 고치면 되는지 알려 준다. */
function sendErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === 'MEMBER_NOT_FOUND') {
    return '닉네임을 다시 확인해주세요.';
  }
  return messageOf(error);
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

/** 닉네임으로 친구 요청을 보내고, 받은 요청(수락·거절)과 보낸 요청(취소)을 본다. */
export function FriendAddTab({ friends }: { friends: FriendsState }) {
  const toast = useToast();
  const [nickname, setNickname] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const trimmed = nickname.trim();

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed || sending) {
      return;
    }
    setSending(true);
    try {
      const result = await friends.requestByNickname(trimmed);
      setNotice({ tone: 'ok', text: sentMessage(result) });
      setNickname('');
    } catch (error) {
      setNotice({ tone: 'error', text: sendErrorMessage(error) });
    } finally {
      setSending(false);
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
      <form onSubmit={send} className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <input aria-label="친구로 추가할 닉네임" value={nickname} maxLength={NICKNAME_MAX} placeholder="닉네임을 입력해 주세요" autoComplete="off"
            onChange={(event) => { setNickname(event.target.value); setNotice(null); }}
            className="min-w-0 flex-1 rounded-xl border border-cream-300 bg-cream px-3 py-2 text-sm shadow-[inset_0_2px_4px_rgb(0_0_0/0.12)] outline-none focus:border-mustard-400 focus:ring-2 focus:ring-mustard-300/50" />
          <Button type="submit" disabled={!trimmed || sending} className="shrink-0">요청</Button>
        </div>
        {notice ? (
          <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`px-1 text-xs font-bold ${notice.tone === 'error' ? 'text-red-700' : 'text-green-700'}`}>
            {notice.text}
          </p>
        ) : null}
      </form>
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
