import { useEffect, useRef, type ReactNode } from 'react';
import type { BoardView, GameAction, PaperSafariSessionView, Room, SlotView } from '../../api/types';
import { GameOverPanel } from './GameOverPanel';
import type { SeatTimer } from './PlayerBoard';
import { TableRound, type TableDensity } from './layout/TableRound';
import { TurnBar } from '../../table/TurnBar';
import { seatOrder } from '../../table/seats';
import type { Presence } from './layout/Seat';
import { useTableLayout, type TableLayout } from '../../lib/useTableLayout';
import { offlineSecondsNow } from '../../lib/format';
import { estimateBoard } from './score';
import { useSound } from '../../lib/sound';
import type { ViewTransition } from '../../room/useRoomChannel';
import type { LogEntry } from '../../lib/eventLog';
import { GhostLayer } from './motion/GhostLayer';
import { HiddenZonesContext, LiftedZonesContext } from './motion/ZoneAnchor';
import { useCardMotion } from './motion/useCardMotion';
import { GameEndBanner } from '../../table/GameEndBanner';
import { slotKey, useFinale } from './useFinale';

const PENDING_MS = 3000;

export type PaperSafariTableProps = {
  view: PaperSafariSessionView;
  meId: number;
  opponents: BoardView[];
  myBoard: BoardView | undefined;
  nicknameOf: (memberId: number) => string;
  presenceOf: (memberId: number) => Presence;
  canClickSlot: (slot: SlotView) => boolean;
  clickSlot: (slot: SlotView) => void;
  drawable: boolean;
  send: (action: GameAction) => void;
  canDiscard: boolean;
  canUndo: boolean;
  myTurn: boolean;
  estimate: { score: number; hidden: number } | null;
  /** 이 사람의 행동을 기다리는 중이면 이름표 타이머용 마감을, 아니면 undefined. */
  timerFor: (playerId: number) => SeatTimer | undefined;
};

type Props = {
  view: PaperSafariSessionView;
  room: Room;
  meId: number;
  log: LogEntry[];
  receivedAt: number;
  now: number;
  errorSeq: number;
  nicknameOf: (memberId: number) => string;
  send: (action: GameAction) => void;
  onCloseGameOver: () => void;
  onReadyNext: () => void;
  transition?: ViewTransition | null;
  /** 휴대폰을 눕힌 화면에서 차례 안내 위, 왼쪽 칸에 함께 쌓을 방 정보(상태 바). */
  aside?: ReactNode;
  /** 왼쪽 칸 맨 아래(차례 안내 다음)에 놓을 것(채팅 줄). */
  asideFooter?: ReactNode;
};

const DENSITY_OF: Record<TableLayout, TableDensity> = { pc: 'pc', landscape: 'landscape', portrait: 'mini' };

function placeText(canDiscard: boolean, compact: boolean): string {
  if (compact) {
    return canDiscard ? '바꿀 카드를 누르거나 버리세요' : '바꿀 카드를 눌러 주세요 (버리기 불가)';
  }
  return canDiscard ? '교체할 내 카드를 누르거나, 버리기를 누르세요.' : '교체할 내 카드를 눌러 주세요. (이 카드는 버릴 수 없어요)';
}

function instruction(phase: string, myTurn: boolean, needsFlip: boolean, currentName: string, canDiscard: boolean, compact: boolean): string {
  if (phase === 'SETUP_FLIP') {
    return needsFlip ? (compact ? '카드 1장을 뒤집어 주세요' : '내 카드 1장을 골라 뒤집어 주세요.') : '다른 사람이 카드를 뒤집기를 기다리는 중…';
  }
  if (phase === 'ROUND_OVER') {
    return '게임이 끝났어요!';
  }
  if (!myTurn) {
    return `${currentName}님의 차례예요.`;
  }
  if (phase === 'DRAW') {
    return compact ? '덱이나 버린 카드에서 가져오세요' : '덱 또는 버린 카드 더미에서 카드를 가져오세요.';
  }
  if (phase === 'PLACE') {
    return placeText(canDiscard, compact);
  }
  return '엿볼 내 뒷면 카드를 고르세요.';
}

/** 연출 중에는 직전까지 뒷면이던 칸을 아직 뒷면으로 그려, 차례로 뒤집히게 한다. */
function maskPending(view: PaperSafariSessionView, pending: Set<string>): PaperSafariSessionView {
  if (pending.size === 0) {
    return view;
  }
  const boards = view.game.round.boards.map((board) => ({
    ...board,
    slots: board.slots.map((slot) => (pending.has(slotKey(board.playerId, slot.column, slot.row)) ? { ...slot, faceUp: false, known: false } : slot)),
  }));
  return { game: { ...view.game, round: { ...view.game.round, boards } } };
}

