import { Felt } from '../../../components/Felt';
import { useMediaQuery } from '../../../lib/useMediaQuery';
import { WoodRail } from '../../../components/WoodRail';
import { CenterPiles } from './CenterPiles';
import { Hud } from './Hud';
import { MySide } from './MySide';
import { OpponentSeat } from './OpponentSeat';
import { HandAnchor, Seat } from './Seat';
import { SpectatorNotice } from './SpectatorNotice';
import type { TableProps } from '../PaperSafariTable';

/** 이보다 좁은 화면(대부분의 휴대폰)에서는 내 판 카드를 한 단계 작게 그려야 판·손·버리기 칸이 한 줄에 들어간다. */
const ROOMY_QUERY = '(min-width: 440px)';

export function TableRail(props: TableProps) {
  const { view, meId, opponents, myBoard, nicknameOf, presenceOf, canClickSlot, clickSlot, drawable, send, canDiscard, canUndo, estimate, myTurn, instructionText, log } = props;
  const round = view.game.round;
  const roomy = useMediaQuery(ROOMY_QUERY);
  return (
    <div className="space-y-3">
      <Hud instruction={instructionText} myTurn={myTurn} log={log} compact />
      <WoodRail className="flex justify-center-safe gap-[3px] overflow-x-auto px-1 py-2">
        {opponents.map((board) => (
          <div key={board.playerId} className="shrink-0">
            <OpponentSeat board={board} nickname={nicknameOf(board.playerId)}
              active={round.currentPlayerId === board.playerId} held={round.held} presence={presenceOf(board.playerId)} handOverlay />
          </div>
        ))}
      </WoodRail>
      <Felt className="flex flex-col items-center gap-5 px-3 py-6">
        <CenterPiles deckSize={round.deckSize} discardTop={round.discardTop} drawable={drawable} size="md"
          onDrawDeck={() => send({ type: 'DRAW_DECK' })} onDrawDiscard={() => send({ type: 'DRAW_DISCARD' })} />
        {myBoard ? (
          <div className="flex w-full items-start gap-2">
          <Seat board={myBoard} nickname={`${nicknameOf(meId)} (나)`} active={myTurn} turnRing={myTurn} hand="none"
            held={round.held} size={roomy ? 'md' : 'sm'} presence={{}} handLabel="들고 있는 카드" onSlotClick={clickSlot} canClick={canClickSlot} pulseSlots={myTurn} />
          <MySide canDiscard={canDiscard} canUndo={canUndo} estimate={estimate}
            hand={<HandAnchor board={myBoard} held={round.held} size={roomy ? 'md' : 'sm'} handLabel="들고 있는 카드" />}
            onDiscard={() => send({ type: 'DISCARD' })} onUndo={() => send({ type: 'CANCEL_DRAW' })} />
          </div>
        ) : <SpectatorNotice />}
      </Felt>
    </div>
  );
}
