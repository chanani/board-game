import type { Room } from '../api/types';
import { Button, Panel } from '../components/ui';
import { Felt } from '../components/Felt';
import { useToast } from '../components/Toast';
import { MemberList } from './MemberList';

type Props = {
  room: Room;
  meId: number;
  receivedAt: number;
  now: number;
  onStart: () => void;
  onForfeit: (memberId: number) => void;
};

export function WaitingRoom({ room, meId, receivedAt, now, onStart, onForfeit }: Props) {
  const toast = useToast();
  const isHost = room.hostId === meId;
  const canStart = isHost && room.members.length >= 2;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      toast.show('방 코드를 복사했어요.', 'info');
    } catch {
      toast.show(`방 코드: ${room.code}`, 'info');
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Felt className="p-5 lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="rounded-full bg-cream-50 px-3 py-1 text-lg font-bold text-wood-800 shadow">참가자 {room.members.length}/{room.maxPlayers}</h2>
          <button type="button" onClick={copyCode} className="press-3d rounded-full bg-cream-50 px-3 py-1 font-mono text-sm font-semibold text-wood-800 shadow">
            코드 {room.code} 📋
          </button>
        </div>
        <MemberList members={room.members} maxPlayers={room.maxPlayers} meId={meId} receivedAt={receivedAt} now={now} onForfeit={onForfeit} />
        <div className="mt-4 flex justify-end">
          {isHost ? (
            <Button onClick={onStart} disabled={!canStart}>
              {canStart ? '게임 시작' : '2명 이상 모이면 시작할 수 있어요'}
            </Button>
          ) : (
            <span className="rounded-full bg-black/35 px-3 py-1 text-sm text-cream-50">방장이 게임을 시작하길 기다리는 중…</span>
          )}
        </div>
      </Felt>
      <Panel>
        <details open>
          <summary className="cursor-pointer font-bold">페이퍼 사파리 규칙</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-600">
            <li>각자 카드 6장(3열×2줄)을 받고 1장을 뒤집어요.</li>
            <li>차례마다 덱이나 버린 카드 더미에서 1장을 가져와 교체하거나 버려요.</li>
            <li>같은 열 위·아래가 같은 숫자면 0점, 와일드(❓)가 있어도 0점.</li>
            <li>🐘 코끼리: 교체하면 내 뒷면 카드 1장을 엿봐요.</li>
            <li>🧔 타잔: 반드시 교체하고, 빠진 카드는 왼쪽 사람의 같은 칸으로!</li>
            <li>누군가 6장을 모두 공개하면 라운드 종료. 합이 가장 낮으면 토큰 1개.</li>
            <li>토큰 3개를 먼저 모으면 승리!</li>
          </ul>
        </details>
      </Panel>
    </div>
  );
}
