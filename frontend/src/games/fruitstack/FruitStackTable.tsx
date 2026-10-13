import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import type { FruitStackSessionView } from '../../api/types';
import { EMOTE_DOCK, EmoteDock } from '../../emote/EmoteDock';
import { roomAvatarOf } from '../../lib/avatars';
import { offlineSecondsNow } from '../../lib/format';
import { useSound } from '../../lib/sound';
import { useGameFocus } from '../../lib/useGameFocus';
import { useTableLayout, type TableLayout } from '../../lib/useTableLayout';
import { useRealtime } from '../../realtime/RealtimeContext';
import { GameEndBanner } from '../../table/GameEndBanner';
import { liveGameEnd, useGameOverCue } from '../../table/gameOver';
import { seatOrder } from '../../table/seats';
import { TurnBar } from '../../table/TurnBar';
import { useFinalePhase } from '../../table/useFinalePhase';
import type { TableProps } from '../gameModule';
import type { BoardFrame } from './engine/constants';
import { fitBoard } from './fit';
import { FruitStackGameOverPanel } from './FruitStackGameOverPanel';
import { Hud } from './Hud';
import { MiniBoard } from './MiniBoard';
import { MyBoard } from './MyBoard';
import { PhoneBar } from './PhoneBar';
import { instructionOf } from './texts';
import { useBoardBox } from './useBoardBox';
import { useBoardSignals } from './useBoardSignals';
import { useFruitGame } from './useFruitGame';
import { useScoreReporter } from './useScoreReporter';

/** D22: 내 판이 탈락한 뒤 "가득 찼어요!"를 보이는 시간. 그 뒤 지켜보기 모드로 바뀐다. */
const OUT_NOTICE_MS = 1500;
const STATUS_POLL_MS = 250;
const TICK_POLL_MS = 200;
const TICK_FROM_MS = 3000;
/** 합치기 소리는 이 간격에 한 번까지(연쇄 합치기). */
const MERGE_SOUND_GAP_MS = 80;
/** 바닥 판의 안쪽 여백(px). */
const SURFACE_PAD: Record<TableLayout, number> = { pc: 12, portrait: 4, landscape: 4 };
/** 세로 휴대폰: 감정 표현 버튼은 판 위 간격(6px)까지만 올라와 윗줄(점수 칸·작은 판 이름)을 가리지 않는다. */
const PHONE_EMOTE_DOCK = '-top-1.5 left-1';
const SURFACE_BORDER = 1;

type BoardStatus = { hasFrame: boolean; danger: boolean };

/** 남의 판이 왔는지·위험한지. 판 신호는 React 상태를 거치지 않으므로 가끔 읽어 바뀔 때만 다시 그린다. */
function useBoardStatuses(ids: number[], frameOf: (playerId: number) => BoardFrame | null): Record<number, BoardStatus> {
  const [statuses, setStatuses] = useState<Record<number, BoardStatus>>({});
  const key = ids.join(',');
  useEffect(() => {
    const watched = key === '' ? [] : key.split(',').map(Number);
    const read = () => setStatuses((current) => {
      const next = Object.fromEntries(watched.map((id) => {
        const frame = frameOf(id);
        return [id, { hasFrame: frame !== null, danger: frame?.danger ?? false }];
      }));
      const same = watched.length === Object.keys(current).length
        && watched.every((id) => current[id]?.hasFrame === next[id].hasFrame && current[id]?.danger === next[id].danger);
      return same ? current : next;
    });
    read();
    const timer = window.setInterval(read, STATUS_POLL_MS);
    return () => window.clearInterval(timer);
  }, [key, frameOf]);
  return statuses;
}

/** 내 판이 탈락한 뒤 안내가 끝났는지. 동작 줄이기면 바로 끝난다. */
function useOutNoticeDone(out: boolean, startedAt: number): boolean {
  const reduced = Boolean(useReducedMotion());
  const [doneFor, setDoneFor] = useState<number | null>(null);
  useEffect(() => {
    if (!out) {
      setDoneFor(null);
      return undefined;
    }
    const timer = window.setTimeout(() => setDoneFor(startedAt), reduced ? 0 : OUT_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [out, startedAt, reduced]);
  return out && doneFor === startedAt;
}

/** 자동 떨어뜨리기 3초 전에 한 번 알린다. 다음 과일을 들면 다시 알릴 수 있다. */
function useAutoDropWarning(getAutoDropLeftMs: () => number | null, enabled: boolean, warn: () => void): void {
  const warnRef = useRef(warn);
  warnRef.current = warn;
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    let armed = true;
    const timer = window.setInterval(() => {
      const left = getAutoDropLeftMs();
      if (left === null || left > TICK_FROM_MS) {
        armed = true;
        return;
      }
      if (armed) {
        armed = false;
        warnRef.current();
      }
    }, TICK_POLL_MS);
    return () => window.clearInterval(timer);
  }, [getAutoDropLeftMs, enabled]);
}

