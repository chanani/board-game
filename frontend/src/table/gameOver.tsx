import { useEffect, useRef } from 'react';
import type { ResultType, RoomMember } from '../api/types';
import { CheckIcon, DrawIcon, MedalIcon } from '../components/icons';
import { useSound } from '../lib/sound';

/** 공개가 끝나면 내 결과 효과음을 한 번만 울린다. 무승부는 이기지도 지지도 않았으니 울리지 않는다. */
export function useResultSound(done: boolean, outcome: ResultType | undefined) {
  const { play } = useSound();
  const playRef = useRef(play);
  playRef.current = play;
  const sounded = useRef(false);
  useEffect(() => {
    if (!done || !outcome || outcome === 'DRAW' || sounded.current) {
      return;
    }
    sounded.current = true;
    playRef.current(outcome === 'WIN' ? 'roundWin' : 'roundLose');
  }, [done, outcome]);
}

export function HeadlineIcon({ won }: { won: boolean }) {
  return won ? <MedalIcon /> : <DrawIcon />;
}

export function ReadyChips({ members }: { members: RoomMember[] }) {
  const guests = members.filter((member) => !member.host);
  if (guests.length === 0) {
    return null;
  }
  return (
    <ul data-testid="ready-chips" aria-label="다음 게임 준비" className="flex flex-wrap gap-2">
      {guests.map((member) => (
        <li key={member.id} data-testid="ready-chip"
          className={`rounded-full border-2 px-3 py-1 text-sm font-bold ${member.ready ? 'border-safari-500 text-safari-700' : 'border-cream-300 text-wood-700'}`}>
          {member.ready ? <CheckIcon className="mr-1 inline h-3.5 w-3.5 align-[-2px]" testId="ready-check" /> : null}{member.nickname}
        </li>
      ))}
    </ul>
  );
}

export function FooterButton({ guest, onReady, onClose }: { guest: boolean; onReady: () => void; onClose: () => void }) {
  if (guest) {
    return (
      <button type="button" onClick={onReady}
        className="press-3d rounded-full bg-(--accent) px-5 py-2 text-sm font-bold text-(--accent-text) shadow-[0_4px_0_var(--accent-shadow),0_8px_14px_rgb(0_0_0/0.3)] hover:bg-(--accent-hover)">
        다음 게임 준비
      </button>
    );
  }
  return (
    <button type="button" onClick={onClose}
      className="press-3d rounded-full bg-cream-50 px-5 py-2 text-sm font-bold text-wood-800 shadow-[0_4px_0_var(--color-cream-300),0_8px_14px_rgb(0_0_0/0.25)] hover:bg-white">
      대기실로
    </button>
  );
}
