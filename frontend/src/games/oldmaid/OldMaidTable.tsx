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
import { oldMaidInstruction, pickCaption, ribbonText, useOldMaidSizes } from './layout';
import { OldMaidGhostLayer } from './motion/OldMaidGhostLayer';
import { finaleDelayMs } from './motion/planOldMaidMotion';
import { useOldMaidMotion } from './motion/useOldMaidMotion';
import { MyHand } from './MyHand';
import { OldMaidGameOverPanel } from './OldMaidGameOverPanel';
import { OldMaidSeat, type SeatNote } from './OldMaidSeat';
import { drawnPairIds, keepInHand, pickCard } from './pairPick';
import { TargetFan } from './TargetFan';
import { effectivePeek, usePeekSender } from './usePeek';
import { useShuffleEffects } from './useShuffleEffects';

// PC 펠트는 화면 높이에서 머리글·상태 바·차례 줄·손패 몫(약 32rem)을 뺀 만큼까지만 늘어나 1280×860 한 화면에 들어간다.
const FELT: Record<TableLayout, string> = {
  pc: 'flex-col min-h-[min(560px,calc(100dvh-32rem))] max-w-6xl justify-center gap-3 px-[6%] py-3',
  landscape: 'flex-row items-center justify-center gap-3 px-[4%] py-2',
  portrait: 'flex-col gap-3 px-3 py-4',
};
/** 눕힌 화면에 상대가 5명이면 옆 칸에 세 줄로 쌓여 손패가 화면 밖으로 밀리므로, 상대를 위 줄에 두고 가운데를 그 아래에 둔다. */
const LANDSCAPE_TOP_SEATS = 5;
// 위 줄 배치는 390px 높이에 들어가도록 펠트 여백을 줄이고, 자리 뒷면을 작게, 부채 위 안내 줄은 뺀다(같은 말이 왼쪽 차례 줄과 "뽑히는 중" 표시에 있다).
const FELT_LANDSCAPE_TOP = 'flex-col items-center justify-center gap-1 px-[4%] py-1';
const LANDSCAPE_TOP_BACK = 16;
/** 뽑기를 보낸 뒤 차례가 바뀌거나 오류가 오기 전까지 다시 보내지 않는 시간(우노와 같다). */
const PENDING_MS = 3000;
/** R23: 섞기 버튼 잠금 시간(서버 쿨다운과 같다). */
const SHUFFLE_LOCK_MS = 1000;
/** 다른 숫자를 골랐을 때 안내가 보이는 시간. */
const HINT_MS = 2000;

type PickState = { key: string; ids: number[]; hint: string | null };
/** 보낸 버리기: 보낸 짝의 카드(누를 수 없음)와 자동으로 버리기를 보냈는지. key가 지금 잠금 열쇠와 같을 때만 유효하다. */
type Sent = { key: string; ids: number[]; all: boolean };

