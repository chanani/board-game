import type { Room } from '../api/types';
import { Button, Panel } from '../components/ui';
import { Felt } from '../components/Felt';
import { useToast } from '../components/Toast';
import { RULE_SUMMARY } from '../games/papersafari/rules';
import { MemberList } from './MemberList';

type Props = {
  room: Room;
  meId: number;
  receivedAt: number;
  now: number;
  onStart: () => void;
  onForfeit: (memberId: number) => void;
  onSeat: () => void;
};

export function WaitingRoom({ room, meId, receivedAt, now, onStart, onForfeit, onSeat }: Props) {
  const toast = useToast();
  const isHost = room.hostId === meId;
  const canStart = isHost && room.members.length >= 2;
  const spectating = room.spectators.some((spectator) => spectator.id === meId);
  const canSeat = spectating && room.status === 'WAITING' && room.members.length < room.maxPlayers;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      toast.show('방 코드를 복사했어요.', 'info');
    } catch {
      toast.show(`방 코드: ${room.code}`, 'info');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Felt className="p-5 lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="rounded-full bg-cream-50 px-3 py-1 text-lg font-bold text-wood-800 shadow">참가자 {room.members.length}/{room.maxPlayers}</h2>
          <button type="button" onClick={copyCode} className="press-3d rounded-full bg-cream-50 px-3 py-1 font-mono text-sm font-semibold text-wood-800 shadow">
            코드 {room.code} 📋
          </button>
        </div>
        <MemberList members={room.members} maxPlayers={room.maxPlayers} meId={meId} receivedAt={receivedAt} now={now} onForfeit={spectating ? undefined : onForfeit} />
        {room.spectators.length > 0 ? (
          <p className="mx-auto w-fit rounded-full bg-black/35 px-3 py-1 text-sm text-cream-50">👀 관전 중: {room.spectators.map((spectator) => spectator.nickname).join(', ')}</p>
        ) : null}
        <div className="mt-4 flex justify-end">
          <Controls isHost={isHost} canStart={canStart} spectating={spectating} canSeat={canSeat} onStart={onStart} onSeat={onSeat} />
        </div>
      </Felt>
      <Panel>
        <h2 className="font-bold">페이퍼 사파리 규칙</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-600">
          {RULE_SUMMARY.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </Panel>
    </div>
  );
}

type ControlsProps = { isHost: boolean; canStart: boolean; spectating: boolean; canSeat: boolean; onStart: () => void; onSeat: () => void };

function Controls({ isHost, canStart, spectating, canSeat, onStart, onSeat }: ControlsProps) {
  if (spectating) {
    return canSeat
      ? <Button onClick={onSeat}>자리에 앉기</Button>
      : <span className="rounded-full bg-black/35 px-3 py-1 text-sm text-cream-50">👀 관전 중이에요</span>;
  }
  if (isHost) {
    return (
      <Button onClick={onStart} disabled={!canStart}>
        {canStart ? '게임 시작' : '2명 이상 모이면 시작할 수 있어요'}
      </Button>
    );
  }
  return <span className="rounded-full bg-black/35 px-3 py-1 text-sm text-cream-50">방장이 게임을 시작하길 기다리는 중…</span>;
}
