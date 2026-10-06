import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GameEndBanner } from '../../table/GameEndBanner';
import { Felt } from '../../components/Felt';
import type { GameAction, UnoCard, UnoColor, UnoSessionView } from '../../api/types';
import { useToast } from '../../components/Toast';
import { useSound } from '../../lib/sound';
import { offlineSecondsNow } from '../../lib/format';
import { useTableLayout, type TableLayout } from '../../lib/useTableLayout';
import type { TableProps } from '../gameModule';
import { seatOrder, seatRows } from '../../table/seats';
import { SpectatorNotice } from '../../table/SpectatorNotice';
import { TurnBar } from '../../table/TurnBar';
import { COLOR_ORDER, isWild } from './cards';
import { ChallengePrompt } from './ChallengePrompt';
import { ChallengeReveal } from './ChallengeReveal';
import { ColorPicker } from './ColorPicker';
import { describeUnoEvent } from './describe';
import { UNO_SIZES, unoInstruction } from './layout';
import { UnoActionBar } from './UnoActionBar';
import { UnoCenter } from './UnoCenter';
import { UnoHand } from './UnoHand';
import { UnoSeat } from './UnoSeat';
import { UnoGameOverPanel } from './UnoGameOverPanel';
import { UnoGhostLayer } from './motion/UnoGhostLayer';
import { useUnoMotion } from './motion/useUnoMotion';
import { useSeatEffects } from './useSeatEffects';
import { useUnoFinale } from './useUnoFinale';

const PENDING_MS = 3000;

const FELT: Record<TableLayout, string> = {
  pc: 'min-h-[min(60vh,560px)] max-w-6xl justify-center gap-6 px-[6%] py-6',
  landscape: 'gap-2 px-[6%] py-3',
  portrait: 'gap-3 px-3 py-4',
};

const maxSeq = (events: { seq: number }[]) => events.reduce((max, event) => Math.max(max, event.seq), 0);

function colorCounts(hand: UnoCard[]): Record<UnoColor, number> {
  const counts: Record<UnoColor, number> = { RED: 0, YELLOW: 0, GREEN: 0, BLUE: 0 };
  COLOR_ORDER.forEach((color) => {
    counts[color] = hand.filter((card) => card.color === color).length;
  });
  return counts;
}

