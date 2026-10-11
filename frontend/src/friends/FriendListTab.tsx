import type { Friend } from '../api/friends';
import { MemberAvatar } from '../components/Avatar';
import { ChevronRightIcon } from '../components/icons';

type Props = { friends: Friend[]; onPick: (friend: Friend) => void };

/** 친구 목록. 접속 중인 친구가 위에 오고(서버 순서), 누르면 그 친구의 전적 창이 뜬다. */
export function FriendListTab({ friends, onPick }: Props) {
  if (friends.length === 0) {
    return (
      <p data-testid="no-friends" className="rounded-xl bg-cream-200/60 px-3 py-6 text-center text-sm font-bold text-wood-700">
        아직 친구가 없어요.<br />친구 추가에서 닉네임으로 찾아보세요.
      </p>
    );
  }
  const online = friends.filter((friend) => friend.online).length;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="px-1 text-xs text-stone-500">접속 중 {online}명 · 전체 {friends.length}명</p>
      <ul className="-mx-1 flex max-h-[min(50vh,320px)] flex-col overflow-y-auto px-1">
        {friends.map((friend) => (
          <li key={friend.memberId}>
            <button type="button" aria-label={`${friend.nickname}님 전적 보기, ${friend.online ? '온라인' : '오프라인'}`} onClick={() => onPick(friend)}
              className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left outline-none hover:bg-cream-200/70 focus-visible:ring-2 focus-visible:ring-mustard-300">
              <MemberAvatar memberId={friend.memberId} avatar={friend.avatar} size={36} className={friend.online ? '' : 'opacity-60'} />
              <span className="min-w-0 flex-1 truncate font-bold">{friend.nickname}</span>
              <span data-testid={`friend-status-${friend.memberId}`} className={`flex shrink-0 items-center gap-1 text-xs font-semibold ${friend.online ? 'text-green-700' : 'text-stone-500'}`}>
                <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${friend.online ? 'bg-green-500' : 'bg-stone-400'}`} />
                {friend.online ? '온라인' : '오프라인'}
              </span>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-400" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