const columns = (count: number) => ({ gridTemplateColumns: `repeat(${Math.max(1, count)}, max-content)` });

export function FruitStackTable({ view, room, meId, receivedAt, now, errorSeq, nicknameOf, send, sendSignal, subscribeSignal, aside, asideFooter, onLeave, chat, transition, onCloseGameOver, onReadyNext }: TableProps<FruitStackSessionView>) {
  const game = view.game;
  const layout = useTableLayout();
  const wide = layout === 'pc';
  const { connected } = useRealtime();
  const { play } = useSound();
  const inProgress = game.status === 'IN_PROGRESS';

  const fruit = useFruitGame({ code: room.code, meId, game });
  const reporter = useScoreReporter({ send, connected, game, meId, errorSeq, getLocal: fruit.getLocal, elapsedMs: fruit.elapsedMs });
  const boards = useBoardSignals({
    sendSignal, subscribeSignal, startedAt: game.startedAt, meId, getFrame: fruit.getFrame, out: fruit.hud.out, active: inProgress && fruit.hasBoard,
  });

  // 대기실에서 아래로 내려가 준비를 누른 채 게임이 시작되면 판이 화면 위로 밀려 있다. 판은 맨 위 화면에 맞춰 놓이므로 맨 위로 올린다.
  useEffect(() => {
    if (window.scrollY > 0) {
      window.scrollTo(0, 0);
    }
  }, [game.startedAt]);

  // 판에서 일어난 일: 점수·탈락 보고를 깨우고 소리를 낸다. 떨어뜨리기는 서버에 보내지 않는다.
  const playRef = useRef(play);
  playRef.current = play;
  const { onEvents } = fruit;
  const { poke } = reporter;
  useEffect(() => {
    let lastMergeAt = 0;
    return onEvents((events) => {
      poke();
      events.forEach((event) => {
        if (event.type === 'drop' || event.type === 'autoDrop') {
          playRef.current('place');
          return;
        }
        if (event.type === 'out') {
          playRef.current('roundLose');
          return;
        }
        const at = Date.now();
        if (at - lastMergeAt >= MERGE_SOUND_GAP_MS) {
          lastMergeAt = at;
          playRef.current('merge');
        }
      });
    });
  }, [onEvents, poke]);
  useAutoDropWarning(fruit.getAutoDropLeftMs, inProgress && fruit.hasBoard && !fruit.hud.out, () => play('tick'));

  // 모드: 내가 겨루는 사람이고 탈락 안내가 끝나지 않았으면 내 판을 크게(play), 아니면 남은 판을 크게(watch).
  const stateOf = new Map(game.players.map((player) => [player.playerId, player]));
  const present = (id: number) => { const player = stateOf.get(id); return player !== undefined && player.state !== 'FORFEITED'; };
  const contender = present(meId);
  // 들어왔을 때(새로고침·다시 입장) 이미 탈락해 있었으면 안내를 다시 보이지 않고 바로 지켜본다.
  const arrivalRef = useRef<{ startedAt: number; out: boolean } | null>(null);
  if (arrivalRef.current?.startedAt !== game.startedAt) {
    arrivalRef.current = { startedAt: game.startedAt, out: stateOf.get(meId)?.state === 'OUT' };
  }
  const noticeShown = useOutNoticeDone(fruit.hud.out, game.startedAt);
  const noticeDone = arrivalRef.current.out || noticeShown;
  const mode = contender && !noticeDone ? 'play' : 'watch';

  // 기권한 사람은 방을 나갔으므로 판을 그리지 않는다(결과 창에만 나온다).
  const others = seatOrder(game.participantIds, meId).filter((id) => id !== meId && present(id));
  const watched = contender ? [...others, meId] : others;
  const alive = watched.filter((id) => stateOf.get(id)?.state === 'PLAYING');
  const bigIds = mode === 'play' ? [meId] : alive.length > 0 ? alive : watched;
  const miniIds = mode === 'play' ? others : watched.filter((id) => !bigIds.includes(id));

  const statuses = useBoardStatuses(others, boards.frameOf);
  const gettersRef = useRef(new Map<number, () => BoardFrame | null>());
  const getterOf = (id: number) => {
    if (id === meId) {
      return fruit.getFrame;
    }
    const cached = gettersRef.current.get(id);
    if (cached) {
      return cached;
    }
    const getter = () => boards.frameOf(id);
    gettersRef.current.set(id, getter);
    return getter;
  };

  const finale = useFinalePhase(game, transition, game.result?.reason === 'FORFEIT');
  const showPanel = finale === 'done' && game.status === 'GAME_OVER';
  // 휴대폰에서는 게임 동안 사이트 머리줄을 숨기고 페이지 여백을 줄여 판이 화면을 가득 쓴다. 결과 창에서는 되돌린다.
  const focused = !wide && !showPanel;
  useGameFocus(focused);

  const pad = SURFACE_PAD[layout];
  // 몸통 아래에는 바닥 판의 안쪽 여백과 테두리(1px)가 더 있다.
  const { ref: bodyRef, box } = useBoardBox(layout, pad + SURFACE_BORDER);
  const fit = fitBoard({ layout, box, mode, big: bigIds.length, mini: miniIds.length });

  useGameOverCue(liveGameEnd(game, transition), finale === 'banner' || finale === 'done', game.winnerId === meId);

  if (showPanel) {
    const panel = <FruitStackGameOverPanel game={game} room={room} meId={meId} nicknameOf={nicknameOf} onReady={onReadyNext} onClose={onCloseGameOver} />;
    // 세로 휴대폰은 방 화면이 그리던 대로 결과 창 위에 방 상태 바, 아래에 채팅 줄을 둔다(게임 동안에는 맨 위 한 줄이 대신했다).
    return layout === 'portrait' && aside ? <div className="space-y-4">{aside}{panel}{asideFooter}</div> : panel;
  }

  const board = (id: number, large: boolean) => {
    const player = stateOf.get(id);
    if (!player) {
      return null;
    }
    const mine = id === meId;
    const member = mine ? undefined : room.members.find((candidate) => candidate.id === id);
    const status = statuses[id];
    return (
      <MiniBoard key={id} large={large} width={large ? fit.bigWidth : fit.miniWidth}
        // 내 판의 점수는 보고 전의 합치기까지 담긴 내 판의 값이다.
        player={mine ? { ...player, score: Math.max(player.score, fruit.hud.score) } : player}
        nickname={nicknameOf(id)} avatar={roomAvatarOf(room, id)} getFrame={getterOf(id)}
        hasFrame={mine || (status?.hasFrame ?? false)} danger={!mine && (status?.danger ?? false)}
        connected={member?.connected} offlineSeconds={member ? offlineSecondsNow(member, receivedAt, now) : undefined} />
    );
  };
  const minis = miniIds.map((id) => board(id, false));

  const dockInRail = layout === 'landscape';
  const myBoard = (
    <div className="relative">
      {dockInRail ? null : <EmoteDock meId={meId} className={layout === 'portrait' ? PHONE_EMOTE_DOCK : EMOTE_DOCK} />}
      <MyBoard width={fit.bigWidth} getFrame={fruit.getFrame} getEffects={fruit.getEffects} getAutoDropLeftMs={fruit.getAutoDropLeftMs}
        score={fruit.hud.score} held={fruit.hud.held} out={fruit.hud.out} catchingUp={fruit.hud.catchingUp}
        interactive={inProgress && !fruit.hud.out && !fruit.hud.catchingUp} onAim={fruit.aim} onDrop={fruit.drop} />
    </div>
  );
  // 관전자는 점수·다음 대신 "관전 중", 탈락한 사람은 점수만.
  const hud = (
    <Hud score={contender ? fruit.hud.score : null} next={contender && !fruit.hud.out && fruit.hud.next > 0 ? fruit.hud.next : null}
      deadline={game.deadline} serverNow={game.serverNow} vertical={layout === 'landscape' && mode === 'play'} compact={layout === 'landscape' && mode === 'watch'}
      block={layout === 'portrait' && mode === 'play' && fit.hudBeside} locked={finale !== 'playing'} />
  );

  const playBody: Record<TableLayout, () => ReactNode> = {
    // 작은 판은 내 판 양옆 세로 줄: 1개 → 오른쪽 1, 2개 → 1·1, 3개 → 1·2, 4개 → 2·2.
    pc: () => {
      const left = Math.floor(minis.length / 2);
      return (
        <div className="flex items-center justify-center gap-3">
          {left > 0 ? <div className="flex flex-col gap-3">{minis.slice(0, left)}</div> : null}
          <div className="flex flex-col items-center gap-3">{hud}{myBoard}</div>
          {minis.length > left ? <div className="flex flex-col gap-3">{minis.slice(left)}</div> : null}
        </div>
      );
    },
    // 내 판이 폭을 다 쓰게, 그 위는 한 줄(점수 칸 옆에 작은 판들)이거나 화면이 길면 두 줄(점수 띠, 작은 판 줄)이다.
    portrait: () => {
      const miniRow = minis.length > 0 ? <div data-testid="mini-row" className="flex shrink-0 justify-center gap-2">{minis}</div> : null;
      return (
        <div className="flex flex-col items-center gap-1.5">
          {fit.hudBeside ? <div data-testid="info-row" className="flex w-full items-start gap-2">{hud}{miniRow}</div> : <>{hud}{miniRow}</>}
          {myBoard}
        </div>
      );
    },
    landscape: () => (
      <div className="flex items-start justify-center gap-3">
        {/* 판이 화면 높이를 다 써서 판 모서리 위에 걸칠 자리가 없다. 감정 표현 버튼은 점수 띠 아래에 둔다. */}
        <div className="flex shrink-0 flex-col items-center gap-2">
          {hud}
          <div data-testid="emote-slot" className="relative h-8 w-8"><EmoteDock meId={meId} className="left-0 top-0" /></div>
        </div>
        {myBoard}
        {minis.length > 0 ? <div className="grid gap-2" style={columns(fit.miniCols)}>{minis}</div> : null}
      </div>
    ),
  };
  const watchBody = () => {
    const bigGrid = <div data-testid="big-boards" className="grid justify-center gap-3" style={columns(fit.bigCols)}>{bigIds.map((id) => board(id, true))}</div>;
    if (layout === 'landscape') {
      return (
        <div className="flex flex-col items-center gap-1">
          {hud}
          <div className="flex items-start justify-center gap-3">
            {bigGrid}
            {minis.length > 0 ? <div className="grid grid-flow-col gap-2" style={{ gridTemplateRows: `repeat(${Math.ceil(minis.length / Math.max(1, fit.miniCols))}, max-content)` }}>{minis}</div> : null}
          </div>
        </div>
      );
    }
    const miniRow = minis.length > 0 ? <div className="flex justify-center gap-2">{minis}</div> : null;
    return (
      <div className="flex flex-col items-center gap-3">
        {hud}
        {layout === 'portrait' ? miniRow : null}
        {bigGrid}
        {layout === 'pc' ? miniRow : null}
      </div>
    );
  };

  // 테이블 바닥: 펠트 대신 테마 색의 둥근 판 위에 판들이 놓인다(스펙 6.4).
  const body = (
    <div data-testid="fruit-surface" className={`${layout === 'portrait' ? 'rounded-2xl' : 'rounded-3xl'} border border-(--status-border) bg-(--status-bg) text-cream-50`} style={{ padding: pad }}>
      <div ref={bodyRef}>{mode === 'play' ? playBody[layout]() : watchBody()}</div>
    </div>
  );
  const instruction = instructionOf(game, meId, nicknameOf, wide, fruit.getLocal()?.score ?? null);
  const turnBar = layout === 'portrait' ? (
    <PhoneBar instruction={instruction} deadline={game.deadline} serverNow={game.serverNow} meId={meId} onLeave={onLeave} chat={chat} />
  ) : (
    <TurnBar instruction={instruction} myTurn={false}
      deadline={game.deadline} serverNow={game.serverNow} compact={!wide} stacked={layout === 'landscape'} locked={finale !== 'playing'} />
  );

  return (
    // 방 화면은 칸 사이를 16px씩 띄우는데, 화면을 가득 쓸 때는 그 아래 간격을 지운다.
    <div inert={finale !== 'playing'} data-testid="fruit-table" data-layout={layout} data-mode={mode} className={focused ? '-mb-4' : undefined}>
      {layout === 'landscape' ? (
        <div data-testid="landscape-table" className="grid grid-cols-[10.5rem_minmax(0,1fr)] items-start gap-2">
          <div data-testid="table-aside" className="sticky top-1 space-y-0.5">{aside}{turnBar}{asideFooter}</div>
          <div className="min-w-0">{body}</div>
        </div>
      ) : (
        <div>{turnBar}{body}</div>
      )}
      {finale === 'banner' ? <GameEndBanner /> : null}
    </div>
  );
}
