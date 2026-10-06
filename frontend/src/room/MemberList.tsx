import { AnimatePresence, motion } from 'motion/react';
import type { RoomMember } from '../api/types';
import { canForfeit, offlineSecondsNow } from '../lib/format';
import { Button } from '../components/ui';

type Props = {
  members: RoomMember[];
  maxPlayers: number;
  meId: number;
  receivedAt: number;
  now: number;
  /** 없으면(관전자) 내보내기 버튼을 보이지 않는다. */
  onForfeit?: (memberId: number) => void;
};

type Point = { left: number; top: number };

/**
 * 둥근 펠트 위 의자 자리(아바타 가운데, 펠트 상자에 대한 %). 자리 0이 맨 위, 시계 방향.
 * 이름표·상태 칩은 아바타 아래로 내려오므로 아래쪽 자리는 그만큼 위로 올리고,
 * 가운데의 시작/준비 버튼(폭 40%)과 겹치지 않게 둘레 안쪽에 둔다.
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

export function MemberList({ members, maxPlayers, meId, receivedAt, now, onForfeit }: Props) {
  const seats = Array.from({ length: maxPlayers }, (_, index) => members[index] ?? null);
  return (
    <ul aria-label="자리" className="absolute inset-0">
      {seats.map((member, index) => {
        const { left, top } = positionOf(maxPlayers, index);
        return (
          <li key={member ? member.id : `empty-${index}`} data-testid="chair"
            style={{ left: `${left}%`, top: `${top}%` }}
            className="absolute flex w-24 -translate-x-1/2 -translate-y-6 flex-col items-center gap-1 sm:-translate-y-7">
            <AnimatePresence mode="wait">
              {member ? (
                <motion.div key="taken" initial={{ scale: 0, y: -20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className="relative flex h-12 w-12 items-center justify-center rounded-full bg-cream-50 text-xl font-black text-wood-800 shadow-[0_4px_0_var(--color-cream-300),0_10px_16px_rgb(0_0_0/0.4)] sm:h-14 sm:w-14 sm:text-2xl">
                  {member.nickname.slice(0, 1)}
                  <span aria-hidden="true" className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full ring-2 ring-cream-50 ${member.connected ? 'bg-green-500' : 'bg-stone-400'}`} />
                </motion.div>
              ) : (
                <motion.div key="empty" aria-label="빈자리" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-cream-50/45 sm:h-14 sm:w-14" />
              )}
            </AnimatePresence>
            {member ? (
              <Seated member={member} meId={meId} receivedAt={receivedAt} now={now} onForfeit={onForfeit} />
            ) : (
              <span aria-hidden="true" className="text-xs font-semibold text-cream-50/60">빈자리</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

type SeatedProps = { member: RoomMember; meId: number; receivedAt: number; now: number; onForfeit?: (memberId: number) => void };

function Seated({ member, meId, receivedAt, now, onForfeit }: SeatedProps) {
  return (
    <>
      <span className="flex max-w-full items-center rounded-full bg-black/40 px-2 text-sm font-bold text-cream-50">
        <span className="truncate">{member.nickname}</span>
        {member.id === meId ? <span className="shrink-0 text-xs">&nbsp;(나)</span> : null}
      </span>
      <StatusChip member={member} />
      {!member.connected ? <span className="text-xs text-cream-200/80">연결 끊김 {offlineSecondsNow(member, receivedAt, now)}초</span> : null}
      {onForfeit && canForfeit(member, meId, receivedAt, now) ? (
        <Button variant="danger" className="px-2 py-0.5 text-xs" onClick={() => onForfeit(member.id)}>내보내기</Button>
      ) : null}
    </>
  );
}

const CHIP = 'whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold leading-none shadow';

function StatusChip({ member }: { member: RoomMember }) {
  if (member.host) {
    return <span className={`${CHIP} bg-cream-50 text-wood-800`}>👑 방장</span>;
  }
  if (member.ready) {
    return <span className={`${CHIP} bg-green-600 text-white`}>✔ 준비 완료</span>;
  }
  return <span className={`${CHIP} bg-mustard-300 text-wood-800`}>준비 전</span>;
}
