import { useEffect, useRef, useState } from 'react';
import type { Friend } from '../api/friends';
import { messageOf } from '../api/http';
import { invitesApi } from '../api/invites';
import type { Room } from '../api/types';
import { MemberAvatar } from '../components/Avatar';
import { CheckIcon, PeopleIcon, UserPlusIcon } from '../components/icons';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui';
import type { FriendsState } from '../friends/FriendsContext';

type Props = { open: boolean; room: Room; friends: FriendsState; onClose: () => void };

/** 초대를 보낸 친구 번호들. 서버가 알려 준 시간(다시 초대할 수 있을 때까지) 동안만 들어 있다. 창을 닫았다 열어도 남는다. */
function useSentInvites() {
  const [sent, setSent] = useState<ReadonlySet<number>>(new Set());
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  const mark = (friendId: number, cooldownSeconds: number) => {
    setSent((current) => new Set(current).add(friendId));
    timers.current.push(window.setTimeout(() => {
      setSent((current) => new Set([...current].filter((id) => id !== friendId)));
    }, cooldownSeconds * 1000));
  };

  return { sent, mark };
}

/**
 * 대기실에서 친구를 부르는 창. 접속 중인 친구가 위에 오고(서버 순서) "초대" 버튼이 있다.
 * 접속해 있지 않은 친구는 흐리게만 보이고, 이미 방에 앉아 있는 친구는 그렇게 적는다.
 */
export function InviteFriendsModal({ open, room, friends, onClose }: Props) {
  const toast = useToast();
  const { sent, mark } = useSentInvites();
  const [sending, setSending] = useState<number | null>(null);
  const { refresh } = friends;
  const full = room.members.length >= room.maxPlayers;

  // 열 때마다 접속 여부를 새로 불러온다.
  useEffect(() => {
    if (open) {
      void refresh().catch(() => undefined);
    }
  }, [open, refresh]);

  const invite = async (friend: Friend) => {
    setSending(friend.memberId);
    try {
      const result = await invitesApi.send(room.code, friend.memberId);
      mark(friend.memberId, result.cooldownSeconds);
    } catch (error) {
      toast.show(messageOf(error));
      // 그사이 친구가 나갔거나 방에 들어왔을 수 있으니 목록을 서버와 맞춘다.
      void refresh().catch(() => undefined);
    } finally {
      setSending(null);
    }
  };

  const stateOf = (friend: Friend): RowState => {
    if (room.members.some((member) => member.id === friend.memberId)) {
      return 'in-room';
    }
    if (!friend.online) {
      return 'offline';
    }
    return sent.has(friend.memberId) ? 'sent' : 'ready';
  };

  return (
    <Modal open={open} title="친구 초대" onClose={onClose} padding="snug">
      <div className="flex flex-col gap-3">
        <div className="pr-8">
          <h2 className="flex items-center gap-2 text-lg font-bold text-wood-800"><UserPlusIcon className="h-5 w-5" />친구 초대</h2>
          <p className="mt-0.5 text-sm text-stone-600">접속 중인 친구를 <b className="text-wood-800">{room.name}</b> 방으로 불러요.</p>
        </div>
        {full ? <p role="note" className="rounded-xl bg-mustard-200/60 px-3 py-2 text-sm font-bold text-wood-800">자리가 다 찼어요. 자리가 나면 다시 초대할 수 있어요.</p> : null}
        {friends.friends.length === 0 ? (
          <p data-testid="invite-no-friends" className="flex flex-col items-center gap-2 rounded-xl bg-cream-200/60 px-3 py-6 text-center text-sm font-bold text-wood-700">
            <PeopleIcon className="h-7 w-7 text-wood-500" />
            <span>아직 친구가 없어요.<br />화면 위쪽 친구 아이콘에서 닉네임으로 친구를 추가해 보세요.</span>
          </p>
        ) : (
          <ul aria-label="친구" className="-mx-1 flex max-h-[min(55vh,360px)] flex-col gap-0.5 overflow-y-auto px-1">
            {friends.friends.map((friend) => (
              <FriendRow key={friend.memberId} friend={friend} state={stateOf(friend)} disabled={full || sending !== null} onInvite={() => void invite(friend)} />
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

type RowState = 'ready' | 'sent' | 'offline' | 'in-room';

function FriendRow({ friend, state, disabled, onInvite }: { friend: Friend; state: RowState; disabled: boolean; onInvite: () => void }) {
  const offline = state === 'offline';
  return (
    <li data-testid={`invite-row-${friend.memberId}`} data-state={state} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
      <MemberAvatar memberId={friend.memberId} avatar={friend.avatar} size={36} className={offline ? 'opacity-50' : ''} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={`truncate font-bold ${offline ? 'text-stone-500' : 'text-wood-800'}`}>{friend.nickname}</span>
        <span className={`flex items-center gap-1 text-xs font-semibold ${friend.online ? 'text-green-700' : 'text-stone-500'}`}>
          <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${friend.online ? 'bg-green-500' : 'bg-stone-400'}`} />
          {friend.online ? '온라인' : '오프라인'}
        </span>
      </span>
      <RowAction friend={friend} state={state} disabled={disabled} onInvite={onInvite} />
    </li>
  );
}

function RowAction({ friend, state, disabled, onInvite }: { friend: Friend; state: RowState; disabled: boolean; onInvite: () => void }) {
  if (state === 'in-room') {
    return <span className="shrink-0 text-xs font-bold text-stone-500">이미 방에 있어요</span>;
  }
  if (state === 'offline') {
    return null;
  }
  if (state === 'sent') {
    return (
      <span role="status" className="flex shrink-0 items-center gap-1 rounded-xl bg-cream-200 px-3 py-1.5 text-xs font-bold text-wood-700">
        <CheckIcon className="h-3.5 w-3.5" />초대 보냄
      </span>
    );
  }
  return (
    <Button variant="success" aria-label={`${friend.nickname}님 초대`} disabled={disabled} onClick={onInvite} className="shrink-0 px-3.5 py-1.5">초대</Button>
  );
}
