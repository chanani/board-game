import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { messageOf } from '../api/http';
import { roomsApi } from '../api/rooms';
import type { Room } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { RoomStatusBar } from '../components/RoomStatusBar';
import { Button, Panel } from '../components/ui';
import { useToast } from '../components/Toast';
import { lobbyPath } from '../games/catalog';
import { findGame, sessionGameType } from '../games/registry';
import { GameChat } from '../room/GameChat';
import { useGameOverDismissal } from '../room/useGameOverDismissal';
import { useRoomChat } from '../room/useRoomChat';
import { useRoomChannel } from '../room/useRoomChannel';
import { LeaveConfirmModal } from '../room/LeaveConfirmModal';
import { RoomSettingsModal } from '../room/RoomSettingsModal';
import { WaitingRoom } from '../room/WaitingRoom';
import { RoomBackdrop, RoomThemeProvider } from '../room/roomTheme';
import { PC_QUERY, useMediaQuery } from '../lib/useMediaQuery';
import { useTableLayout } from '../lib/useTableLayout';
import { withMyAvatar } from '../lib/avatars';
import { useChatAvatars } from '../room/useChatAvatars';
import { ChatColorProvider, chatOrderOf } from '../room/chatColors';

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
  const { room: channelRoom, receivedAt, view, transition, log, missing, send, sendSignal, signal, nicknameOf, errorSeq } = useRoomChannel(code, { poll: spectating, meId });
  // 방금 바꾼 내 프로필 그림은 다음 방 갱신을 기다리지 않고 바로 보인다.
  const room = useMemo(() => withMyAvatar(channelRoom, meId, member?.avatar), [channelRoom, meId, member?.avatar]);
  const [now, setNow] = useState(() => Date.now());
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);
  const layout = useTableLayout();
  const pcChat = useMediaQuery(PC_QUERY);
  const game = room ? findGame(room.gameType) : undefined;
  // 방의 게임과 종류가 다른 화면은 쓰지 않는다(D3).
  const gameView = room && view && sessionGameType(view) === room.gameType ? view : null;
  const overKey = game && gameView ? game.gameOverKey(code, gameView) : null;
  const gameOver = useGameOverDismissal(code, overKey, room?.status === 'PLAYING');
  // 이 화면은 REST 입장(참가·관전) 뒤에만 오므로 채팅도 방 채널과 같은 시점에 시작한다.
  const roomChat = useRoomChat(code, room !== null && !missing, meId);
  // 채팅 머리줄 그림은 방 정보(참가자·관전자)에서 찾는다.
  const chatMessages = useChatAvatars(roomChat.messages, room);
  const chat = { ...roomChat, messages: chatMessages };

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

  // 나간 방 화면은 페이지 전환(Layout의 AnimatePresence) 동안 잠깐 남아 다시 그려진다. 주소가 바뀌면 navigate가 새로 만들어져
  // 이 효과가 다시 돌므로, 방마다 한 번만 알리고 로비로 보낸다(전에는 '방에서 나왔어요' 알림이 두 번 떴다).
  const leftNotified = useRef<string | null>(null);
  useEffect(() => {
    if (room && isPresent(room, meId)) {
      leftNotified.current = null;
      return;
    }
    if (!room || missing || leftNotified.current === room.code) {
      return;
    }
    leftNotified.current = room.code;
    toast.show('방에서 나왔어요.', 'info');
    navigate(lobbyPath(room.gameType), { replace: true });
  }, [room, missing, meId, navigate, toast]);

  if (missing) {
    return <Navigate to={room ? lobbyPath(room.gameType) : '/'} replace />;
  }
  if (!room) {
    return <Panel>방 정보를 불러오는 중…</Panel>;
  }
  if (!game) {
    const leaveUnknown = () => {
      roomsApi.leave(code).catch(() => undefined).finally(() => navigate('/', { replace: true }));
    };
    return (
      <Panel>
        <p>준비 중인 게임이에요.</p>
        <Button variant="secondary" className="mt-3" onClick={leaveUnknown}>나가기</Button>
      </Panel>
    );
  }

  const playing = room.status === 'PLAYING';
  const canEditSettings = !playing && !spectating && room.hostId === meId;
  const wasPlayer = gameView !== null && game.wasParticipant(gameView, meId);
  // 관전자(게임이 끝나 자동으로 앉은 사람 포함)도 누가 이겼는지 볼 수 있게 결과 창을 띄운다.
  const showGameOver = !playing && gameView !== null && game.isGameOver(gameView) && (wasPlayer || spectating || watched) && !gameOver.dismissed;
  // 서버는 게임이 끝나면 방(대기 중)을 끝 화면보다 먼저 보낸다. 그 사이 테이블을 내렸다 다시 올리면 마지막 카드 비행이 끊기고
  // 대기실이 한 번 비치므로, 받은 화면이 아직 진행 중이면 끝 화면이 올 때까지 테이블을 그대로 둔다.
  const endingGame = !playing && gameView !== null && !game.isGameOver(gameView) && (wasPlayer || spectating || watched);
  const showGame = gameView !== null && (playing || showGameOver || endingGame);
  const Table = game.Table;

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

  // 휴대폰을 눕힌 게임 화면은 상태 바를 테이블 왼쪽 칸으로 옮긴다.
  const landscapeGame = showGame && layout === 'landscape';
  const statusBar = <RoomStatusBar room={room} playing={playing} onLeave={requestLeave} onSettings={canEditSettings ? () => setEditingSettings(true) : undefined} stacked={landscapeGame} />;

  // 게임 중 채팅: 눕힌 화면은 왼쪽 칸 맨 아래, PC는 테이블 오른쪽 칸, 그 밖에는 테이블 아래.
  // 폭이 넓어도 눕힌 화면(낮은 높이)이면 좁은 왼쪽 칸에 들어가므로 채팅 줄을 쓴다.
  const chatShown = playing || showGame;
  const chatVariant = pcChat && layout !== 'landscape' ? 'panel' : 'strip';
  const gameChat = chatShown ? <GameChat variant={chatVariant} messages={chat.messages} meId={meId} onSend={chat.send} compact={landscapeGame} /> : null;
  const chatBeside = chatShown && !landscapeGame && chatVariant === 'panel';
  const chatBelow = chatShown && !landscapeGame && chatVariant === 'strip';

  // 채팅 이름·말풍선 색은 방에 들어온 순서로 정한다(대기실·게임 채팅 모두).
  const chatOrder = chatOrderOf(room);

  return (
    <RoomThemeProvider value={room.theme}>
    <ChatColorProvider order={chatOrder}>
    <div data-theme={room.theme} className="space-y-4">
      <RoomBackdrop theme={room.theme} />
      {landscapeGame ? null : statusBar}
      <div className={chatBeside ? 'flex items-start gap-4' : undefined}>
        <div className={chatBeside ? 'min-w-0 flex-1' : undefined}>
          {showGame && gameView ? (
            <Table
              aside={landscapeGame ? statusBar : undefined}
              asideFooter={landscapeGame ? gameChat : undefined}
              view={gameView}
              room={room}
              meId={meId}
              log={log}
              receivedAt={receivedAt}
              now={now}
              errorSeq={errorSeq}
              nicknameOf={nicknameOf}
              send={send}
              signal={signal}
              sendSignal={sendSignal}
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
              chat={{ messages: chat.messages, onSend: chat.send, latest: chat.latest }}
            />
          )}
        </div>
        {chatBeside ? gameChat : null}
      </div>
      {chatBelow ? gameChat : null}
      <RoomSettingsModal
        open={editingSettings && canEditSettings}
        room={room}
        onClose={() => setEditingSettings(false)}
        onSave={async (maxPlayers, theme) => {
          try {
            await roomsApi.updateSettings(code, maxPlayers, theme);
          } catch (error) {
            toast.show(messageOf(error));
            throw error;
          }
        }}
      />
      <LeaveConfirmModal open={confirmLeave} onCancel={() => setConfirmLeave(false)} onConfirm={leave} />
    </div>
    </ChatColorProvider>
    </RoomThemeProvider>
  );
}