export function UnoTable({ view, room, meId, log, receivedAt, now, errorSeq, nicknameOf, send: rawSend, aside, asideFooter, transition, onCloseGameOver, onReadyNext }: TableProps<UnoSessionView>) {
  const game = view.game;
  const layout = useTableLayout();
  const wide = layout === 'pc';
  const sizes = UNO_SIZES[layout];
  const myTurn = game.status === 'IN_PROGRESS' && game.currentPlayerId === meId;
  const opponentIds = seatOrder(game.players.map((player) => player.playerId), meId).filter((id) => id !== meId);
  const rows = seatRows(opponentIds.length);
  const maxBacks = layout === 'portrait' && opponentIds.length >= 3 ? 4 : 7;

  const containerRef = useRef<HTMLDivElement>(null);
  const { ghosts } = useUnoMotion(containerRef, transition, meId);
  const finale = useUnoFinale(game, transition);
  const effects = useSeatEffects(game.events);
  const reduced = useReducedMotion();
  const toast = useToast();
  const { play } = useSound();

  // 보낸 뒤 화면이 바뀌거나 오류가 오기 전까지는 다시 보내지 않는다(페이퍼 사파리와 같은 패턴).
  const pendingUntil = useRef(0);
  useEffect(() => {
    pendingUntil.current = 0;
  }, [view, errorSeq]);
  const send = (action: GameAction): boolean => {
    if (Date.now() < pendingUntil.current) {
      return false;
    }
    pendingUntil.current = Date.now() + PENDING_MS;
    rawSend(action);
    return true;
  };

  const [pendingWild, setPendingWild] = useState<UnoCard | null>(null);
  useEffect(() => {
    if (!myTurn) {
      setPendingWild(null);
    }
  }, [myTurn]);
  const counts = colorCounts(game.hand ?? []);

  // 공개는 서버가 UNO_CALL·UNO_CAUGHT 묶음에도 남겨 두므로(R25) 이벤트가 아니라 reveal 자체로 한 번만 보인다.
  const [revealClosed, setRevealClosed] = useState(false);
  const closeReveal = useCallback(() => setRevealClosed(true), []);
  const hasReveal = game.reveal !== null;
  useEffect(() => {
    if (!hasReveal) {
      setRevealClosed(false);
    }
  }, [hasReveal]);
  const showReveal = hasReveal && !revealClosed;
  // +4를 낸 순간의 "지금 색"을 기억해 공개 창에서 그 색 카드를 표시한다(서버 화면에는 바뀐 색만 있다).
  const lastColor = useRef(game.currentColor);
  const lastStage = useRef(game.stage);
  const [fourBaseColor, setFourBaseColor] = useState<UnoColor | null>(null);
  useEffect(() => {
    if (game.stage === 'CHALLENGE' && lastStage.current !== 'CHALLENGE') {
      setFourBaseColor(lastColor.current);
    }
    lastColor.current = game.currentColor;
    lastStage.current = game.stage;
  }, [game.stage, game.currentColor]);

  // 남의 도전 결과는 알림으로만(D10). 처음 그린 화면의 이벤트는 알리지 않는다.
  const seenSeq = useRef(maxSeq(game.events));
  // 이벤트 순번은 판마다 다시 시작하므로, 새 판이 시작되면 본 순번과 닫은 공개를 처음으로 되돌린다.
  const gameStart = useRef(game.startedAt);
  useEffect(() => {
    if (gameStart.current !== game.startedAt) {
      gameStart.current = game.startedAt;
      seenSeq.current = 0;
      setRevealClosed(false);
    }
  }, [game.startedAt]);
  useEffect(() => {
    const fresh = game.events.filter((event) => event.seq > seenSeq.current);
    seenSeq.current = Math.max(seenSeq.current, maxSeq(game.events));
    fresh
      .filter((event) => event.type === 'CHALLENGE' && event.actorId !== meId)
      .forEach((event) => describeUnoEvent(event, nicknameOf).forEach(({ text }) => toast.show(text, 'info')));
  }, [game.events, meId, nicknameOf, toast]);

  const turnKey = useRef<number | null>(null);
  useEffect(() => {
    const mine = myTurn && game.stage !== 'DRAWN' && game.deadline !== null;
    if (mine && turnKey.current !== game.deadline) {
      play('myTurn');
    }
    turnKey.current = mine ? game.deadline : null;
  }, [myTurn, game.stage, game.deadline, play]);

  const called = myTurn && !game.canCallUno && game.events.some((event) => event.type === 'UNO_CALL' && event.actorId === meId);
  const catchTarget = game.canCatch && game.unoCatch ? { id: game.unoCatch.playerId, name: nicknameOf(game.unoCatch.playerId) } : null;

  const draw = () => send({ type: 'DRAW' });
  const playCard = (card: UnoCard) => {
    if (isWild(card)) {
      setPendingWild(card);
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
          catchable={game.unoCatch?.playerId === player.playerId}
          bubble={effects[player.playerId]?.bubble} shaking={effects[player.playerId]?.shake} skipped={effects[player.playerId]?.skipped} />
      </div>
    );
  };
  const seatAt = (index: number | null) => (index === null ? null : seat(opponentIds[index]));

  const center = (
    <UnoCenter drawPileCount={game.drawPileCount} discardTop={game.discardTop} discardCount={game.discardCount} currentColor={game.currentColor}
      direction={game.direction} canDraw={myTurn && game.stage === 'PLAY'} onDraw={draw} cardWidth={sizes.center} />
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
    <div className="relative space-y-1">
      {effects[meId]?.bubble ? (
        <motion.span data-testid="my-uno-bubble" initial={reduced ? false : { scale: 0.6 }} animate={{ scale: 1 }}
          className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-yellow-300 px-2.5 py-0.5 text-xs font-black text-wood-900 shadow">우노!</motion.span>
      ) : null}
      <UnoActionBar stage={game.stage} myTurn={myTurn} onDraw={draw} onPlayDrawn={playDrawn} onKeep={() => send({ type: 'KEEP' })}
        canCallUno={game.canCallUno} called={called} catchTarget={catchTarget}
        onCallUno={() => send({ type: 'CALL_UNO' })} onCatch={() => catchTarget && send({ type: 'CATCH_UNO', targetId: catchTarget.id })} />
      <UnoHand cards={game.hand} playableIds={game.playableCardIds} myTurn={myTurn && (game.stage === 'PLAY' || game.stage === 'DRAWN')}
        layout={layout} zoneId={meId} onPlay={playCard} />
    </div>
  );
  const turnBar = (
    <TurnBar instruction={unoInstruction(game, meId, nicknameOf, wide)} myTurn={myTurn} log={log} nicknameOf={nicknameOf} compact={!wide}
      stacked={layout === 'landscape'} deadline={game.deadline} serverNow={game.serverNow}
      onWarn={myTurn ? () => play('tick') : undefined} />
  );

  const pickWild = (color: UnoColor) => {
    if (!pendingWild) {
      return;
    }
    // 잠금 때문에 보내지 못했으면 창을 열어 둬서 다시 고를 수 있게 한다.
    if (send({ type: 'PLAY', cardId: pendingWild.id, color })) {
      setPendingWild(null);
    }
  };
  const dialogs = (
    <>
      <ColorPicker open={pendingWild !== null} mode="wild" risky={pendingWild?.kind === 'WILD_DRAW_FOUR' && game.wildDrawFourRisky}
        counts={counts} onCancel={() => setPendingWild(null)} onPick={pickWild} />
      <ColorPicker open={myTurn && game.stage === 'CHOOSE_COLOR'} mode="first" risky={false} counts={counts}
        onCancel={() => undefined} onPick={(color) => send({ type: 'CHOOSE_COLOR', color })} />
      <ChallengePrompt open={myTurn && game.stage === 'CHALLENGE' && game.challenge !== null} byName={nicknameOf(game.challenge?.byId ?? 0)}
        deadline={game.deadline} serverNow={game.serverNow} onAccept={() => send({ type: 'ACCEPT' })} onChallenge={() => send({ type: 'CHALLENGE' })} />
      {showReveal && game.reveal ? <ChallengeReveal reveal={game.reveal} name={nicknameOf(game.reveal.playerId)} highlightColor={fourBaseColor} onClose={closeReveal} /> : null}
    </>
  );

  if (finale === 'done') {
    return <UnoGameOverPanel game={game} room={room} meId={meId} nicknameOf={nicknameOf} onReady={onReadyNext} onClose={onCloseGameOver} />;
  }
  return (
    <div ref={containerRef} inert={finale !== 'playing'} data-testid="uno-table" data-layout={layout}>
      {dialogs}
      {layout === 'landscape' ? (
        <div data-testid="landscape-table" className="grid grid-cols-[10.5rem_1fr] items-start gap-3">
          <div data-testid="table-aside" className="sticky top-2 space-y-2">{aside}{turnBar}{asideFooter}</div>
          <div className="space-y-2">{felt}{mine}</div>
        </div>
      ) : (
        <div className="space-y-3">{turnBar}{felt}{mine}</div>
      )}
      <UnoGhostLayer ghosts={ghosts} />
      {finale === 'banner' ? <GameEndBanner /> : null}
    </div>
  );
}
