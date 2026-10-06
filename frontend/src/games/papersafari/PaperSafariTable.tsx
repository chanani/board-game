import { useEffect, useRef, type ReactNode } from 'react';
import type { BoardView, GameAction, PaperSafariSessionView, Room, SlotView } from '../../api/types';
import { Button } from '../../components/ui';
import { GameOverPanel } from './GameOverPanel';
import { TableRail } from './layout/TableRail';
import { TableRound } from './layout/TableRound';
import { seatOrder } from './layout/seats';
import type { Presence } from './layout/Seat';
import { PC_QUERY, useMediaQuery } from '../../lib/useMediaQuery';
import { RoundResultModal } from './RoundResultModal';
import { canForfeit, offlineSecondsNow } from '../../lib/format';
import { estimateBoard } from './score';
import { useSound } from '../../lib/sound';
import type { ViewTransition } from '../../room/useRoomChannel';
import { GhostLayer } from './motion/GhostLayer';
import { HiddenZonesContext, LiftedZonesContext } from './motion/ZoneAnchor';
import { useCardMotion } from './motion/useCardMotion';

const PENDING_MS = 3000;

export type TableProps = {
  view: PaperSafariSessionView;
  meId: number;
  opponents: BoardView[];
  myBoard: BoardView | undefined;
  nicknameOf: (memberId: number) => string;
  presenceOf: (memberId: number) => Presence;
  tokensOf: (memberId: number) => number;
  canClickSlot: (slot: SlotView) => boolean;
  clickSlot: (slot: SlotView) => void;
  drawable: boolean;
  send: (action: GameAction) => void;
  canDiscard: boolean;
  myTurn: boolean;
  estimate: { score: number; hidden: number } | null;
  instructionText: string;
  log: string[];
  footer: ReactNode;
};

type Props = {
  view: PaperSafariSessionView;
  room: Room;
  meId: number;
  log: string[];
  receivedAt: number;
  now: number;
  errorSeq: number;
  nicknameOf: (memberId: number) => string;
  onForfeit: (memberId: number) => void;
  send: (action: GameAction) => void;
  onCloseGameOver: () => void;
  transition?: ViewTransition | null;
};

function instruction(phase: string, myTurn: boolean, needsFlip: boolean, currentName: string, canDiscard: boolean): string {
  if (phase === 'SETUP_FLIP') {
    return needsFlip ? '내 카드 1장을 골라 뒤집어 주세요.' : '다른 사람이 카드를 뒤집기를 기다리는 중…';
  }
  if (phase === 'ROUND_OVER') {
    return '라운드가 끝났어요!';
  }
  if (!myTurn) {
    return `${currentName}님의 차례예요.`;
  }
  if (phase === 'DRAW') {
    return '덱 또는 버린 카드 더미에서 카드를 가져오세요.';
  }
  if (phase === 'PLACE') {
    return canDiscard ? '교체할 내 카드를 누르거나, 버리기를 누르세요.' : '교체할 내 카드를 눌러 주세요. (이 카드는 버릴 수 없어요)';
  }
  return '엿볼 내 뒷면 카드를 고르세요.';
}

export function PaperSafariTable({ view, room, meId, log, receivedAt, now, errorSeq, nicknameOf, onForfeit, send: rawSend, onCloseGameOver, transition }: Props) {
  const game = view.game;
  const round = game.round;
  const pendingUntil = useRef(0);
  const wide = useMediaQuery(PC_QUERY);
  const myTurn = round.currentPlayerId === meId;
  const containerRef = useRef<HTMLDivElement>(null);
  const { ghosts, hidden, lifted } = useCardMotion(containerRef, transition ?? null, errorSeq);
  const { play } = useSound();
  const wasMyTurn = useRef(false);

  useEffect(() => {
    const now = myTurn && round.phase === 'DRAW';
    if (now && !wasMyTurn.current) {
      play('myTurn');
    }
    wasMyTurn.current = now;
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

  if (game.status === 'GAME_OVER') {
    return <GameOverPanel game={game} meId={meId} nicknameOf={nicknameOf} onClose={onCloseGameOver} />;
  }

  const myBoard = round.boards.find((board) => board.playerId === meId);
  const boardOf = (playerId: number) => round.boards.find((board) => board.playerId === playerId);
  const opponents = seatOrder(round.boards.map((board) => board.playerId), meId)
    .map(boardOf)
    .filter((board): board is BoardView => board !== undefined && board.playerId !== meId);
  const needsFlip = round.phase === 'SETUP_FLIP' && Boolean(myBoard) && !myBoard?.slots.some((slot) => slot.faceUp);
  const held = round.held;
  const canDiscard = myTurn && round.phase === 'PLACE' && held !== null && held.source === 'DECK' && held.card?.kind !== 'TARZAN';
  const estimate = myBoard ? estimateBoard(myBoard) : null;
  const memberOf = (memberId: number) => room.members.find((member) => member.id === memberId);
  const seated = memberOf(meId) !== undefined;
  const presenceOf = (memberId: number): Presence => {
    const member = memberOf(memberId);
    if (!member) {
      return {};
    }
    return {
      connected: member.connected,
      offlineSeconds: offlineSecondsNow(member, receivedAt, now),
      onForfeit: seated && canForfeit(member, meId, receivedAt, now) ? () => onForfeit(memberId) : undefined,
    };
  };
  const tokensOf = (memberId: number) => game.tokens[String(memberId)] ?? 0;

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
  const instructionText = instruction(round.phase, myTurn, needsFlip, nicknameOf(round.currentPlayerId), canDiscard);

  const footer = myBoard ? (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button variant="secondary" disabled={!canDiscard} onClick={() => send({ type: 'DISCARD' })}>버리기</Button>
      {estimate ? (
        <span className="rounded-full bg-black/35 px-3 py-1 text-sm text-cream-50">
          현재 예상 점수 <strong className="text-lg text-mustard-400">{estimate.score}</strong>
          {estimate.hidden > 0 ? <span className="text-cream-200/80"> (+ 가려진 {estimate.hidden}장)</span> : null}
        </span>
      ) : null}
    </div>
  ) : null;

  const tableProps: TableProps = {
    view, meId, opponents, myBoard, nicknameOf, presenceOf, tokensOf, canClickSlot, clickSlot, drawable, send,
    canDiscard, myTurn, estimate, instructionText, log, footer,
  };
  const Layout = wide ? TableRound : TableRail;

  return (
    <HiddenZonesContext.Provider value={hidden}>
      <LiftedZonesContext.Provider value={lifted}>
      <div ref={containerRef} className="space-y-4">
        <Layout {...tableProps} />
      </div>
      <GhostLayer ghosts={ghosts} />
      {round.phase === 'ROUND_OVER' ? (
        <RoundResultModal view={view} meId={meId} nicknameOf={nicknameOf} onReady={() => send({ type: 'READY' })} />
      ) : null}
      </LiftedZonesContext.Provider>
    </HiddenZonesContext.Provider>
  );
}
