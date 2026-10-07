import { useEffect, useRef, useState } from 'react';
import type { GameAction, OldMaidSessionView } from '../../api/types';
import { Felt } from '../../components/Felt';
import { useSound } from '../../lib/sound';
import { roomAvatarOf } from '../../lib/avatars';
import { offlineSecondsNow } from '../../lib/format';
import { useTableLayout, type TableLayout } from '../../lib/useTableLayout';
import { GameEndBanner } from '../../table/GameEndBanner';
import { liveGameEnd, useGameOverCue } from '../../table/gameOver';
import { seatOrder, seatRows } from '../../table/seats';
import { SpectatorNotice } from '../../table/SpectatorNotice';
import { TurnBar } from '../../table/TurnBar';
import { TurnRibbon } from '../../table/TurnRibbon';
import { useFinalePhase } from '../../table/useFinalePhase';
import type { TableProps } from '../gameModule';
import { DiscardPairs } from './DiscardPairs';
import { oldMaidInstruction, pickCaption, useOldMaidSizes } from './layout';
import { OldMaidGhostLayer } from './motion/OldMaidGhostLayer';
import { useOldMaidMotion } from './motion/useOldMaidMotion';
import { MyHand } from './MyHand';
import { OldMaidGameOverPanel } from './OldMaidGameOverPanel';
import { OldMaidSeat } from './OldMaidSeat';
import { TargetFan } from './TargetFan';
import { effectivePeek, usePeekSender } from './usePeek';
import { useShuffleEffects } from './useShuffleEffects';

// PC 펠트는 화면 높이에서 머리글·상태 바·차례 줄·손패 몫(약 32rem)을 뺀 만큼까지만 늘어나 1280×860 한 화면에 들어간다.
const FELT: Record<TableLayout, string> = {
  pc: 'flex-col min-h-[min(560px,calc(100dvh-32rem))] max-w-6xl justify-center gap-3 px-[6%] py-3',
  landscape: 'flex-row items-center justify-center gap-3 px-[4%] py-2',
  portrait: 'flex-col gap-3 px-3 py-4',
};
/** 뽑기를 보낸 뒤 화면이 바뀌거나 오류가 오기 전까지 다시 보내지 않는 시간(우노와 같다). */
const PENDING_MS = 3000;
/** R23: 섞기 버튼 잠금 시간(서버 쿨다운과 같다). */
const SHUFFLE_LOCK_MS = 1000;

