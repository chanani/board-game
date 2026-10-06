import { Felt } from '../../../components/Felt';
import { WoodRail } from '../../../components/WoodRail';
import { CenterPiles } from './CenterPiles';
import { Hud } from './Hud';
import { MySide } from './MySide';
import { OpponentSeat } from './OpponentSeat';
import { Seat } from './Seat';
import { SpectatorNotice } from './SpectatorNotice';
import type { TableProps } from '../PaperSafariTable';

export function TableRail(props: TableProps) {
  const { view, meId, opponents, myBoard, nicknameOf, presenceOf, tokensOf, canClickSlot, clickSlot, drawable, send, canDiscard, estimate, myTurn, instructionText, log } = props;
  const round = view.game.round;
  return (
    <div className="space-y-3">
      <Hud roundNumber={view.game.roundNumber} instruction={instructionText} myTurn={myTurn} log={log} />
      <WoodRail className="flex justify-[safe_center] gap-1.5 overflow-x-auto px-3 py-2">
        {opponents.map((board) => (
          <div key={board.playerId} className="shrink-0">
            <OpponentSeat board={board} nickname={nicknameOf(board.playerId)} tokens={tokensOf(board.playerId)}
              active={round.currentPlayerId === board.playerId} held={round.held} presence={presenceOf(board.playerId)} />
          </div>
        ))}
      </WoodRail>
      <Felt className="flex flex-col items-center gap-5 px-3 py-6">
        <CenterPiles deckSize={round.deckSize} discardTop={round.discardTop} drawable={drawable} size="md"
          onDrawDeck={() => send({ type: 'DRAW_DECK' })} onDrawDiscard={() => send({ type: 'DRAW_DISCARD' })} />
        {myBoard ? (
          <div className="flex w-full items-start gap-2">
          <Seat board={myBoard} nickname={`${nicknameOf(meId)} (나)`} tokens={tokensOf(meId)} active={myTurn}
            held={round.held} size="md" presence={{}} handLabel="들고 있는 카드" onSlotClick={clickSlot} canClick={canClickSlot} pulseSlots={myTurn} />
          <MySide canDiscard={canDiscard} estimate={estimate} onDiscard={() => send({ type: 'DISCARD' })} />
          </div>
        ) : <SpectatorNotice />}
      </Felt>
    </div>
  );
}