export function OldMaidTable({ view, room, meId, log, receivedAt, now, errorSeq, nicknameOf, send: rawSend, signal, sendSignal, aside, asideFooter, transition, onCloseGameOver, onReadyNext }: TableProps<OldMaidSessionView>) {
  const game = view.game;
  const layout = useTableLayout();
  const wide = layout === 'pc';
  const sizes = useOldMaidSizes(layout);
  const { play } = useSound();
  const live = game.status === 'IN_PROGRESS';
  const opening = live && game.stage === 'OPENING_DISCARD';
  const myTurn = live && game.currentPlayerId === meId;
  const drawing = live && game.stage === 'DRAW';
  // 처음 버리기 단계에는 버릴 짝이 있는 모두가, 그 밖에는 뽑는 사람이 할 일이 있다(리본·5초 경고 소리).
  const acting = myTurn || (opening && game.canDiscard);
  const liftIndex = effectivePeek(game, signal);

  // 뽑기는 보낸 뒤 차례가 바뀌거나(새 판 포함) 오류가 오기 전까지 다시 보내지 않는다. 섞기는 이 잠금을 쓰지 않는다.
  // 남의 섞기처럼 같은 차례 안의 화면 갱신으로는 풀지 않는다(풀면 두 번 눌러 DRAW가 두 번 가고 NOT_YOUR_TURN이 뜬다).
  const pendingUntil = useRef(0);
  useEffect(() => {
    pendingUntil.current = 0;
  }, [game.turnSeq, game.startedAt, errorSeq]);
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

  // R36·R37 짝 고르기: 같은 숫자 두 장째를 누르면 바로 DISCARD, 다른 숫자면 새 카드만 고른 채 잠깐 안내.
  // 고른 카드는 단계(차례·단계)가 바뀌면 처음부터, 손에서 사라진 카드는 빠진다.
  const hand = game.hand ?? [];
  const pickKey = `${game.startedAt}:${game.turnSeq}:${game.stage}`;
  const [pick, setPick] = useState<PickState>({ key: pickKey, ids: [], hint: null });
  const current = pick.key === pickKey ? pick : null;
  const selectedIds = current ? keepInHand(current.ids, hand) : [];
  const hint = current?.hint ?? null;
  useEffect(() => {
    if (!pick.hint) {
      return undefined;
    }
    const timer = window.setTimeout(() => setPick((before) => (before === pick ? { ...before, hint: null } : before)), HINT_MS);
    return () => window.clearTimeout(timer);
  }, [pick]);
  // 보낸 짝(또는 자동으로 버리기)은 내 손패·단계가 바뀌거나 오류가 오기 전까지 다시 보내지 않는다(같은 짝을 두 번 보내 오류가 뜨지 않게).
  const lockKey = `${pickKey}:${errorSeq}:${hand.map((one) => one.id).join(',')}`;
  const [sent, setSent] = useState<Sent>({ key: '', ids: [], all: false });
  const pending = sent.key === lockKey ? sent : null;
  const pendingIds = pending?.ids ?? [];
  const allPending = pending?.all ?? false;
  const choose = (id: number) => {
    if (allPending || pendingIds.includes(id)) {
      return;
    }
    const step = pickCard(hand, selectedIds, id);
    setPick({ key: pickKey, ids: step.ids, hint: step.hint });
    if (!step.send) {
      return;
    }
    setSent({ key: lockKey, ids: [...pendingIds, ...step.send], all: false });
    rawSend({ type: 'DISCARD', cardIds: step.send });
  };
  // R39: 지금 버릴 수 있는 내 짝을 한 번에(처음 버리기는 손의 짝 모두, 짝 버리기는 뽑은 짝).
  const discardAll = () => {
    if (allPending) {
      return;
    }
    setSent({ key: lockKey, ids: pendingIds, all: true });
    setPick({ key: pickKey, ids: [], hint: null });
    rawSend({ type: 'DISCARD_ALL' });
  };
  const picker = live && game.canDiscard ? {
    selectedIds, glowIds: drawnPairIds(game), pendingIds, onPick: choose, hint, locked: allPending, onDiscardAll: discardAll,
  } : undefined;

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
  const seatsBeside = layout === 'landscape' && opponentIds.length < LANDSCAPE_TOP_SEATS;
  const seatsOnTop = layout === 'landscape' && !seatsBeside;
  const feltClass = seatsOnTop ? FELT_LANDSCAPE_TOP : FELT[layout];
  const backWidth = seatsOnTop ? LANDSCAPE_TOP_BACK : sizes.back;
  const maxBacks = layout === 'portrait' && opponentIds.length >= 3 ? 4 : 7;
  const containerRef = useRef<HTMLDivElement>(null);
  const { ghosts } = useOldMaidMotion(containerRef, transition, meId, sizes.pick);
  // 기권으로 끝나면(마지막 비행 없음) 연출 없이 바로 결과 창. 배너는 마지막 비행이 내려앉은 뒤에.
  const finaleDelay = transition ? finaleDelayMs(transition.from, transition.to, meId) : undefined;
  const finale = useFinalePhase(game, transition, game.result?.reason === 'FORFEIT', finaleDelay);
  // 마지막 카드가 날아가면 "게임 끝!" 배너와 함께 한 번 울린다. 연출이 없으면(기권·동작 줄이기) 결과 창과 함께 울린다.
  useGameOverCue(liveGameEnd(game, transition), finale === 'banner' || finale === 'done', game.winnerId === meId);
  const shuffling = useShuffleEffects(game.events);
  const targetPlayer = game.players.find((player) => player.playerId === game.targetId);
  const thiefId = game.result?.thiefId ?? null;

  // R36: 처음 버리기 단계에는 "버리는 중"·"다 버림"(손을 다 비운 사람도 등수가 정해질 때까지 "다 버림", 기권은 표시 없음),
  // R37: 짝 버리기 단계의 뽑은 사람은 "짝 버리는 중".
  const seatNote = (player: OldMaidSessionView['game']['players'][number], active: boolean): SeatNote | null => {
    if (opening && !player.forfeited) {
      return player.openingDone || player.cardCount === 0 ? { text: '다 버림', done: true } : { text: '버리는 중', done: false };
    }
    if (active && game.stage === 'DISCARD') {
      return { text: '짝 버리는 중', done: false };
    }
    return null;
  };
  const seat = (playerId: number | undefined) => {
    const player = game.players.find((candidate) => candidate.playerId === playerId);
    if (!player) {
      return null;
    }
    const member = room.members.find((candidate) => candidate.id === player.playerId);
    const active = live && game.currentPlayerId === player.playerId;
    const targeted = drawing && game.targetId === player.playerId;
    return (
      <div key={player.playerId} className="relative z-10">
        <OldMaidSeat player={player} nickname={nicknameOf(player.playerId)} avatar={roomAvatarOf(room, player.playerId)}
          active={active} targeted={targeted} liftIndex={targeted ? liftIndex : null} backWidth={backWidth} maxBacks={maxBacks}
          timer={active && game.deadline !== null ? { deadline: game.deadline, serverNow: game.serverNow } : undefined}
          connected={member?.connected} offlineSeconds={member ? offlineSecondsNow(member, receivedAt, now) : 0}
          shuffling={shuffling.has(player.playerId)} thief={thiefId === player.playerId} note={seatNote(player, active)} />
      </div>
    );
  };
  const seatAt = (index: number | null) => (index === null ? null : seat(opponentIds[index]));

  const caption = seatsOnTop ? null : pickCaption(game, meId, nicknameOf);
  // 짝 버리기 단계에 상대의 마지막 카드를 뽑았으면 그 상대는 이미 끝냈으므로 빈 부채를 그리지 않는다.
  const targetEmptied = game.stage === 'DISCARD' && targetPlayer?.cardCount === 0;
  const showFan = live && targetPlayer !== undefined && game.targetId !== meId && !targetEmptied;
  const center = (
    <div data-testid="center" className="flex w-full min-w-0 flex-col items-center gap-2">
      {caption ? <p data-testid="pick-caption" className="felt-ink text-xs font-bold">{caption}</p> : null}
      <div className="flex w-full min-w-0 items-end justify-center gap-4">
        {showFan && targetPlayer ? (
          // 상대나 차례가 바뀌면 고르던(올린·누른) 카드 기억을 새로 시작한다.
          <TargetFan key={`${targetPlayer.playerId}:${turnKey}`} ownerName={nicknameOf(targetPlayer.playerId)} count={targetPlayer.cardCount} cardWidth={sizes.pick}
            minVisible={sizes.pickMinVisible} liftIndex={drawing ? liftIndex : null} layout={layout} interactive={myTurn && drawing} onPeek={sendPeek} onDraw={draw} />
        ) : null}
        <DiscardPairs pairs={game.recentPairs} count={game.discardCount} cardWidth={sizes.pair} discards={game.discards ?? []} nicknameOf={nicknameOf} />
      </div>
    </div>
  );
  const felt = (
    <Felt shape="oval" className={`mx-auto flex w-full ${feltClass}`}>
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
          <div data-testid="opponent-row" data-placement={seatsBeside ? 'side' : 'top'}
            className={`flex flex-wrap items-start justify-center gap-x-2 gap-y-3 ${seatsBeside ? 'min-w-0 flex-[2]' : ''}`}>{opponentIds.map(seat)}</div>
          {/* 눕힌 화면은 가운데 큰 부채가 폭을 다 차지해 상대 자리가 세로로 쌓이지 않게 몫을 나눈다(부채는 제 폭에 맞춰 겹친다). */}
          <div className={`flex min-w-0 justify-center ${seatsBeside ? 'flex-[3]' : 'w-full'}`}>{center}</div>
        </>
      )}
    </Felt>
  );
  // 할 일이 있으면(내 차례·짝 버리기·처음 버리기) 손패 위에 공통 리본으로 할 일과 남은 시간을 보인다.
  const ribbon = ribbonText(game, meId);
  const mine = game.hand === null ? <SpectatorNotice /> : (
    <div data-testid="my-area" data-active={acting ? 'true' : undefined} className="relative -my-1 rounded-2xl px-1 py-1">
      {ribbon ? <TurnRibbon deadline={game.deadline} serverNow={game.serverNow} label={ribbon.label} showSeconds={ribbon.showSeconds} /> : null}
      <MyHand cards={game.hand} liftIndex={drawing && game.targetId === meId ? liftIndex : null} layout={layout} sizes={sizes} zoneId={meId}
        canShuffle={game.canShuffle} shuffleLocked={shuffleLocked} onShuffle={shuffle} picker={picker} />
    </div>
  );
  const turnBar = (
    <TurnBar instruction={oldMaidInstruction(game, meId, nicknameOf, wide)} myTurn={myTurn} log={log} nicknameOf={nicknameOf} compact={!wide}
      stacked={layout === 'landscape'} deadline={game.deadline} serverNow={game.serverNow} onWarn={acting ? () => play('tick') : undefined} />
  );

  if (finale === 'done' && game.status === 'GAME_OVER') {
    return <OldMaidGameOverPanel game={game} room={room} meId={meId} nicknameOf={nicknameOf} onReady={onReadyNext} onClose={onCloseGameOver} />;
  }
  return (
    <div ref={containerRef} inert={finale !== 'playing'} data-testid="oldmaid-table" data-layout={layout}>
      {layout === 'landscape' ? (
        // 눕힌 휴대폰(390px 높이)에 한 화면으로 들어가게 페이지 위아래 여백(24px)을 4px만 남기고 왼쪽 칸 사이 간격도 줄인다(내 차례 6명 판 기준).
        <div data-testid="landscape-table" className="-my-5 grid grid-cols-[10.5rem_minmax(0,1fr)] items-start gap-3">
          <div data-testid="table-aside" className="sticky top-1 space-y-0.5">{aside}{turnBar}{asideFooter}</div>
          <div className="min-w-0 space-y-2">{felt}{mine}</div>
        </div>
      ) : (
        <div className={wide ? 'space-y-2' : 'space-y-3'}>{turnBar}{felt}{mine}</div>
      )}
      <OldMaidGhostLayer ghosts={ghosts} />
      {finale === 'banner' ? <GameEndBanner subtitle="순위를 정하고 있어요" /> : null}
    </div>
  );
}
