import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Friend } from '../api/friends';
import { PeopleIcon } from '../components/icons';
import { useDismiss } from '../components/UserMenu';
import { MemberStatsModal, type StatsTarget } from '../room/MemberStatsModal';
import { FriendAddTab } from './FriendAddTab';
import { FriendListTab } from './FriendListTab';
import { useFriends, type FriendsState } from './FriendsContext';

type Tab = 'list' | 'add';

const BADGE_MAX = 99;

/** 받은 친구 요청 수. 0이면 그리지 않는다. */
export function RequestBadge({ count, className = '' }: { count: number; className?: string }) {
  if (count <= 0) {
    return null;
  }
  return (
    <span data-testid="friend-request-badge" aria-hidden="true"
      className={`grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brick-500 px-1 text-[11px] font-black leading-none text-cream-50 shadow-[0_1px_0_rgb(0_0_0/0.35)] ${className}`}>
      {count > BADGE_MAX ? `${BADGE_MAX}+` : count}
    </span>
  );
}

const tabClass = (selected: boolean) =>
  `flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-mustard-300 ${selected ? 'bg-cream-50 text-wood-800 shadow-[0_2px_0_var(--color-cream-300)]' : 'text-stone-500 hover:text-wood-800'}`;

/** 헤더의 친구 아이콘. 친구 기능을 쓸 수 없는 곳(FriendsProvider 밖)에서는 그리지 않는다. */
export function FriendsMenu() {
  const friends = useFriends();
  return friends ? <FriendsDropdown friends={friends} /> : null;
}

function FriendsDropdown({ friends }: { friends: FriendsState }) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('list');
  const [statsTarget, setStatsTarget] = useState<StatsTarget | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, rootRef);
  const pending = friends.incoming.length;
  const { refresh } = friends;

  // 열 때마다 접속 여부와 요청을 새로 불러온다.
  useEffect(() => {
    if (open) {
      void refresh().catch(() => undefined);
    }
  }, [open, refresh]);

  const showStats = (friend: Friend) => {
    close();
    setStatsTarget({ id: friend.memberId, nickname: friend.nickname, avatar: friend.avatar });
  };

  return (
    // 좁은 화면에서는 패널이 헤더 폭 전체를 쓰도록 기준을 헤더(relative)에 두고, sm 이상에서만 아이콘 아래에 붙인다.
    <div ref={rootRef} className="shrink-0 sm:relative">
      <button type="button" aria-label={pending > 0 ? `친구, 받은 요청 ${pending}개` : '친구'} aria-expanded={open}
        aria-controls={open ? 'friends-menu' : undefined} onClick={() => setOpen((value) => !value)}
        className="relative grid h-9 w-9 place-items-center rounded-lg text-cream-50 outline-none hover:bg-black/15 focus-visible:ring-2 focus-visible:ring-mustard-300">
        <PeopleIcon className="h-5 w-5" />
        <RequestBadge count={pending} className="absolute -right-0.5 -top-0.5" />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div id="friends-menu" data-testid="friends-menu" style={{ transformOrigin: 'top right' }}
            initial={{ opacity: 0, y: reduceMotion ? 0 : -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -8, scale: 0.97 }} transition={{ duration: 0.18 }}
            className="paper absolute left-2 right-2 top-full z-50 mt-2 flex flex-col gap-3 p-3 text-wood-800 sm:left-auto sm:right-0 sm:w-[340px]">
            <div role="tablist" aria-label="친구" className="flex gap-1 rounded-xl bg-cream-200/70 p-1">
              <button type="button" role="tab" id="friends-tab-list" aria-selected={tab === 'list'} aria-controls="friends-panel"
                className={tabClass(tab === 'list')} onClick={() => setTab('list')}>
                친구 목록
              </button>
              <button type="button" role="tab" id="friends-tab-add" aria-selected={tab === 'add'} aria-controls="friends-panel"
                aria-label={pending > 0 ? `친구 추가, 받은 요청 ${pending}개` : '친구 추가'}
                className={tabClass(tab === 'add')} onClick={() => setTab('add')}>
                친구 추가<RequestBadge count={pending} />
              </button>
            </div>
            <div role="tabpanel" id="friends-panel" aria-labelledby={`friends-tab-${tab}`}>
              {tab === 'list' ? <FriendListTab friends={friends.friends} onPick={showStats} /> : <FriendAddTab friends={friends} />}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <MemberStatsModal target={statsTarget} onClose={() => setStatsTarget(null)} />
    </div>
  );
}
