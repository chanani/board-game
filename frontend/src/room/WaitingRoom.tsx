import { useState } from 'react';
import type { ChatMessage } from '../api/chat';
import type { Room, RoomMember } from '../api/types';
import { Button, Panel } from '../components/ui';
import { Felt } from '../components/Felt';
import { useToast } from '../components/Toast';
import { RULE_SUMMARY } from '../games/papersafari/rules';
import { ChatPanel } from './ChatPanel';
import { KickConfirmModal } from './KickConfirmModal';
import { MemberList } from './MemberList';

type Chat = { messages: ChatMessage[]; onSend: (text: string) => boolean };

type Props = {
  room: Room;
  meId: number;
  receivedAt: number;
  now: number;
  onStart: () => void;
  /** 요청이 끝날 때까지(Promise) 준비 버튼을 잠근다. */
  onReady: (ready: boolean) => unknown;
  onForfeit: (memberId: number) => void;
  /** 방장이 대기 중에 참가자를 내보낸다(확인 창을 거친 뒤 부른다). */
  onKick: (memberId: number) => unknown;
  onSeat: () => void;
  chat: Chat;
};

/** 펠트의 나무 테두리(box-shadow 13px)는 레이아웃에 잡히지 않으므로 그만큼 안쪽 여백을 두어 패널 사이 간격(24px)을 맞춘다. */
const FELT_RIM = 'p-[13px]';

export function WaitingRoom({ room, meId, receivedAt, now, onStart, onReady, onForfeit, onKick, onSeat, chat }: Props) {
  const spectating = room.spectators.some((spectator) => spectator.id === meId);
  const [kickTarget, setKickTarget] = useState<RoomMember | null>(null);
  const canKick = !spectating && room.status === 'WAITING' && room.hostId === meId;
  const askKick = (memberId: number) => setKickTarget(room.members.find((member) => member.id === memberId) ?? null);
  const confirmKick = () => {
    if (kickTarget) {
      onKick(kickTarget.id);
    }
    setKickTarget(null);
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
      <section aria-label="테이블" className={`flex flex-col items-center gap-[37px] ${FELT_RIM}`}>
        {/* 좁은 화면에서는 세로로 긴 타원으로 의자와 가운데 버튼 사이 자리를 확보한다. */}
        <Felt shape="round" className="aspect-[3/4] w-full max-w-[640px] sm:aspect-square">
          <MemberList members={room.members} maxPlayers={room.maxPlayers} meId={meId} receivedAt={receivedAt} now={now}
            onForfeit={spectating ? undefined : onForfeit} onKick={canKick ? askKick : undefined} />
          <div className="absolute left-1/2 top-[45%] flex w-[44%] sm:w-[40%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 text-center">
            <CenterAction room={room} meId={meId} spectating={spectating} onStart={onStart} onReady={onReady} onSeat={onSeat} />
            <CodeChip code={room.code} />
          </div>
        </Felt>
        {room.spectators.length > 0 ? (
          <p className="w-fit rounded-full bg-black/35 px-3 py-1 text-sm text-cream-50">👀 관전 중: {room.spectators.map((spectator) => spectator.nickname).join(', ')}</p>
        ) : null}
      </section>
      <div className="flex flex-col gap-6">
        <Panel className="flex h-[340px] flex-col gap-3 lg:h-[380px]">
          <h2 className="font-bold">채팅</h2>
          <ChatPanel messages={chat.messages} meId={meId} onSend={chat.onSend} className="flex-1" />
        </Panel>
        <Panel>
          <h2 className="font-bold">페이퍼 사파리 규칙</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-600">
            {RULE_SUMMARY.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </Panel>
      </div>
      <KickConfirmModal nickname={kickTarget?.nickname ?? null} onCancel={() => setKickTarget(null)} onConfirm={confirmKick} />
    </div>
  );
}

function CodeChip({ code }: { code: string }) {
  const toast = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.show('방 코드를 복사했어요.', 'info');
    } catch {
      toast.show(`방 코드: ${code}`, 'info');
    }
  };
  return (
    <button type="button" onClick={copy} aria-label={`방 코드 ${code} 복사`}
      className="press-3d whitespace-nowrap rounded-full bg-cream-50 px-3 py-1 font-mono text-xs font-semibold text-wood-800 shadow sm:text-sm">
      코드 {code} 📋
    </button>
  );
}

const NOTE = 'rounded-xl bg-black/35 px-2.5 py-1 text-[11px] leading-snug text-cream-50 sm:text-xs';

function startBlocker(members: RoomMember[]): string | null {
  if (members.length < 2) {
    return '2명 이상 모여야 해요';
  }
  if (members.some((member) => !member.host && !member.ready)) {
    return '모두 준비하면 시작할 수 있어요';
  }
  return null;
}

type CenterProps = {
  room: Room;
  meId: number;
  spectating: boolean;
  onStart: () => void;
  onReady: (ready: boolean) => unknown;
  onSeat: () => void;
};

function CenterAction({ room, meId, spectating, onStart, onReady, onSeat }: CenterProps) {
  if (spectating) {
    const canSeat = room.status === 'WAITING' && room.members.length < room.maxPlayers;
    return (
      <>
        <p className={NOTE}>👀 관전 중 · {room.status === 'WAITING' ? '자리가 나면 앉을 수 있어요' : '게임이 끝나면 자동으로 참가해요'}</p>
        {canSeat ? <Button onClick={onSeat}>자리에 앉기</Button> : null}
      </>
    );
  }
  const me = room.members.find((member) => member.id === meId);
  if (!me) {
    return null;
  }
  if (me.host) {
    const blocker = startBlocker(room.members);
    return (
      <>
        <Button onClick={onStart} disabled={blocker !== null} className="px-5 py-2.5 text-base">게임 시작</Button>
        {blocker ? <p className={NOTE}>{blocker}</p> : null}
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
    <>
      <Button variant={ready ? 'secondary' : 'primary'} onClick={toggle} disabled={pending} className="px-5 py-2.5 text-base">
        {ready ? '준비 취소' : '준비하기'}
      </Button>
      <p className={NOTE}>{ready ? '방장이 시작하길 기다리고 있어요' : '준비하면 방장이 시작할 수 있어요'}</p>
    </>
  );
}
