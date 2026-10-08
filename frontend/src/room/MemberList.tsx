import { AnimatePresence, motion } from 'motion/react';
import type { RoomMember } from '../api/types';
import { BotChip } from '../components/BotChip';
import { botOf } from '../lib/bots';
import { canForfeit, offlineSecondsNow } from '../lib/format';
import { Button } from '../components/ui';
import { KickBadge } from '../components/KickBadge';
import { PC_QUERY, useMediaQuery } from '../lib/useMediaQuery';
import { CheckIcon, CrownIcon, RobotIcon } from '../components/icons';
import { SeatBubble, type SeatBubbles } from './useSeatBubbles';
import { AvatarFace } from '../components/Avatar';
import { avatarOf } from '../lib/avatars';

type Props = {
  members: RoomMember[];
  maxPlayers: number;
  meId: number;
  receivedAt: number;
  now: number;
  /** 없으면(관전자) 내보내기 버튼을 보이지 않는다. */
  onForfeit?: (memberId: number) => void;
  /** 있으면(대기 중인 방장) 나 말고 모든 참가자 의자에 내보내기 버튼을 둔다. */
  onKick?: (memberId: number) => void;
  /** 사람 id별 말풍선 내용(대기실 채팅). */
  bubbles?: SeatBubbles;
  /** 있으면 모든 참가자(나 포함)의 아바타가 전적 보기 버튼이 된다. */
  onShowStats?: (member: RoomMember) => void;
  /** 있으면(대기 중인 방장) 빈자리가 "컴퓨터 추가" 버튼이 된다. */
  onAddBot?: () => void;
  /** 게임이 받는 최대 인원. 정원이 다 찼어도 이보다 작으면 컴퓨터 추가 자리를 하나 더 둔다. */
  gameMaxPlayers?: number;
  /** 있으면 컴퓨터 칩이 난이도 바꾸기 버튼이 된다. */
  onChangeBot?: (member: RoomMember) => void;
};

type Point = { left: number; top: number };

/**
 * 둥근 펠트 위 의자 자리(아바타 가운데, 펠트 상자에 대한 %). 자리 0이 맨 위, 시계 방향.
 * 이름표·상태 칩은 아바타 아래로 내려오므로 아래쪽 자리는 그만큼 위로 올린다.
 * 시작/준비 버튼은 테이블 아래 행동 바에 있으므로 펠트 위에는 자리만 놓인다.
 */
export const SEAT_POSITIONS: Record<number, Point[]> = {
  2: [{ left: 50, top: 12 }, { left: 50, top: 68 }],
  3: [{ left: 50, top: 12 }, { left: 81, top: 60 }, { left: 19, top: 60 }],
  4: [{ left: 50, top: 12 }, { left: 84, top: 42 }, { left: 50, top: 68 }, { left: 16, top: 42 }],
  5: [{ left: 50, top: 12 }, { left: 84, top: 37 }, { left: 71, top: 68 }, { left: 29, top: 68 }, { left: 16, top: 37 }],
  6: [{ left: 50, top: 12 }, { left: 84, top: 30 }, { left: 84, top: 60 }, { left: 50, top: 70 }, { left: 16, top: 60 }, { left: 16, top: 30 }],
};

function positionOf(maxPlayers: number, index: number): Point {
  const table = SEAT_POSITIONS[maxPlayers];
  if (table) {
    return table[index];
  }
  // 표에 없는 정원은 원 둘레에 고르게 놓는다.
  const angle = (index / maxPlayers) * 2 * Math.PI - Math.PI / 2;
  return { left: 50 + 34 * Math.cos(angle), top: 44 + 30 * Math.sin(angle) };
}

/** 방장이 컴퓨터를 앉힐 수 있고 정원이 다 찼는데 게임이 더 받을 수 있으면 의자를 하나 더 둔다(정원은 서버가 자동으로 늘린다). */
export function seatCountOf(members: RoomMember[], maxPlayers: number, gameMaxPlayers: number | undefined, canAdd: boolean): number {
  const growable = canAdd && gameMaxPlayers !== undefined && members.length >= maxPlayers && maxPlayers < gameMaxPlayers;
  return growable ? maxPlayers + 1 : maxPlayers;
}