export function PaperSafariTable({ view: rawView, room, meId, log, receivedAt, now, errorSeq, nicknameOf, send: rawSend, onCloseGameOver, onReadyNext, transition, aside, asideFooter }: Props) {
  const { play } = useSound();
  const finale = useFinale(rawView.game, transition ?? null, () => play('flip'));
  const view = maskPending(rawView, finale.pending);
  const game = view.game;
  const round = game.round;
  const pendingUntil = useRef(0);
  const layout = useTableLayout();
  const wide = layout === 'pc';
  const landscape = layout === 'landscape';
  const myTurn = round.currentPlayerId === meId;
  const containerRef = useRef<HTMLDivElement>(null);
  const { ghosts, hidden, lifted } = useCardMotion(containerRef, transition ?? null, errorSeq);
  const wasMyTurn = useRef(false);

  useEffect(() => {
    // 되돌리기로 PLACE에서 DRAW로 돌아와도 내 차례는 이어지는 것이라 소리를 다시 내지 않는다.
    const starting = myTurn && round.phase === 'DRAW' && !wasMyTurn.current;
    if (starting) {
      play('myTurn');
    }
    wasMyTurn.current = myTurn && (round.phase === 'DRAW' || round.phase === 'PLACE');
  }, [myTurn, round.phase, play]);

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

  if (finale.phase === 'done') {
    return <GameOverPanel game={game} room={room} meId={meId} nicknameOf={nicknameOf} onReady={onReadyNext} onClose={onCloseGameOver} />;
  }

  const myBoard = round.boards.find((board) => board.playerId === meId);
  const boardOf = (playerId: number) => round.boards.find((board) => board.playerId === playerId);
  const opponents = seatOrder(round.boards.map((board) => board.playerId), meId)
    .map(boardOf)
    .filter((board): board is BoardView => board !== undefined && board.playerId !== meId);
  const needsFlip = round.phase === 'SETUP_FLIP' && Boolean(myBoard) && !myBoard?.slots.some((slot) => slot.faceUp);
  const held = round.held;
  const canDiscard = myTurn && round.phase === 'PLACE' && held !== null && held.source === 'DECK' && held.card?.kind !== 'TARZAN';
  const canUndo = myTurn && round.phase === 'PLACE' && held?.source === 'DISCARD';
  const estimate = myBoard ? estimateBoard(myBoard) : null;
  const memberOf = (memberId: number) => room.members.find((member) => member.id === memberId);
  const presenceOf = (memberId: number): Presence => {
    const member = memberOf(memberId);
    if (!member) {
      return {};
    }
    return {
      connected: member.connected,
      offlineSeconds: offlineSecondsNow(member, receivedAt, now),
    };
  };
  const canClickSlot = (slot: SlotView): boolean => {
    if (needsFlip) {
      return !slot.faceUp;
    }
    if (!myTurn) {
      return false;
    }
    if (round.phase === 'PLACE') {
      return true;
    }
    return round.phase === 'PEEK' && !slot.faceUp;
  };

  const clickSlot = (slot: SlotView) => {
    const position = { column: slot.column, row: slot.row };
    if (needsFlip) {
      send({ type: 'FLIP', ...position });
      return;
    }
    if (round.phase === 'PLACE') {
      send({ type: 'SWAP', ...position });
      return;
    }
    send({ type: 'PEEK', ...position });
  };

  const drawable = myTurn && round.phase === 'DRAW';
  const seatTimer: SeatTimer = { deadline: game.deadline, serverNow: game.serverNow };
  // 시작 뒤집기는 아직 안 뒤집은 모든 사람을, 그 밖의 행동 단계는 현재 차례인 사람을 기다린다.
  const awaited = (playerId: number): boolean => {
    if (round.phase === 'SETUP_FLIP') {
      return !boardOf(playerId)?.slots.some((slot) => slot.faceUp);
    }
    return round.phase !== 'ROUND_OVER' && round.currentPlayerId === playerId;
  };
  const timerFor = (playerId: number) => (game.deadline != null && awaited(playerId) ? seatTimer : undefined);
  const instructionText = instruction(round.phase, myTurn, needsFlip, nicknameOf(round.currentPlayerId), canDiscard, !wide);

  const tableProps: PaperSafariTableProps = {
    view, meId, opponents, myBoard, nicknameOf, presenceOf, canClickSlot, clickSlot, drawable, send,
    canDiscard, canUndo, myTurn, estimate, timerFor,
  };
  // 시간이 내 행동을 기다릴 때(내 차례, 또는 아직 안 뒤집은 시작 뒤집기)만 5초 경고음을 낸다.
  const waitingOnMe = needsFlip || (myTurn && round.phase !== 'SETUP_FLIP' && round.phase !== 'ROUND_OVER');

  const turnBar = (
    <TurnBar instruction={instructionText} myTurn={myTurn} log={log} nicknameOf={nicknameOf} compact={!wide} stacked={landscape} locked={finale.active}
      deadline={game.deadline} serverNow={game.serverNow} onWarn={waitingOnMe ? () => play('tick') : undefined} />
  );

  return (
    <HiddenZonesContext.Provider value={hidden}>
      <LiftedZonesContext.Provider value={lifted}>
      <div ref={containerRef} inert={finale.active} className={finale.active ? 'pointer-events-none' : undefined}>
        {landscape ? (
          // 눕힌 휴대폰은 높이가 낮아, 방 정보와 차례 안내를 왼쪽 좁은 칸에 세로로 쌓고 테이블에 높이를 모두 준다.
          <div data-testid="landscape-table" className="grid grid-cols-[10.5rem_1fr] items-start gap-3">
            <div data-testid="table-aside" className="sticky top-2 space-y-2">
              {aside}
              {turnBar}
              {asideFooter}
            </div>
            <TableRound {...tableProps} density="landscape" />
          </div>
        ) : (
          <>
            {turnBar}
            <TableRound {...tableProps} density={DENSITY_OF[layout]} />
          </>
        )}
      </div>
      <GhostLayer ghosts={ghosts} />
      {finale.phase === 'banner' ? <GameEndBanner /> : null}
      </LiftedZonesContext.Provider>
    </HiddenZonesContext.Provider>
  );
}
