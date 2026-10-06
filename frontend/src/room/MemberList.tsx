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

export function MemberList({ members, maxPlayers, meId, receivedAt, now, onForfeit }: Props) {
  const seats = Array.from({ length: maxPlayers }, (_, index) => members[index] ?? null);
  return (
    <ul className="flex flex-wrap justify-center gap-5 py-4">
      {seats.map((member, index) => (
        <li key={member ? member.id : `empty-${index}`} data-testid="chair" className="flex w-24 flex-col items-center gap-1.5">
          <AnimatePresence mode="wait">
            {member ? (
              <motion.div key="taken" initial={{ scale: 0, y: -20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="relative flex h-16 w-16 items-center justify-center rounded-full bg-cream-50 text-2xl font-black text-wood-800 shadow-[0_4px_0_var(--color-cream-300),0_10px_16px_rgb(0_0_0/0.4)]">
                {member.nickname.slice(0, 1)}
                <span aria-hidden="true" className={`absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-cream-50 ${member.connected ? 'bg-green-500' : 'bg-stone-400'}`} />
                {member.host ? <span title="방장" className="absolute -top-3 text-lg">👑</span> : null}
              </motion.div>
            ) : (
              <motion.div key="empty" aria-label="빈자리" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="h-16 w-16 rounded-full border-2 border-dashed border-cream-50/40" />
            )}
          </AnimatePresence>
          {member ? (
            <>
              <span className="rounded-full bg-black/35 px-2 text-sm font-bold text-cream-50">
                <span>{member.nickname}</span>
                {member.id === meId ? <span className="text-xs"> (나)</span> : null}
              </span>
              {!member.connected ? <span className="text-xs text-cream-200/80">연결 끊김 {offlineSecondsNow(member, receivedAt, now)}초</span> : null}
              {onForfeit && canForfeit(member, meId, receivedAt, now) ? (
                <Button variant="danger" className="px-2 py-0.5 text-xs" onClick={() => onForfeit(member.id)}>내보내기</Button>
              ) : null}
            </>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
