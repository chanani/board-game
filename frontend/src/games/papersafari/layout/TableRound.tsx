import { Felt } from '../../../components/Felt';
import { CenterPiles } from './CenterPiles';
import { Hud } from './Hud';
import { Seat } from './Seat';
import { seatPositions, type SeatPosition } from './seats';
import type { TableProps } from '../PaperSafariTable';

const POSITION_CLASS: Record<SeatPosition, string> = {
  left: 'absolute left-6 top-[38%] -translate-y-1/2',
  'top-left': 'absolute left-[22%] top-6 -translate-x-1/2',
  top: 'absolute left-1/2 top-6 -translate-x-1/2',
  'top-right': 'absolute left-[78%] top-6 -translate-x-1/2',
  right: 'absolute right-6 top-[38%] -translate-y-1/2',
};

export function TableRound(props: TableProps) {
  const { view, meId, opponents, myBoard, nicknameOf, presenceOf, tokensOf, canClickSlot, clickSlot, drawable, send, myTurn, instructionText, log, footer } = props;
  const round = view.game.round;
  const positions = seatPositions(opponents.length);
  return (
    <div className="space-y-3">
      <Hud roundNumber={view.game.roundNumber} instruction={instructionText} myTurn={myTurn} log={log} />
      <Felt shape="oval" className="mx-auto h-[min(78vh,760px)] w-full max-w-6xl">
        {opponents.map((board, index) => (
          <div key={board.playerId} className={POSITION_CLASS[positions[index]]}>
            <Seat board={board} nickname={nicknameOf(board.playerId)} tokens={tokensOf(board.playerId)}
              active={round.currentPlayerId === board.playerId} held={round.held} size="sm" presence={presenceOf(board.playerId)}
              handLabel={`${nicknameOf(board.playerId)}님이 들고 있는 카드`} />
          </div>
        ))}
        <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2">
          <CenterPiles deckSize={round.deckSize} discardTop={round.discardTop} drawable={drawable} size="md"
            onDrawDeck={() => send({ type: 'DRAW_DECK' })} onDrawDiscard={() => send({ type: 'DRAW_DISCARD' })} />
        </div>
        {myBoard ? (
          <div className={`absolute bottom-5 left-1/2 -translate-x-1/2 transition-transform duration-300 ${myTurn ? '-translate-y-2' : ''}`}>
            <Seat board={myBoard} nickname={`${nicknameOf(meId)} (나)`} tokens={tokensOf(meId)} active={myTurn}
              held={round.held} size="lg" presence={{}} handLabel="들고 있는 카드" onSlotClick={clickSlot} canClick={canClickSlot} pulseSlots={myTurn} />
          </div>
        ) : null}
      </Felt>
      <div className="mx-auto max-w-md">{footer}</div>
    </div>
  );
}
