import { Felt } from '../../components/Felt';
import type { UnoCard, UnoSessionView } from '../../api/types';
import { offlineSecondsNow } from '../../lib/format';
import { useTableLayout, type TableLayout } from '../../lib/useTableLayout';
import type { TableProps } from '../gameModule';
import { seatOrder, seatRows } from '../../table/seats';
import { SpectatorNotice } from '../../table/SpectatorNotice';
import { TurnBar } from '../../table/TurnBar';
import { isWild } from './cards';
import { UNO_SIZES, unoInstruction } from './layout';
import { UnoActionBar } from './UnoActionBar';
import { UnoCenter } from './UnoCenter';
import { UnoHand } from './UnoHand';
import { UnoSeat } from './UnoSeat';

const FELT: Record<TableLayout, string> = {
  pc: 'min-h-[min(60vh,560px)] max-w-6xl justify-center gap-6 px-[6%] py-6',
  landscape: 'gap-2 px-[6%] py-3',
  portrait: 'gap-3 px-3 py-4',
};

export function UnoTable({ view, room, meId, log, receivedAt, now, nicknameOf, send, aside, asideFooter }: TableProps<UnoSessionView>) {
  const game = view.game;
  const layout = useTableLayout();
  const wide = layout === 'pc';
  const sizes = UNO_SIZES[layout];
  const myTurn = game.status === 'IN_PROGRESS' && game.currentPlayerId === meId;
  const opponentIds = seatOrder(game.players.map((player) => player.playerId), meId).filter((id) => id !== meId);
  const rows = seatRows(opponentIds.length);
  const maxBacks = layout === 'portrait' && opponentIds.length >= 3 ? 4 : 7;

  const playCard = (card: UnoCard) => {
    if (isWild(card)) {
      return;
    }
    send({ type: 'PLAY', cardId: card.id });
  };
  const playDrawn = () => {
    const drawn = game.hand?.find((card) => card.id === game.drawnCardId);
    if (drawn) {
      playCard(drawn);
    }
  };

  const seat = (playerId: number | undefined) => {
    const player = game.players.find((candidate) => candidate.playerId === playerId);
    if (!player) {
      return null;
    }
    const member = room.members.find((candidate) => candidate.id === player.playerId);
    const active = game.status === 'IN_PROGRESS' && game.currentPlayerId === player.playerId;
    return (
      <div key={player.playerId} data-testid="opponent-seat">
        <UnoSeat player={player} nickname={nicknameOf(player.playerId)} active={active} backWidth={sizes.back} maxBacks={maxBacks}
          timer={active && game.deadline !== null ? { deadline: game.deadline, serverNow: game.serverNow } : undefined}
          connected={member?.connected} offlineSeconds={member ? offlineSecondsNow(member, receivedAt, now) : 0}
          catchable={game.unoCatch?.playerId === player.playerId} />
      </div>
    );
  };
  const seatAt = (index: number | null) => (index === null ? null : seat(opponentIds[index]));

  const center = (
    <UnoCenter drawPileCount={game.drawPileCount} discardTop={game.discardTop} discardCount={game.discardCount} currentColor={game.currentColor}
      direction={game.direction} canDraw={myTurn && game.stage === 'PLAY'} onDraw={() => send({ type: 'DRAW' })} cardWidth={sizes.center} />
  );
  const felt = (
    <Felt shape="oval" className={`mx-auto flex w-full flex-col ${FELT[layout]}`}>
      {wide ? (
        <>
          {rows.top.length > 0 ? <div className="flex items-start justify-center gap-12">{rows.top.map(seatAt)}</div> : null}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="justify-self-start">{seatAt(rows.left)}</div>
            {center}
            <div className="justify-self-end">{seatAt(rows.right)}</div>
          </div>
        </>
      ) : (
        <>
          <div data-testid="opponent-row" className="flex flex-wrap items-start justify-center gap-x-2 gap-y-3">{opponentIds.map(seat)}</div>
          <div className="flex justify-center">{center}</div>
        </>
      )}
    </Felt>
  );
  const mine = game.hand === null ? <SpectatorNotice /> : (
    <div className="space-y-1">
      <UnoActionBar stage={game.stage} myTurn={myTurn} onDraw={() => send({ type: 'DRAW' })} onPlayDrawn={playDrawn} onKeep={() => send({ type: 'KEEP' })} />
      <UnoHand cards={game.hand} playableIds={game.playableCardIds} myTurn={myTurn && (game.stage === 'PLAY' || game.stage === 'DRAWN')}
        layout={layout} zoneId={meId} onPlay={playCard} />
    </div>
  );
  const turnBar = (
    <TurnBar instruction={unoInstruction(game, meId, nicknameOf, wide)} myTurn={myTurn} log={log} nicknameOf={nicknameOf} compact={!wide}
      stacked={layout === 'landscape'} deadline={game.deadline} serverNow={game.serverNow} />
  );

  return (
    <div data-testid="uno-table" data-layout={layout}>
      {layout === 'landscape' ? (
        <div data-testid="landscape-table" className="grid grid-cols-[10.5rem_1fr] items-start gap-3">
          <div data-testid="table-aside" className="sticky top-2 space-y-2">{aside}{turnBar}{asideFooter}</div>
          <div className="space-y-2">{felt}{mine}</div>
        </div>
      ) : (
        <div className="space-y-3">{turnBar}{felt}{mine}</div>
      )}
    </div>
  );
}
