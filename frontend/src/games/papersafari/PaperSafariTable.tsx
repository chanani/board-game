import type { GameAction, PaperSafariSessionView, Room, SlotView } from '../../api/types';
import { Button, Panel } from '../../components/ui';
import { CardFace } from './CardFace';
import { GameOverPanel } from './GameOverPanel';
import { PlayerBoard } from './PlayerBoard';
import { RoundResultModal } from './RoundResultModal';
import { estimateBoard } from './score';

type Props = {
  view: PaperSafariSessionView;
  room: Room;
  meId: number;
  log: string[];
  send: (action: GameAction) => void;
  onCloseGameOver: () => void;
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

export function PaperSafariTable({ view, room, meId, log, send, onCloseGameOver }: Props) {
  const game = view.game;
  const round = game.round;
  const nicknameOf = (memberId: number) => room.members.find((member) => member.id === memberId)?.nickname ?? '떠난 플레이어';

  if (game.status === 'GAME_OVER') {
    return <GameOverPanel game={game} meId={meId} nicknameOf={nicknameOf} onClose={onCloseGameOver} />;
  }

  const myBoard = round.boards.find((board) => board.playerId === meId);
  const others = round.boards.filter((board) => board.playerId !== meId);
  const myTurn = round.currentPlayerId === meId;
  const needsFlip = round.phase === 'SETUP_FLIP' && Boolean(myBoard) && !myBoard?.slots.some((slot) => slot.faceUp);
  const held = round.held;
  const canDiscard = myTurn && round.phase === 'PLACE' && held !== null && held.source === 'DECK' && held.card?.kind !== 'TARZAN';
  const estimate = myBoard ? estimateBoard(myBoard) : null;
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

  return (
    <div className="space-y-4">
      <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
        {others.map((board) => (
          <div key={board.playerId} className="min-w-56">
            <PlayerBoard board={board} nickname={nicknameOf(board.playerId)} tokens={tokensOf(board.playerId)}
              active={round.currentPlayerId === board.playerId} size="sm" />
          </div>
        ))}
      </div>

      <Panel className="flex flex-col items-center gap-3">
        <p className="text-sm text-stone-500">{game.roundNumber}라운드</p>
        <div className="flex items-end gap-6">
          <div className="text-center">
            <button type="button" aria-label="덱에서 뽑기" disabled={!drawable} onClick={() => send({ type: 'DRAW_DECK' })}
              className="flex h-24 w-16 items-center justify-center rounded-xl bg-safari-600 text-2xl text-white shadow ring-1 ring-safari-700 transition enabled:hover:-translate-y-0.5 disabled:opacity-60">
              🌿
            </button>
            <p className="mt-1 text-xs text-stone-500">덱 {round.deckSize}장</p>
          </div>
          <div className="text-center">
            {round.discardTop ? (
              <CardFace card={round.discardTop} faceUp known={false}
                onClick={drawable ? () => send({ type: 'DRAW_DISCARD' }) : undefined} />
            ) : (
              <div className="h-24 w-16 rounded-xl border-2 border-dashed border-stone-300" />
            )}
            <p className="mt-1 text-xs text-stone-500">버린 카드</p>
          </div>
        </div>
        <p className="font-medium">{instruction(round.phase, myTurn, needsFlip, nicknameOf(round.currentPlayerId), canDiscard)}</p>
      </Panel>

      {myBoard ? (
        <div className="mx-auto max-w-md space-y-3">
          {held ? (
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm text-stone-500">
                {held.playerId === meId ? '들고 있는 카드' : `${nicknameOf(held.playerId)}님이 ${held.source === 'DECK' ? '덱' : '버린 카드 더미'}에서 가져온 카드`}
              </span>
              <CardFace card={held.card} faceUp={held.card !== null} known={false} size="sm" />
            </div>
          ) : null}
          <PlayerBoard board={myBoard} nickname={`${nicknameOf(meId)} (나)`} tokens={tokensOf(meId)} active={myTurn}
            onSlotClick={clickSlot} canClick={canClickSlot} />
          <div className="flex items-center justify-between">
            <Button variant="secondary" disabled={!canDiscard} onClick={() => send({ type: 'DISCARD' })}>버리기</Button>
            {estimate ? (
              <span className="text-sm text-stone-600">
                현재 예상 점수 <strong className="text-lg text-safari-700">{estimate.score}</strong>
                {estimate.hidden > 0 ? <span className="text-stone-400"> (+ 가려진 {estimate.hidden}장)</span> : null}
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <Panel className="text-center text-sm text-stone-500">이번 게임을 지켜보는 중이에요.</Panel>
      )}

      <Panel>
        <h3 className="mb-1 text-sm font-bold">진행 기록</h3>
        <ul className="space-y-0.5 text-sm text-stone-600">
          {log.length === 0 ? <li className="text-stone-400">아직 기록이 없어요.</li> : null}
          {log.map((line, index) => (
            <li key={`${index}-${line}`}>{line}</li>
          ))}
        </ul>
      </Panel>

      {round.phase === 'ROUND_OVER' ? (
        <RoundResultModal view={view} meId={meId} nicknameOf={nicknameOf} onReady={() => send({ type: 'READY' })} />
      ) : null}
    </div>
  );
}