export function OldMaidTable({ view, room, meId, log, receivedAt, now, errorSeq, nicknameOf, send: rawSend, signal, sendSignal, aside, asideFooter, transition, onCloseGameOver, onReadyNext }: TableProps<OldMaidSessionView>) {
  const game = view.game;
  const layout = useTableLayout();
  const wide = layout === 'pc';
  const sizes = useOldMaidSizes(layout);
  const { play } = useSound();
  const live = game.status === 'IN_PROGRESS';
  const myTurn = live && game.currentPlayerId === meId;
  const liftIndex = effectivePeek(game, signal);

  // 뽑기는 보낸 뒤 화면이 바뀌거나 오류가 오기 전까지 다시 보내지 않는다(우노와 같은 패턴). 섞기는 이 잠금을 쓰지 않는다.
  const pendingUntil = useRef(0);
  useEffect(() => {
    pendingUntil.current = 0;
  }, [view, errorSeq]);
  const send = (action: GameAction) => {
    if (Date.now() < pendingUntil.current) {
      return;
    }
    pendingUntil.current = Date.now() + PENDING_MS;
    rawSend(action);
  };
  const draw = (index: number) => send({ type: 'DRAW', index });
  const turnKey = `${game.startedAt}:${game.turnSeq}`;
  // 같은 차례에서 서버가 들림을 지우면(R27 상대 그대로 다시 정하기) 보낸 자리 기억을 지운다.
  const clearedPeekSeq = game.peek && game.peek.index === null ? game.peek.seq : null;
  const sendPeek = usePeekSender(sendSignal, turnKey, clearedPeekSeq);

  // R23: 섞기는 1초 잠금(서버 쿨다운과 같다). 쿨다운 오류는 조용히 넘어간다(D14).
  const [shuffleLocked, setShuffleLocked] = useState(false);
  useEffect(() => {
    if (!shuffleLocked) {
      return undefined;
    }
    const timer = window.setTimeout(() => setShuffleLocked(false), SHUFFLE_LOCK_MS);
    return () => window.clearTimeout(timer);
  }, [shuffleLocked]);
  const shuffle = () => {
    if (shuffleLocked) {
      return;
    }
    setShuffleLocked(true);
    rawSend({ type: 'SHUFFLE' });
  };

  // 내가 뽑는 사람이 된 새 차례마다 한 번 차례 소리.
  const myTurnKey = useRef<string | null>(null);
  useEffect(() => {
    const key = myTurn ? turnKey : null;
    if (key !== null && myTurnKey.current !== key) {
      play('myTurn');
    }
    myTurnKey.current = key;
  }, [myTurn, turnKey, play]);
  const opponentIds = seatOrder(game.players.map((player) => player.playerId), meId).filter((id) => id !== meId);
  const rows = seatRows(opponentIds.length);
  const maxBacks = layout === 'portrait' && opponentIds.length >= 3 ? 4 : 7;
  const containerRef = useRef<HTMLDivElement>(null);
  const { ghosts } = useOldMaidMotion(containerRef, transition, meId, sizes.pick);
  // 기권으로 끝나면(마지막 비행 없음) 연출 없이 바로 결과 창.
  const finale = useFinalePhase(game, transition, game.result?.reason === 'FORFEIT');
  // 마지막 카드가 날아가면 "게임 끝!" 배너와 함께 한 번 울린다. 연출이 없으면(기권·동작 줄이기) 결과 창과 함께 울린다.
  useGameOverCue(liveGameEnd(game, transition), finale === 'banner' || finale === 'done', game.winnerId === meId);
  const shuffling = useShuffleEffects(game.events);
  const targetPlayer = game.players.find((player) => player.playerId === game.targetId);
  const thiefId = game.result?.thiefId ?? null;

  const seat = (playerId: number | undefined) => {
    const player = game.players.find((candidate) => candidate.playerId === playerId);
    if (!player) {
      return null;
    }
    const member = room.members.find((candidate) => candidate.id === player.playerId);
    const active = live && game.currentPlayerId === player.playerId;
    const targeted = live && game.targetId === player.playerId;
    return (
      <div key={player.playerId} className="relative z-10">
        <OldMaidSeat player={player} nickname={nicknameOf(player.playerId)} avatar={roomAvatarOf(room, player.playerId)}
          active={active} targeted={targeted} liftIndex={targeted ? liftIndex : null} backWidth={sizes.back} maxBacks={maxBacks}
          timer={active && game.deadline !== null ? { deadline: game.deadline, serverNow: game.serverNow } : undefined}
          connected={member?.connected} offlineSeconds={member ? offlineSecondsNow(member, receivedAt, now) : 0}
          shuffling={shuffling.has(player.playerId)} thief={thiefId === player.playerId} />
      </div>
    );
  };
  const seatAt = (index: number | null) => (index === null ? null : seat(opponentIds[index]));

  const caption = pickCaption(game, meId, nicknameOf);
  const showFan = live && targetPlayer !== undefined && game.targetId !== meId;
  const center = (
    <div data-testid="center" className="flex w-full min-w-0 flex-col items-center gap-2">
      {caption ? <p data-testid="pick-caption" className="felt-ink text-xs font-bold">{caption}</p> : null}
      <div className="flex w-full min-w-0 items-end justify-center gap-4">
        {showFan && targetPlayer ? (
          // 상대나 차례가 바뀌면 고르던(올린·누른) 카드 기억을 새로 시작한다.
          <TargetFan key={`${targetPlayer.playerId}:${turnKey}`} ownerName={nicknameOf(targetPlayer.playerId)} count={targetPlayer.cardCount} cardWidth={sizes.pick}
            minVisible={sizes.pickMinVisible} liftIndex={liftIndex} layout={layout} interactive={myTurn} onPeek={sendPeek} onDraw={draw} />
        ) : null}
        <DiscardPairs pairs={game.recentPairs} count={game.discardCount} cardWidth={sizes.pair} />
      </div>
    </div>
  );
  const felt = (
    <Felt shape="oval" className={`mx-auto flex w-full ${FELT[layout]}`}>
      {wide ? (
        <>
          {rows.top.length > 0 ? (
            <div data-testid="seat-row-top" className={`flex items-start gap-10 ${rows.top.length > 1 ? 'justify-around' : 'justify-center'}`}>{rows.top.map(seatAt)}</div>
          ) : null}
          <div className="grid grid-cols-[1fr_minmax(0,auto)_1fr] items-center gap-4">
            <div data-testid="seat-left" className="justify-self-start">{seatAt(rows.left)}</div>
            {center}
            <div data-testid="seat-right" className="justify-self-end">{seatAt(rows.right)}</div>
          </div>
        </>
      ) : (
        <>
          <div data-testid="opponent-row" className={`flex flex-wrap items-start justify-center gap-x-2 gap-y-3 ${layout === 'landscape' ? 'min-w-0 flex-[2]' : ''}`}>{opponentIds.map(seat)}</div>
          {/* 눕힌 화면은 가운데 큰 부채가 폭을 다 차지해 상대 자리가 세로로 쌓이지 않게 몫을 나눈다(부채는 제 폭에 맞춰 겹친다). */}
          <div className={`flex min-w-0 justify-center ${layout === 'landscape' ? 'flex-[3]' : ''}`}>{center}</div>
        </>
      )}
    </Felt>
  );
  // 내 차례(뽑는 사람)면 손패 위에 공통 리본으로 남은 시간을 보인다.
  const mine = game.hand === null ? <SpectatorNotice /> : (
    <div data-testid="my-area" data-active={myTurn ? 'true' : undefined} className="relative -my-1 rounded-2xl px-1 py-1">
      {myTurn ? <TurnRibbon deadline={game.deadline} serverNow={game.serverNow} /> : null}
      <MyHand cards={game.hand} liftIndex={live && game.targetId === meId ? liftIndex : null} layout={layout} sizes={sizes} zoneId={meId}
        canShuffle={game.canShuffle} shuffleLocked={shuffleLocked} onShuffle={shuffle} />
    </div>
  );
  const turnBar = (
    <TurnBar instruction={oldMaidInstruction(game, meId, nicknameOf, wide)} myTurn={myTurn} log={log} nicknameOf={nicknameOf} compact={!wide}
      stacked={layout === 'landscape'} deadline={game.deadline} serverNow={game.serverNow} onWarn={myTurn ? () => play('tick') : undefined} />
  );

  if (finale === 'done' && game.status === 'GAME_OVER') {
    return <OldMaidGameOverPanel game={game} room={room} meId={meId} nicknameOf={nicknameOf} onReady={onReadyNext} onClose={onCloseGameOver} />;
  }
  return (
    <div ref={containerRef} inert={finale !== 'playing'} data-testid="oldmaid-table" data-layout={layout}>
      {layout === 'landscape' ? (
        <div data-testid="landscape-table" className="grid grid-cols-[10.5rem_1fr] items-start gap-3">
          <div data-testid="table-aside" className="sticky top-2 space-y-2">{aside}{turnBar}{asideFooter}</div>
          <div className="space-y-2">{felt}{mine}</div>
        </div>
      ) : (
        <div className={wide ? 'space-y-2' : 'space-y-3'}>{turnBar}{felt}{mine}</div>
      )}
      <OldMaidGhostLayer ghosts={ghosts} />
      {finale === 'banner' ? <GameEndBanner /> : null}
    </div>
  );
}