export function MemberList({ members, maxPlayers, meId, receivedAt, now, onForfeit, onKick, bubbles, onShowStats, onAddBot, gameMaxPlayers, onChangeBot }: Props) {
  const pc = useMediaQuery(PC_QUERY);
  const seatCount = seatCountOf(members, maxPlayers, gameMaxPlayers, onAddBot !== undefined);
  const seats = Array.from({ length: seatCount }, (_, index) => members[index] ?? null);
  return (
    <ul aria-label="자리" className="absolute inset-0">
      {seats.map((member, index) => {
        const { left, top } = positionOf(seatCount, index);
        const remove = member ? removeActionOf({ member, meId, receivedAt, now, onForfeit, onKick }) : null;
        return (
          <li key={member ? member.id : `empty-${index}`} data-testid="chair"
            style={{ left: `${left}%`, top: `${top}%` }}
            className="absolute flex w-24 -translate-x-1/2 -translate-y-6 flex-col items-center gap-1 sm:-translate-y-7">
            {member ? <SeatBubble memberId={member.id} bubble={bubbles?.get(member.id)} lines={top < 20 ? 1 : 2} /> : null}
            <AnimatePresence mode="wait">
              {member ? (
                <motion.div key="taken" initial={{ scale: 0, y: -20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className="relative flex h-12 w-12 items-center justify-center rounded-full bg-cream-50 text-xl font-black text-wood-800 shadow-[0_4px_0_var(--color-cream-300),0_10px_16px_rgb(0_0_0/0.4)] sm:h-14 sm:w-14 sm:text-2xl">
                  {onShowStats ? (
                    // 아바타 전체가 누르는 영역. 연결 점·내보내기 X는 뒤에 그려 이 버튼 위에 놓이므로 X를 누르면 전적 창이 뜨지 않는다.
                    // 내 자리에는 내보내기·기권 버튼이 없고 준비 버튼은 테이블 아래 행동 바에 있어, 내 자리를 눌러도 겹치지 않는다.
                    <button type="button" aria-label={statsLabelOf(member, meId)} onClick={() => onShowStats(member)}
                      className="block h-full w-full cursor-pointer rounded-full outline-none transition-transform hover:scale-105 focus-visible:ring-[3px] focus-visible:ring-mustard-300 motion-reduce:transition-none motion-reduce:hover:scale-100">
                      <AvatarFace avatar={avatarOf(member.avatar, member.id)} />
                    </button>
                  ) : (
                    <AvatarFace avatar={avatarOf(member.avatar, member.id)} />
                  )}
                  {member.bot ? null : <span aria-hidden="true" data-testid="presence-dot" className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full ring-2 ring-cream-50 ${member.connected ? 'bg-green-500' : 'bg-stone-400'}`} />}
                  {remove && !pc ? <KickBadge label={`${member.nickname}님 내보내기`} onClick={remove} className="absolute -right-2 -top-2" /> : null}
                </motion.div>
              ) : (
                onAddBot ? (
                  <motion.button key="empty-bot" type="button" aria-label="빈자리에 컴퓨터 추가" onClick={onAddBot} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="felt-ink-muted flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-cream-50/45 outline-none transition-transform hover:scale-105 focus-visible:ring-[3px] focus-visible:ring-mustard-300 motion-reduce:transition-none motion-reduce:hover:scale-100 sm:h-14 sm:w-14">
                    <RobotIcon className="h-6 w-6" />
                  </motion.button>
                ) : (
                  <motion.div key="empty" aria-label="빈자리" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-cream-50/45 sm:h-14 sm:w-14" />
                )
              )}
            </AnimatePresence>
            {member ? (
              <Seated member={member} meId={meId} receivedAt={receivedAt} now={now} remove={pc ? remove : null} onChangeBot={onChangeBot} />
            ) : (
              <span aria-hidden="true" className="felt-ink-muted text-xs font-semibold">{onAddBot ? '컴퓨터 추가' : '빈자리'}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** 전적 보기 버튼의 접근 이름. 내 자리는 "내 전적 보기". */
export function statsLabelOf(member: { id: number; nickname: string; bot?: boolean }, meId: number): string {
  if (member.bot) {
    return `${member.nickname} 정보 보기`;
  }
  return member.id === meId ? '내 전적 보기' : `${member.nickname}님 전적 보기`;
}

type SeatedProps = {
  member: RoomMember; meId: number; receivedAt: number; now: number;
  onForfeit?: (memberId: number) => void; onKick?: (memberId: number) => void;
};

/** 방장의 내보내기가 있으면 그것만, 없으면 60초 넘게 끊긴 사람의 기권 내보내기를 보여 준다. */
function removeActionOf({ member, meId, receivedAt, now, onForfeit, onKick }: SeatedProps): (() => void) | null {
  if (onKick) {
    return member.id === meId ? null : () => onKick(member.id);
  }
  if (onForfeit && !member.bot && canForfeit(member, meId, receivedAt, now)) {
    return () => onForfeit(member.id);
  }
  return null;
}

/** remove는 글자 버튼용이다(PC). 모바일은 아바타 위 X 버튼이라 여기서는 null. */
function Seated({ member, meId, receivedAt, now, remove, onChangeBot }: { member: RoomMember; meId: number; receivedAt: number; now: number; remove: (() => void) | null; onChangeBot?: (member: RoomMember) => void }) {
  return (
    <>
      <span className="pill-strong flex max-w-full items-center rounded-full px-2 text-sm font-bold">
        <span className="truncate">{member.nickname}</span>
        {member.id === meId ? <span className="shrink-0 text-xs">&nbsp;(나)</span> : null}
      </span>
      <StatusChip member={member} onChangeBot={onChangeBot} />
      {!member.bot && !member.connected ? <span className="felt-ink-muted text-xs">연결 끊김 {offlineSecondsNow(member, receivedAt, now)}초</span> : null}
      {remove ? (
        <Button variant="danger" className="px-2 py-0.5 text-xs" onClick={remove}>내보내기</Button>
      ) : null}
    </>
  );
}

const CHIP = 'whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold leading-none shadow';

function StatusChip({ member, onChangeBot }: { member: RoomMember; onChangeBot?: (member: RoomMember) => void }) {
  const bot = botOf(member);
  if (bot) {
    return <BotChip difficulty={bot} onClick={onChangeBot ? () => onChangeBot(member) : undefined} />;
  }
  if (member.host) {
    return <span className={`${CHIP} inline-flex items-center gap-1 bg-cream-50 text-wood-800`}><CrownIcon className="h-3 w-3" />방장</span>;
  }
  if (member.ready) {
    return (
      <motion.span key="ready" initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.6, duration: 0.35 }}
        className={`${CHIP} inline-flex items-center gap-1 bg-green-600 text-white`}><CheckIcon className="h-3 w-3" />준비 완료</motion.span>
    );
  }
  return <span className={`${CHIP} bg-mustard-300 text-wood-800`}>준비 전</span>;
}
