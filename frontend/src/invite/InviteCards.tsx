import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError, messageOf } from '../api/http';
import { invitesApi, type InviteSignal } from '../api/invites';
import { MemberAvatar } from '../components/Avatar';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui';
import { useFriends } from '../friends/FriendsContext';
import { useRealtime } from '../realtime/RealtimeContext';

export type Invite = { inviteId: string; memberId: number; nickname: string; roomCode: string; roomName: string; gameTypeName: string; seconds: number };

/** 서버의 초대는 30초 산다. 카드는 그보다 조금 먼저 내려, 눌렀는데 이미 만료된 일을 줄인다. */
const EXPIRY_MARGIN_SECONDS = 2;
const FALLBACK_SECONDS = 30;
const MAX_CARDS = 3;

/** 참가하지 못한 까닭을 초대받은 사람 말로 바꾼다. 없는 코드는 서버 문구를 그대로 쓴다. */
const ACCEPT_ERRORS: Record<string, string> = {
  ROOM_NOT_FOUND: '방이 사라졌어요.',
  ROOM_FULL: '방이 가득 찼어요.',
  ROOM_ALREADY_PLAYING: '이미 게임이 시작된 방이에요.',
  GAME_STARTING: '곧 게임이 시작돼서 지금은 들어갈 수 없어요.',
  ALREADY_IN_ROOM: '다른 방에 있어요. 그 방에서 나온 뒤 다시 참가를 눌러 주세요.',
  INVITE_EXPIRED: '초대가 만료됐어요.',
};

function acceptErrorOf(error: unknown): string {
  return (error instanceof ApiError ? ACCEPT_ERRORS[error.code] : undefined) ?? messageOf(error);
}

/** 다른 방에 있어서 못 들어간 것이면 초대는 아직 살아 있으니, 방에서 나온 뒤 다시 누를 수 있게 카드를 남긴다. */
function canRetry(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'ALREADY_IN_ROOM';
}

function inviteOf(signal: InviteSignal): Invite | null {
  if (signal.type !== 'INVITED' || !signal.inviteId || !signal.roomCode) {
    return null;
  }
  return {
    inviteId: signal.inviteId,
    memberId: signal.memberId,
    nickname: signal.nickname,
    roomCode: signal.roomCode,
    roomName: signal.roomName ?? signal.roomCode,
    gameTypeName: signal.gameTypeName ?? '',
    seconds: Math.max((signal.expiresInSeconds ?? FALLBACK_SECONDS) - EXPIRY_MARGIN_SECONDS, 1),
  };
}

/** 같은 사람이 같은 방으로 다시 부르면 앞선 카드를 새 카드로 바꾼다. 카드는 최근 것 몇 장만 둔다. */
function withInvite(current: Invite[], invite: Invite): Invite[] {
  const others = current.filter((shown) => shown.memberId !== invite.memberId || shown.roomCode !== invite.roomCode);
  return [...others, invite].slice(-MAX_CARDS);
}

/**
 * 친구가 보낸 방 초대를 사이트 어디에 있든 화면 오른쪽 위에 카드로 띄운다. 화면을 막지 않고, 시간이 지나면 스스로 사라진다.
 * 방 화면(대기실·게임 중)에서는 한 줄짜리 작은 카드로 줄여 테이블과 버튼을 가리지 않는다.
 * 내가 보낸 초대를 상대가 거절하면 작은 알림으로 알려 준다.
 */
