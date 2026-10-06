import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { messageOf } from '../api/http';
import { roomsApi } from '../api/rooms';
import type { Room } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { BinocularsIcon } from '../components/icons';
import { Button, Panel } from '../components/ui';
import { useToast } from '../components/Toast';
import { lobbyPath } from '../games/catalog';
import { PaperSafariTable } from '../games/papersafari/PaperSafariTable';
import { ChatLauncher } from '../room/ChatLauncher';
import { useGameOverDismissal } from '../room/useGameOverDismissal';
import { useRoomChat } from '../room/useRoomChat';
import { useRoomChannel } from '../room/useRoomChannel';
import { LeaveConfirmModal } from '../room/LeaveConfirmModal';
import { WaitingRoom } from '../room/WaitingRoom';

const CHIP_TONES = { plain: 'bg-black/35 text-cream-50', green: 'bg-[#1c5a37] text-cream-50' } as const;

function RoomChip({ tone = 'plain', label, children }: { tone?: keyof typeof CHIP_TONES; label?: string; children: React.ReactNode }) {
  return (
    <span aria-label={label} className={`inline-flex items-center gap-1 rounded-full border border-cream-50/20 px-2.5 py-0.5 text-xs font-bold ${CHIP_TONES[tone]}`}>{children}</span>
  );
}

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
  // 게임이 끝나면 관전자는 자동으로 자리에 앉으므로, 게임을 지켜봤는지 따로 기억해 결과 창을 보여 준다.
  const [watched, setWatched] = useState(false);
  // 관전자는 마지막 참가자가 나가 방이 사라져도 알림을 받지 못하므로 주기적으로 방을 확인한다.
  const { room, receivedAt, view, transition, log, missing, send, nicknameOf, errorSeq } = useRoomChannel(code, { poll: spectating });
  const [now, setNow] = useState(() => Date.now());
  const [confirmLeave, setConfirmLeave] = useState(false);
  const gameOver = useGameOverDismissal(code, view?.game ?? null, room?.status === 'PLAYING');
  // 이 화면은 REST 입장(참가·관전) 뒤에만 오므로 채팅도 방 채널과 같은 시점에 시작한다.
  const chat = useRoomChat(code, room !== null && !missing, { meId });

  useEffect(() => {
    const watching = Boolean(room?.spectators.some((spectator) => spectator.id === meId));
    setSpectating(watching);
    if (watching && room?.status === 'PLAYING') {
      setWatched(true);
    }
  }, [room, meId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setConfirmLeave(false);
  }, [room?.status]);

  // 대기실에서는 채팅이 늘 펼쳐져 있으니 본 것으로 보고, 게임이 시작돼도 💬 배지에 남지 않게 한다.
  const waitingChatShown = room !== null && room.status !== 'PLAYING';
  const { messages: chatMessages, markRead } = chat;
  useEffect(() => {
    if (waitingChatShown) {
      markRead();
    }
  }, [waitingChatShown, chatMessages, markRead]);

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
  const wasPlayer = view !== null && view.game.round.boards.some((board) => board.playerId === meId);
  // 관전자(게임이 끝나 자동으로 앉은 사람 포함)도 누가 이겼는지 볼 수 있게 결과 창을 띄운다.
  const showGameOver = !playing && view?.game.status === 'GAME_OVER' && (wasPlayer || spectating || watched) && !gameOver.dismissed;
  const spectatorCount = room.spectators.length;
  const showGame = view !== null && (playing || showGameOver);

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
    } catch (error) {
      toast.show(messageOf(error));
    }
  };

  const requestLeave = () => {
    if (playing && !spectating) {
      setConfirmLeave(true);
      return;
    }
    leave();
  };

  const leave = () => {
    setConfirmLeave(false);
    run(async () => {
      await roomsApi.leave(code);
      navigate(lobbyPath(room.gameType), { replace: true });
    });
  };

  return (
    <div className={`space-y-4 ${playing ? 'pb-20' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-black text-cream-50 drop-shadow">{room.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-1.5" data-testid="room-chips">
            <RoomChip>🃏 {room.gameTypeName}</RoomChip>
            <RoomChip tone={playing ? 'green' : 'plain'}>{playing ? '● 게임 중' : '대기 중'}</RoomChip>
            <RoomChip>👥 {room.members.length}/{room.maxPlayers}명</RoomChip>
            {spectatorCount > 0 ? <RoomChip label={`관전 ${spectatorCount}명`}><BinocularsIcon /> 관전 {spectatorCount}</RoomChip> : null}
            {room.locked ? <RoomChip>🔒 비공개</RoomChip> : null}
          </div>
        </div>
        <Button variant="danger" className="shrink-0" onClick={requestLeave}>나가기</Button>
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
          onReadyNext={() => run(async () => {
            await roomsApi.ready(code, true);
            gameOver.dismiss();
          })}
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
          onReady={(ready) => run(() => roomsApi.ready(code, ready))}
          onForfeit={(memberId) => run(() => roomsApi.forfeit(code, memberId))}
          onKick={(memberId) => run(() => roomsApi.kick(code, memberId))}
          onSeat={() => run(() => roomsApi.seat(code))}
          chat={{ messages: chat.messages, onSend: chat.send }}
        />
      )}
      {playing ? (
        <ChatLauncher messages={chat.messages} meId={meId} onSend={chat.send} unread={chat.unread} onOpen={chat.markRead} />
      ) : null}
      <LeaveConfirmModal open={confirmLeave} onCancel={() => setConfirmLeave(false)} onConfirm={leave} />
    </div>
  );
}
