import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { messageOf } from '../api/http';
import { roomsApi } from '../api/rooms';
import type { Room } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Button, Panel } from '../components/ui';
import { useToast } from '../components/Toast';
import { lobbyPath } from '../games/catalog';
import { PaperSafariTable } from '../games/papersafari/PaperSafariTable';
import { useGameOverDismissal } from '../room/useGameOverDismissal';
import { useRoomChannel } from '../room/useRoomChannel';
import { WaitingRoom } from '../room/WaitingRoom';

function isPresent(room: Room, meId: number): boolean {
  return room.members.some((member) => member.id === meId) || room.spectators.some((spectator) => spectator.id === meId);
}

export function RoomPage() {
  const { code = '' } = useParams();
  const { member } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const meId = member?.id ?? 0;
  const [spectating, setSpectating] = useState(false);
  // 관전자는 마지막 참가자가 나가 방이 사라져도 알림을 받지 못하므로 주기적으로 방을 확인한다.
  const { room, receivedAt, view, transition, log, missing, send, nicknameOf, errorSeq } = useRoomChannel(code, { poll: spectating });
  const [now, setNow] = useState(() => Date.now());
  const [confirmLeave, setConfirmLeave] = useState(false);
  const gameOver = useGameOverDismissal(code, view?.game ?? null, room?.status === 'PLAYING');

  useEffect(() => {
    setSpectating(Boolean(room?.spectators.some((spectator) => spectator.id === meId)));
  }, [room, meId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setConfirmLeave(false);
  }, [room?.status]);

  useEffect(() => {
    if (room && !missing && !isPresent(room, meId)) {
      toast.show('방에서 나왔어요.', 'info');
      navigate(lobbyPath(room.gameType), { replace: true });
    }
  }, [room, missing, meId, navigate, toast]);

  if (missing) {
    return <Navigate to={room ? lobbyPath(room.gameType) : '/'} replace />;
  }
  if (!room) {
    return <Panel>방 정보를 불러오는 중…</Panel>;
  }

  const playing = room.status === 'PLAYING';
  const wasPlayer = view !== null && Object.hasOwn(view.game.tokens, String(meId));
  // 관전자도 누가 이겼는지 볼 수 있게 결과 창을 띄운다.
  const showGameOver = !playing && view?.game.status === 'GAME_OVER' && (wasPlayer || spectating) && !gameOver.dismissed;
  const spectatorCount = room.spectators.length;
  const showGame = view !== null && (playing || showGameOver);

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
    } catch (error) {
      toast.show(messageOf(error));
    }
  };

  const leave = () => {
    if (playing && !spectating && !confirmLeave) {
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
      navigate(lobbyPath(room.gameType), { replace: true });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-cream-50 drop-shadow">{room.name}</h1>
          <p className="text-sm text-cream-200">
            {room.gameTypeName} · {playing ? '게임 중' : '대기 중'}
            {spectatorCount > 0 ? <span> · 👀 관전 {spectatorCount}명</span> : null}
          </p>
        </div>
        <Button variant="danger" onClick={leave}>
          {confirmLeave ? '정말 나갈까요? (기권 처리)' : '나가기'}
        </Button>
      </div>
      {showGame && view ? (
        <PaperSafariTable
          view={view}
          room={room}
          meId={meId}
          log={log}
          receivedAt={receivedAt}
          now={now}
          errorSeq={errorSeq}
          nicknameOf={nicknameOf}
          onForfeit={(memberId) => run(() => roomsApi.forfeit(code, memberId))}
          send={send}
          onCloseGameOver={gameOver.dismiss}
          transition={transition}
        />
      ) : playing ? (
        <Panel>게임 화면을 불러오는 중…</Panel>
      ) : (
        <WaitingRoom
          room={room}
          meId={meId}
          receivedAt={receivedAt}
          now={now}
          onStart={() => run(() => roomsApi.start(code))}
          onForfeit={(memberId) => run(() => roomsApi.forfeit(code, memberId))}
          onSeat={() => run(() => roomsApi.seat(code))}
        />
      )}
    </div>
  );
}
