import type { BoardView } from '../../../api/types';
import { Felt } from '../../../components/Felt';
import { CenterPiles } from './CenterPiles';
import { Hud } from './Hud';
import { OpponentSeat } from './OpponentSeat';
import { Seat } from './Seat';
import { SpectatorNotice } from './SpectatorNotice';
import { seatRows } from './seats';
import type { TableProps } from '../PaperSafariTable';

// 자리를 절대 위치로 겹쳐 놓지 않고 위 줄 · 가운데 줄 · 내 줄로 흘려 놓아, 인원과 화면 높이와 상관없이 서로 겹치지 않게 한다.
// 펠트는 내용만큼 자라고, 위 줄은 가운데로 모아 타원의 둥근 모서리 밖으로 나가지 않게 한다.
export function TableRound(props: TableProps) {
  const { view, meId, opponents, myBoard, nicknameOf, presenceOf, tokensOf, canClickSlot, clickSlot, drawable, send, myTurn, instructionText, log, footer } = props;
  const round = view.game.round;
  const rows = seatRows(opponents.length);
  const opponentSeat = (index: number | null) => {
    const board: BoardView | undefined = index === null ? undefined : opponents[index];
    if (!board) {
      return null;
    }
    return (
      <div key={board.playerId} data-testid="opponent-seat">
        <OpponentSeat board={board} nickname={nicknameOf(board.playerId)} tokens={tokensOf(board.playerId)}
          active={round.currentPlayerId === board.playerId} held={round.held} presence={presenceOf(board.playerId)} />
      </div>
    );
  };
  return (
    <div className="space-y-3">
      <Hud roundNumber={view.game.roundNumber} instruction={instructionText} myTurn={myTurn} log={log} />
      <Felt shape="oval" className="mx-auto flex min-h-[min(70vh,640px)] w-full max-w-6xl flex-col justify-between gap-2 px-[6%] pb-4 pt-6">
        {rows.top.length > 0 ? (
          <div className="flex items-start justify-center gap-12">{rows.top.map(opponentSeat)}</div>
        ) : null}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="justify-self-start">{opponentSeat(rows.left)}</div>
          <CenterPiles deckSize={round.deckSize} discardTop={round.discardTop} drawable={drawable} size="md"
            onDrawDeck={() => send({ type: 'DRAW_DECK' })} onDrawDiscard={() => send({ type: 'DRAW_DISCARD' })} />
          <div className="justify-self-end">{opponentSeat(rows.right)}</div>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-4">
          <div />
          {myBoard ? (
            <div className={`transition-transform duration-300 ${myTurn ? '-translate-y-2' : ''}`}>
              <Seat board={myBoard} nickname={`${nicknameOf(meId)} (나)`} tokens={tokensOf(meId)} active={myTurn}
                held={round.held} size="lg" presence={{}} handLabel="들고 있는 카드" onSlotClick={clickSlot} canClick={canClickSlot} pulseSlots={myTurn} />
            </div>
          ) : <SpectatorNotice />}
          <div className="w-56 self-center justify-self-start">{footer}</div>
        </div>
      </Felt>
    </div>
  );
}
