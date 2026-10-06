import { AnimatePresence, motion } from 'motion/react';
import type { RoomMember } from '../api/types';
import { canForfeit, offlineSecondsNow } from '../lib/format';
import { Button } from '../components/ui';
import { KickBadge } from '../components/KickBadge';
import { PC_QUERY, useMediaQuery } from '../lib/useMediaQuery';
import { CheckIcon, CrownIcon } from '../components/icons';
import { SeatBubble, type SeatBubbles } from './useSeatBubbles';

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

export function MemberList({ members, maxPlayers, meId, receivedAt, now, onForfeit, onKick, bubbles }: Props) {
  const pc = useMediaQuery(PC_QUERY);
  const seats = Array.from({ length: maxPlayers }, (_, index) => members[index] ?? null);
  return (
    <ul aria-label="자리" className="absolute inset-0">
      {seats.map((member, index) => {
        const { left, top } = positionOf(maxPlayers, index);
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
                  {member.nickname.slice(0, 1)}
                  <span aria-hidden="true" className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full ring-2 ring-cream-50 ${member.connected ? 'bg-green-500' : 'bg-stone-400'}`} />
                  {remove && !pc ? <KickBadge label={`${member.nickname}님 내보내기`} onClick={remove} className="absolute -right-2 -top-2" /> : null}
                </motion.div>
              ) : (
                <motion.div key="empty" aria-label="빈자리" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-cream-50/45 sm:h-14 sm:w-14" />
              )}
            </AnimatePresence>
            {member ? (
              <Seated member={member} meId={meId} receivedAt={receivedAt} now={now} remove={pc ? remove : null} />
            ) : (
              <span aria-hidden="true" className="felt-ink-muted text-xs font-semibold">빈자리</span>
            )}
          </li>
        );
      })}
    </ul>
  );
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
  if (onForfeit && canForfeit(member, meId, receivedAt, now)) {
    return () => onForfeit(member.id);
  }
  return null;
}

/** remove는 글자 버튼용이다(PC). 모바일은 아바타 위 X 버튼이라 여기서는 null. */
function Seated({ member, meId, receivedAt, now, remove }: { member: RoomMember; meId: number; receivedAt: number; now: number; remove: (() => void) | null }) {
  return (
    <>
      <span className="pill-strong flex max-w-full items-center rounded-full px-2 text-sm font-bold">
        <span className="truncate">{member.nickname}</span>
        {member.id === meId ? <span className="shrink-0 text-xs">&nbsp;(나)</span> : null}
      </span>
      <StatusChip member={member} />
      {!member.connected ? <span className="felt-ink-muted text-xs">연결 끊김 {offlineSecondsNow(member, receivedAt, now)}초</span> : null}
      {remove ? (
        <Button variant="danger" className="px-2 py-0.5 text-xs" onClick={remove}>내보내기</Button>
      ) : null}
    </>
  );
}

const CHIP = 'whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold leading-none shadow';

function StatusChip({ member }: { member: RoomMember }) {
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
