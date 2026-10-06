import { Felt } from '../../../components/Felt';
import { WoodRail } from '../../../components/WoodRail';
import { CenterPiles } from './CenterPiles';
import { Hud } from './Hud';
import { Seat } from './Seat';
import { SpectatorNotice } from './SpectatorNotice';
import type { TableProps } from '../PaperSafariTable';

export function TableRail(props: TableProps) {
  const { view, meId, opponents, myBoard, nicknameOf, presenceOf, tokensOf, canClickSlot, clickSlot, drawable, send, myTurn, instructionText, log, footer } = props;
  const round = view.game.round;
  return (
    <div className="space-y-3">
      <Hud roundNumber={view.game.roundNumber} instruction={instructionText} myTurn={myTurn} log={log} />
      <WoodRail className="flex gap-3 overflow-x-auto px-3 py-2">
        {opponents.map((board) => (
          <div key={board.playerId} className="shrink-0">
            <Seat board={board} nickname={nicknameOf(board.playerId)} tokens={tokensOf(board.playerId)}
              active={round.currentPlayerId === board.playerId} held={round.held} size="sm" presence={presenceOf(board.playerId)}
              handLabel={`${nicknameOf(board.playerId)}님이 들고 있는 카드`} />
          </div>
        ))}
      </WoodRail>
      <Felt className="flex flex-col items-center gap-5 px-3 py-6">
        <CenterPiles deckSize={round.deckSize} discardTop={round.discardTop} drawable={drawable} size="md"
          onDrawDeck={() => send({ type: 'DRAW_DECK' })} onDrawDiscard={() => send({ type: 'DRAW_DISCARD' })} />
        {myBoard ? (
          <Seat board={myBoard} nickname={`${nicknameOf(meId)} (나)`} tokens={tokensOf(meId)} active={myTurn}
            held={round.held} size="md" presence={{}} handLabel="들고 있는 카드" onSlotClick={clickSlot} canClick={canClickSlot} pulseSlots={myTurn} />
        ) : <SpectatorNotice />}
      </Felt>
      {footer ? <div className="mx-auto max-w-md">{footer}</div> : null}
    </div>
  );
}
