import { useState, type ReactNode } from 'react';
import type { Room, RoomMember } from '../api/types';
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

function startBlocker(members: RoomMember[]): string | null {
  if (members.length < 2) {
    return '2명 이상 모여야 해요';
  }
  if (members.some((member) => !member.host && !member.ready)) {
    return '모두 준비하면 시작할 수 있어요';
  }
  return null;
}

/** 테이블 아래 종이 카드: 내 역할의 주 버튼만 가운데에 둔다(관전자는 안내와 함께). */
export function WaitingActionBar(props: Props) {
  const layout = props.spectating ? 'justify-between' : 'justify-center';
  return (
    <div data-testid="waiting-action-bar"
      className={`paper flex w-full max-w-[640px] items-center ${layout} gap-3 px-3 py-2.5 text-xs text-wood-800 sm:px-4 sm:text-sm`}>
      <ActionContent {...props} />
    </div>
  );
}

function Status({ children }: { children: ReactNode }) {
  return <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 leading-snug">{children}</p>;
}

function ActionContent({ room, meId, spectating, onStart, onReady, onSeat }: Props) {
  if (spectating) {
    const canSeat = room.status === 'WAITING' && room.members.length < room.maxPlayers;
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
    const blocker = startBlocker(room.members);
    const reasonId = 'start-blocker-reason';
    return (
      <>
        <Button onClick={onStart} disabled={blocker !== null} title={blocker ?? undefined}
          aria-describedby={blocker ? reasonId : undefined} className={MAIN_BUTTON}>게임 시작</Button>
        {blocker ? <span id={reasonId} className="sr-only">{blocker}</span> : null}
      </>
    );
  }
  return <ReadyButton ready={me.ready} onReady={onReady} />;
}

function ReadyButton({ ready, onReady }: { ready: boolean; onReady: (ready: boolean) => unknown }) {
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
  return (
    <Button variant={ready ? 'muted' : 'primary'} onClick={toggle} disabled={pending} className={MAIN_BUTTON}>
      {ready ? '준비 취소' : '준비하기'}
    </Button>
  );
}