export function InviteCards() {
  const { realtime } = useRealtime();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const friends = useFriends();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((inviteId: string) => {
    window.clearTimeout(timers.current.get(inviteId));
    timers.current.delete(inviteId);
    setInvites((current) => current.filter((invite) => invite.inviteId !== inviteId));
  }, []);

  useEffect(() => realtime.subscribe('/user/queue/invites', (body) => {
    const signal = body as InviteSignal;
    if (signal.type === 'DECLINED') {
      toast.show(`${signal.nickname}님이 초대를 거절했어요.`, 'info');
      return;
    }
    const invite = inviteOf(signal);
    if (!invite) {
      return;
    }
    setInvites((current) => withInvite(current, invite));
    timers.current.set(invite.inviteId, window.setTimeout(() => dismiss(invite.inviteId), invite.seconds * 1000));
  }), [realtime, toast, dismiss]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const accept = async (invite: Invite) => {
    setBusy(invite.inviteId);
    try {
      const room = await invitesApi.accept(invite.roomCode, invite.inviteId);
      dismiss(invite.inviteId);
      navigate(`/rooms/${room.code}`);
    } catch (error) {
      toast.show(acceptErrorOf(error));
      if (!canRetry(error)) {
        dismiss(invite.inviteId);
      }
    } finally {
      setBusy(null);
    }
  };

  const decline = (invite: Invite) => {
    dismiss(invite.inviteId);
    invitesApi.decline(invite.roomCode, invite.inviteId).catch(() => undefined);
  };

  const compact = pathname.startsWith('/rooms/');
  const avatarOf = (memberId: number) => friends?.friends.find((friend) => friend.memberId === memberId)?.avatar;

  return (
    <ul aria-label="받은 방 초대" aria-live="polite"
      className="pointer-events-none fixed right-3 top-[4.25rem] z-50 flex w-[min(340px,calc(100vw-1.5rem))] flex-col gap-2">
      <AnimatePresence>
        {invites.map((invite) => (
          <InviteCard key={invite.inviteId} invite={invite} avatar={avatarOf(invite.memberId)} compact={compact} busy={busy !== null}
            onAccept={() => void accept(invite)} onDecline={() => decline(invite)} />
        ))}
      </AnimatePresence>
    </ul>
  );
}

type CardProps = { invite: Invite; avatar?: string; compact: boolean; busy: boolean; onAccept: () => void; onDecline: () => void };

function InviteCard({ invite, avatar, compact, busy, onAccept, onDecline }: CardProps) {
  const game = invite.gameTypeName ? `(${invite.gameTypeName})` : '';
  return (
    <motion.li layout role="group" aria-label={`${invite.nickname}님의 방 초대`} data-testid="invite-card" data-compact={compact ? 'true' : undefined}
      initial={{ opacity: 0, x: 40, scale: 0.96 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 40, scale: 0.96 }}
      transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
      className={`paper pointer-events-auto relative overflow-hidden border-l-4 border-mustard-400 text-wood-800 ${compact ? 'flex items-center gap-2 py-2 pl-2.5 pr-2' : 'flex flex-col gap-2.5 p-3'}`}>
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <MemberAvatar memberId={invite.memberId} avatar={avatar} size={compact ? 28 : 40} className="shrink-0" />
        <p className={`min-w-0 flex-1 leading-snug ${compact ? 'line-clamp-2 text-xs' : 'text-sm'}`}>
          <b>{invite.nickname}</b>님이 <b>'{invite.roomName}'</b>{game} 방에 초대했어요
        </p>
      </div>
      <div className={`flex shrink-0 gap-1.5 ${compact ? '' : 'pb-0.5'}`}>
        <Button variant="success" disabled={busy} onClick={onAccept} className={compact ? 'px-2.5 py-1 text-xs' : 'flex-1 py-1.5'}>참가</Button>
        <Button variant="secondary" disabled={busy} onClick={onDecline} className={compact ? 'px-2.5 py-1 text-xs' : 'flex-1 py-1.5'}>거절</Button>
      </div>
      {/* 남은 시간: 카드 아래 가는 띠가 왼쪽으로 줄어든다. */}
      <motion.span aria-hidden="true" data-testid="invite-timer" initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: invite.seconds, ease: 'linear' }}
        className="absolute inset-x-0 bottom-0 h-1 origin-left bg-mustard-400" />
    </motion.li>
  );
}
