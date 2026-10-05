import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { messageOf } from '../api/http';
import { roomsApi } from '../api/rooms';
import { useAuth } from '../auth/AuthContext';
import { Button, Panel } from '../components/ui';
import { useToast } from '../components/Toast';
import { useRoomChannel } from '../room/useRoomChannel';
import { WaitingRoom } from '../room/WaitingRoom';

export function RoomPage() {
  const { code = '' } = useParams();
  const { member } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { room, receivedAt, view, log, missing, send } = useRoomChannel(code);
  const [now, setNow] = useState(() => Date.now());
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [dismissedGameOver, setDismissedGameOver] = useState(false);
  const meId = member?.id ?? 0;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setConfirmLeave(false);
  }, [room?.status]);

  useEffect(() => {
    if (room?.status === 'PLAYING') {
      setDismissedGameOver(false);
    }
  }, [room?.status]);

  useEffect(() => {
    if (room && !room.members.some((roomMember) => roomMember.id === meId)) {
      toast.show('방에서 나왔어요.', 'info');
      navigate('/', { replace: true });
    }
  }, [room, meId, navigate, toast]);

  if (missing) {
    return <Navigate to="/" replace />;
  }
  if (!room) {
    return <Panel>방 정보를 불러오는 중…</Panel>;
  }

  const playing = room.status === 'PLAYING';
  const wasPlayer = view !== null && Object.hasOwn(view.game.tokens, String(meId));
  const showGameOver = !playing && view?.game.status === 'GAME_OVER' && wasPlayer && !dismissedGameOver;
  const showGame = view !== null && (playing || showGameOver);

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
    } catch (error) {
      toast.show(messageOf(error));
    }
  };

  const leave = () => {
    if (playing && !confirmLeave) {
      setConfirmLeave(true);
      return;
    }
    run(async () => {
      try {
        await roomsApi.leave(code);
      } catch (error) {
        setConfirmLeave(false);
        throw error;
      }
      navigate('/', { replace: true });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{room.name}</h1>
          <p className="text-sm text-stone-500">{room.gameTypeName} · {playing ? '게임 중' : '대기 중'}</p>
        </div>
        <Button variant="danger" onClick={leave}>
          {confirmLeave ? '정말 나갈까요? (기권 처리)' : '나가기'}
        </Button>
      </div>
      {showGame ? (
        <Panel>게임이 진행 중이에요.</Panel>
      ) : (
        <WaitingRoom
          room={room}
          meId={meId}
          receivedAt={receivedAt}
          now={now}
          onStart={() => run(() => roomsApi.start(code))}
          onForfeit={(memberId) => run(() => roomsApi.forfeit(code, memberId))}
        />
      )}
      {log.length > 0 && !showGame ? null : null}
      <span className="hidden">{send.length}{String(setDismissedGameOver.length)}</span>
    </div>
  );
}
