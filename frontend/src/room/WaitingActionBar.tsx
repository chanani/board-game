import { motion, useAnimate, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Room } from '../api/types';
import { BinocularsIcon } from '../components/icons';
import { Button } from '../components/ui';

type Props = {
  room: Room;
  meId: number;
  spectating: boolean;
  onStart: () => void;
  /** 요청이 끝날 때까지(Promise) 준비 버튼을 잠근다. */
  onReady: (ready: boolean) => unknown;
  onSeat: () => void;
};

const MAIN_BUTTON = 'shrink-0 px-4 py-2 sm:px-5 sm:py-2.5 sm:text-base';

function startBlocker(room: Room): string | null {
  const { members } = room;
  if (room.startsAt) {
    return '곧 게임이 시작돼요';
  }
  if (members.length < 2) {
    return '2명 이상 모여야 해요';
  }
  if (members.some((member) => !member.host && !member.bot && !member.ready)) {
    return '모두 준비하면 시작할 수 있어요';
  }
  return null;
}

/** 테이블 아래 주 버튼. 참가자는 감싸는 상자 없이 버튼만 가운데에 두고, 관전자는 안내와 함께 종이 카드에 둔다. */
export function WaitingActionBar(props: Props) {
  if (!props.spectating) {
    return (
      <div data-testid="waiting-action-bar" className="flex w-full max-w-[640px] items-center justify-center">
        <ActionContent {...props} />
      </div>
    );
  }
  return (
    <div data-testid="waiting-action-bar"
      className="paper flex w-full max-w-[640px] items-center justify-between gap-3 px-3 py-2.5 text-xs text-wood-800 sm:px-4 sm:text-sm">
      <ActionContent {...props} />
    </div>
  );
}

function Status({ children }: { children: ReactNode }) {
  return <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 leading-snug">{children}</p>;
}

function ActionContent({ room, meId, spectating, onStart, onReady, onSeat }: Props) {
  if (spectating) {
    const canSeat = room.status === 'WAITING' && !room.startsAt && room.members.length < room.maxPlayers;
    return (
      <>
        <Status><BinocularsIcon /> <b>관전 중</b> <span>· {room.status === 'WAITING' ? '자리가 나면 앉을 수 있어요' : '게임이 끝나면 자동으로 참가해요'}</span></Status>
        {canSeat ? <Button onClick={onSeat} className={MAIN_BUTTON}>자리에 앉기</Button> : null}
      </>
    );
  }
  const me = room.members.find((member) => member.id === meId);
  if (!me) {
    return null;
  }
  if (me.host) {
    const blocker = startBlocker(room);
    const reasonId = 'start-blocker-reason';
    return (
      <>
        <Button onClick={onStart} disabled={blocker !== null} title={blocker ?? undefined}
          aria-describedby={blocker ? reasonId : undefined} className={MAIN_BUTTON}>게임 시작</Button>
        {blocker ? <span id={reasonId} className="sr-only">{blocker}</span> : null}
      </>
    );
  }
  return <ReadyButton ready={me.ready} onReady={onReady} locked={Boolean(room.startsAt)} />;
}

// locked: 시작 카운트다운 중에는 준비를 바꿀 수 없다.
function ReadyButton({ ready, onReady, locked = false }: { ready: boolean; onReady: (ready: boolean) => unknown; locked?: boolean }) {
  const [pending, setPending] = useState(false);
  // 요청이 끝나기 전에 다시 눌러 준비·취소가 엇갈려 가지 않게 잠근다.
  const toggle = async () => {
    setPending(true);
    try {
      await onReady(!ready);
    } finally {
      setPending(false);
    }
  };
  // Button이 ref를 받지 않아 감싼 div에서 누르는 튕김을 준다. 첫 렌더에는 튕기지 않는다.
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reduceMotion = useReducedMotion();
  const previous = useRef(ready);
  // 첫 렌더(새로고침 등)와 동작 줄이기에서는 체크·글자 등장 효과 없이 바로 최종 모습을 보인다.
  const changedOnce = useRef(false);
  if (previous.current !== ready) {
    changedOnce.current = true;
  }
  const entrance = changedOnce.current && !reduceMotion;
  useEffect(() => {
    const changed = previous.current !== ready;
    previous.current = ready;
    if (!changed || reduceMotion) {
      return;
    }
    animate(scope.current, { scale: [1, 0.92, 1.06, 1] }, { duration: 0.4, ease: 'easeOut' });
  }, [ready, reduceMotion, animate, scope]);
  return (
    <div ref={scope} className="inline-flex">
      <Button variant={ready ? 'muted' : 'primary'} onClick={toggle} disabled={pending || locked}
        className={`${MAIN_BUTTON} transition-colors duration-300`}>
        <span className="inline-flex items-center gap-1.5">
          {ready ? <ReadyCheck animated={entrance} /> : null}
          <motion.span key={ready ? 'cancel' : 'ready'} initial={entrance ? { opacity: 0, y: 6 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            {ready ? '준비 취소' : '준비하기'}
          </motion.span>
        </span>
      </Button>
    </div>
  );
}

/** 획을 긋듯 그려지는 초록 체크. */
function ReadyCheck({ animated }: { animated: boolean }) {
  return (
    <svg data-testid="ready-check" aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none">
      <motion.path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
        className="text-green-700" initial={animated ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={{ duration: 0.35 }} />
    </svg>
  );
}
