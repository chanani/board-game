import { useRef } from 'react';
import type { OldMaidSessionView } from '../../api/types';
import { Felt } from '../../components/Felt';
import { useSound } from '../../lib/sound';
import { roomAvatarOf } from '../../lib/avatars';
import { offlineSecondsNow } from '../../lib/format';
import { useTableLayout, type TableLayout } from '../../lib/useTableLayout';
import { seatOrder, seatRows } from '../../table/seats';
import { SpectatorNotice } from '../../table/SpectatorNotice';
import { TurnBar } from '../../table/TurnBar';
import { TurnRibbon } from '../../table/TurnRibbon';
import type { TableProps } from '../gameModule';
import { DiscardPairs } from './DiscardPairs';
import { oldMaidInstruction, pickCaption, useOldMaidSizes } from './layout';
import { MyHand } from './MyHand';
import { OldMaidSeat } from './OldMaidSeat';
import { TargetFan } from './TargetFan';

// PC 펠트는 화면 높이에서 머리글·상태 바·차례 줄·손패 몫(약 32rem)을 뺀 만큼까지만 늘어나 1280×860 한 화면에 들어간다.
const FELT: Record<TableLayout, string> = {
  pc: 'flex-col min-h-[min(560px,calc(100dvh-32rem))] max-w-6xl justify-center gap-3 px-[6%] py-3',
  landscape: 'flex-row items-center justify-center gap-3 px-[4%] py-2',
  portrait: 'flex-col gap-3 px-3 py-4',
};

export function OldMaidTable({ view, room, meId, log, receivedAt, now, nicknameOf, aside, asideFooter }: TableProps<OldMaidSessionView>) {
  const game = view.game;
  const layout = useTableLayout();
  const wide = layout === 'pc';
  const sizes = useOldMaidSizes(layout);
  const { play } = useSound();
  const live = game.status === 'IN_PROGRESS';
  const myTurn = live && game.currentPlayerId === meId;
  const liftIndex = game.peek?.index ?? null;
  const opponentIds = seatOrder(game.players.map((player) => player.playerId), meId).filter((id) => id !== meId);
  const rows = seatRows(opponentIds.length);
  const maxBacks = layout === 'portrait' && opponentIds.length >= 3 ? 4 : 7;
  const containerRef = useRef<HTMLDivElement>(null);
  const targetPlayer = game.players.find((player) => player.playerId === game.targetId);
  const thiefId = game.result?.thiefId ?? null;

  const seat = (playerId: number | undefined) => {
    const player = game.players.find((candidate) => candidate.playerId === playerId);
    if (!player) {
      return null;
    }
    const member = room.members.find((candidate) => candidate.id === player.playerId);
    const active = live && game.currentPlayerId === player.playerId;
    const targeted = live && game.targetId === player.playerId;
    return (
      <div key={player.playerId} className="relative z-10">
        <OldMaidSeat player={player} nickname={nicknameOf(player.playerId)} avatar={roomAvatarOf(room, player.playerId)}
          active={active} targeted={targeted} liftIndex={targeted ? liftIndex : null} backWidth={sizes.back} maxBacks={maxBacks}
          timer={active && game.deadline !== null ? { deadline: game.deadline, serverNow: game.serverNow } : undefined}
          connected={member?.connected} offlineSeconds={member ? offlineSecondsNow(member, receivedAt, now) : 0}
          thief={thiefId === player.playerId} />
      </div>
    );
  };
  const seatAt = (index: number | null) => (index === null ? null : seat(opponentIds[index]));

  const caption = pickCaption(game, meId, nicknameOf);
  const showFan = live && targetPlayer !== undefined && game.targetId !== meId;
  const center = (
    <div data-testid="center" className="flex w-full min-w-0 flex-col items-center gap-2">
      {caption ? <p data-testid="pick-caption" className="felt-ink text-xs font-bold">{caption}</p> : null}
      <div className="flex w-full min-w-0 items-end justify-center gap-4">
        {showFan && targetPlayer ? (
          <TargetFan ownerName={nicknameOf(targetPlayer.playerId)} count={targetPlayer.cardCount} cardWidth={sizes.pick}
            minVisible={sizes.pickMinVisible} liftIndex={liftIndex} layout={layout} />
        ) : null}
        <DiscardPairs pairs={game.recentPairs} count={game.discardCount} cardWidth={sizes.pair} />
      </div>
    </div>
  );
  const felt = (
    <Felt shape="oval" className={`mx-auto flex w-full ${FELT[layout]}`}>
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
          <div data-testid="opponent-row" className={`flex flex-wrap items-start justify-center gap-x-2 gap-y-3 ${layout === 'landscape' ? 'min-w-0 flex-[2]' : ''}`}>{opponentIds.map(seat)}</div>
          {/* 눕힌 화면은 가운데 큰 부채가 폭을 다 차지해 상대 자리가 세로로 쌓이지 않게 몫을 나눈다(부채는 제 폭에 맞춰 겹친다). */}
          <div className={`flex min-w-0 justify-center ${layout === 'landscape' ? 'flex-[3]' : ''}`}>{center}</div>
        </>
      )}
    </Felt>
  );
  // 내 차례(뽑는 사람)면 손패 위에 공통 리본으로 남은 시간을 보인다.
  const mine = game.hand === null ? <SpectatorNotice /> : (
    <div data-testid="my-area" data-active={myTurn ? 'true' : undefined} className="relative -my-1 rounded-2xl px-1 py-1">
      {myTurn ? <TurnRibbon deadline={game.deadline} serverNow={game.serverNow} /> : null}
      <MyHand cards={game.hand} liftIndex={live && game.targetId === meId ? liftIndex : null} layout={layout} sizes={sizes} zoneId={meId}
        canShuffle={game.canShuffle} shuffleLocked={false} onShuffle={() => undefined} />
    </div>
  );
  const turnBar = (
    <TurnBar instruction={oldMaidInstruction(game, meId, nicknameOf, wide)} myTurn={myTurn} log={log} nicknameOf={nicknameOf} compact={!wide}
      stacked={layout === 'landscape'} deadline={game.deadline} serverNow={game.serverNow} onWarn={myTurn ? () => play('tick') : undefined} />
  );

  return (
    <div ref={containerRef} data-testid="oldmaid-table" data-layout={layout}>
      {layout === 'landscape' ? (
        <div data-testid="landscape-table" className="grid grid-cols-[10.5rem_1fr] items-start gap-3">
          <div data-testid="table-aside" className="sticky top-2 space-y-2">{aside}{turnBar}{asideFooter}</div>
          <div className="space-y-2">{felt}{mine}</div>
        </div>
      ) : (
        <div className={wide ? 'space-y-2' : 'space-y-3'}>{turnBar}{felt}{mine}</div>
      )}
    </div>
  );
}
