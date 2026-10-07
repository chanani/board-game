import { useEffect, useRef } from 'react';
import type { RoomMember } from '../api/types';
import { CheckIcon, DrawIcon, MedalIcon } from '../components/icons';
import type { ViewTransition } from '../games/gameModule';
import { useSound } from '../lib/sound';

type Finishable = { status: string };

/**
 * 이 화면이 "게임 중 → 끝"을 실시간으로 받은 전환이면 그 전환을, 아니면 null을 돌려준다.
 * 이미 끝난 게임을 불러오거나 다시 들어온 것(직전 화면 없음·동기화 응답)은 null이라 게임 끝 소리를 내지 않는다.
 */
export function liveGameEnd<G extends Finishable>(game: G, transition: ViewTransition<G> | null | undefined): ViewTransition<G> | null {
  if (!transition || !transition.animate || transition.to !== game || !transition.from) {
    return null;
  }
  const ended = transition.from.status !== 'GAME_OVER' && game.status === 'GAME_OVER';
  return ended ? transition : null;
}

/** 울린 게임 끝(전환 객체). 테이블·결과 창이 다시 그려지거나 새로 열려도 한 번만 울리게 한다. */
const cued = new WeakSet<object>();

/**
 * 게임이 끝나면 방의 모두에게 게임 끝 소리를 한 번 울린다. 이긴 사람은 밝은 소리, 나머지(진 사람·무승부·관전자)는 부드러운 소리.
 * ended는 liveGameEnd의 결과, ready는 울릴 때(연출 배너·결과 공개)가 되었는지. 소리 켜기/끄기·음량은 useSound가 따른다.
 */
export function useGameOverCue(ended: object | null, ready: boolean, won: boolean) {
  const { play } = useSound();
  const playRef = useRef(play);
  playRef.current = play;
  useEffect(() => {
    if (!ended || !ready || cued.has(ended)) {
      return;
    }
    cued.add(ended);
    playRef.current(won ? 'gameOverWin' : 'gameOverEnd');
  }, [ended, ready, won]);
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
