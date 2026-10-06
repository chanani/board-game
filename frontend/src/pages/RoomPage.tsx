import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { messageOf } from '../api/http';
import { roomsApi } from '../api/rooms';
import type { Room } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { RoomStatusBar } from '../components/RoomStatusBar';
import { Panel } from '../components/ui';
import { useToast } from '../components/Toast';
import { lobbyPath } from '../games/catalog';
import { PaperSafariTable } from '../games/papersafari/PaperSafariTable';
import { LogPopover } from '../games/papersafari/layout/Hud';
import { ChatLauncher } from '../room/ChatLauncher';
import { useGameOverDismissal } from '../room/useGameOverDismissal';
import { useRoomChat } from '../room/useRoomChat';
import { useRoomChannel } from '../room/useRoomChannel';
import { LeaveConfirmModal } from '../room/LeaveConfirmModal';
import { WaitingRoom } from '../room/WaitingRoom';
import { RoomBackdrop, RoomThemeProvider } from '../room/roomTheme';

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
    <RoomThemeProvider value={room.theme}>
    <div data-theme={room.theme} className={`space-y-4 ${playing ? 'pb-20' : ''}`}>
      <RoomBackdrop theme={room.theme} />
      <RoomStatusBar room={room} playing={playing} onLeave={requestLeave}
        log={showGame ? <LogPopover log={log} nicknameOf={nicknameOf} /> : null} />
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
    </RoomThemeProvider>
  );
}
