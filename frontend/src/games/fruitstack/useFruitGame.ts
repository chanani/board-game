import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import type { FruitStackView } from '../../api/types';
import { CATCH_UP_NOTICE_MS, HIDDEN_TICK_MS, MAX_LEVEL, MAX_STEPS_PER_TICK, SAVE_MS, TICK_BUDGET_MS, radiusOf, type BoardFrame } from './engine/constants';
import { advance, aim as aimGame, autoDropLeftMs, createGame, drop as dropGame, frameOf, freeze, heldLevel, nextLevel, simMs, type FruitGame, type GameEvent } from './engine/game';
import { boardKey, clearOtherBoards, loadBoard, removeBoard, restore, saveBoard, serialize, type BoardStorage, type SavedBoard } from './engine/persist';
import type { MergeEffect } from './paint';

export type FruitHud = { score: number; held: number; next: number; danger: boolean; out: boolean; catchingUp: boolean };
/** run을 되풀이해 부르게 하고, 멈추는 함수를 돌려준다. 기본은 화면이 보이면 requestAnimationFrame, 가려지면 1000 ms 타이머. */
export type Ticker = (run: () => void) => () => void;
export type FruitGameOptions = { code: string; meId: number; game: FruitStackView; storage?: BoardStorage; ticker?: Ticker; now?: () => number };
export type FruitGameHandle = {
  /** 내 판이 있다(내가 기권하지 않은 참가자). 탈락한 판도 true. */
  hasBoard: boolean;
  hud: FruitHud;
  getFrame: () => BoardFrame | null;
  getEffects: () => MergeEffect[];
  getAutoDropLeftMs: () => number | null;
  getLocal: () => { score: number; out: boolean } | null;
  elapsedMs: () => number;
  aim: (x: number) => void;
  drop: () => void;
  onEvents: (listener: (events: GameEvent[]) => void) => () => void;
};

const EFFECT_MS = 150;
/** 시간 한도를 확인하는 걸음 묶음. */
const CHUNK_STEPS = 30;
const NO_HUD: FruitHud = { score: 0, held: 0, next: 0, danger: false, out: false, catchingUp: false };
const NO_STORAGE: BoardStorage = { length: 0, key: () => null, getItem: () => null, setItem: () => {}, removeItem: () => {} };

const isVisible = () => typeof document === 'undefined' || document.visibilityState === 'visible';

function browserStorage(): BoardStorage {
  try {
    return window.localStorage ?? NO_STORAGE;
  } catch {
    return NO_STORAGE;
  }
}

const defaultTicker: Ticker = (run) => {
  let frame = 0;
  let timer = 0;
  const stop = () => {
    window.cancelAnimationFrame(frame);
    window.clearInterval(timer);
  };
  const loop = () => {
    frame = window.requestAnimationFrame(loop);
    run();
  };
  const start = () => {
    stop();
    if (isVisible()) {
      frame = window.requestAnimationFrame(loop);
      return;
    }
    timer = window.setInterval(run, HIDDEN_TICK_MS);
  };
  // 돌아온 순간 밀린 만큼 바로 따라잡기 시작한다(R15).
  const onVisibility = () => {
    start();
    if (isVisible()) {
      run();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  start();
  return () => {
    stop();
    document.removeEventListener('visibilitychange', onVisibility);
  };
};

/** R15·R16: elapsedMs까지 따라가되 걸음 상한·시간 한도에서 멈춘다. 남은 밀림은 다음 틱이 잇는다. */
export function runTick(game: FruitGame, elapsedMs: number, limits: { maxSteps: number; budgetMs: number | null; now: () => number }): GameEvent[] {
  const events: GameEvent[] = [];
  const startedAt = limits.now();
  let taken = 0;
  while (taken < limits.maxSteps && !game.out) {
    const before = game.steps;
    events.push(...advance(game, elapsedMs, Math.min(CHUNK_STEPS, limits.maxSteps - taken)));
    const stepped = game.steps - before;
    if (stepped === 0) {
      break;
    }
    taken += stepped;
    if (limits.budgetMs !== null && limits.now() - startedAt > limits.budgetMs) {
      break;
    }
  }
  return events;
}

// 저장된 판이 깨져 있으면 빈 판으로 처음부터 따라잡는다(D15).
function boardFrom(saved: SavedBoard | null, seed: number, autoDrop: boolean): FruitGame {
  if (!saved) {
    return createGame(seed, autoDrop);
  }
  try {
    return restore(saved, autoDrop);
  } catch {
    return createGame(seed, autoDrop);
  }
}

const sameHud = (a: FruitHud, b: FruitHud) =>
  a.score === b.score && a.held === b.held && a.next === b.next && a.danger === b.danger && a.out === b.out && a.catchingUp === b.catchingUp;

type TimedEffect = { x: number; y: number; radius: number; at: number };

export function useFruitGame({ code, meId, game, storage, ticker, now }: FruitGameOptions): FruitGameHandle {
  const reduced = useReducedMotion() ?? false;
  const [hud, setHud] = useState<FruitHud>(NO_HUD);
  const [hasBoard, setHasBoard] = useState(false);
  // 판·시각·효과는 React 밖에 둔다. 화면이 초당 여러 번 와도 세계를 다시 만들지 않는다.
  const boardRef = useRef<FruitGame | null>(null);
  const epochRef = useRef<string | null>(null);
  const startLocalRef = useRef(0);
  const effectsRef = useRef<TimedEffect[]>([]);
  const lastSavedAtRef = useRef(0);
  const listenersRef = useRef(new Set<(events: GameEvent[]) => void>());
  const storageRef = useRef<BoardStorage | null>(null);
  if (storageRef.current === null) {
    storageRef.current = storage ?? browserStorage();
  }
  const latest = useRef({ ticker, now, reduced, key: boardKey(code, meId), startedAt: game.startedAt, status: game.status });
  latest.current = { ticker, now, reduced, key: boardKey(code, meId), startedAt: game.startedAt, status: game.status };

  const clock = useCallback(() => (latest.current.now ?? Date.now)(), []);
  const elapsedMs = useCallback(() => Math.max(0, clock() - startLocalRef.current), [clock]);
  const lagMs = useCallback((board: FruitGame) => elapsedMs() - simMs(board), [elapsedMs]);

  const syncHud = useCallback(() => {
    const board = boardRef.current;
    const next: FruitHud = board
      ? { score: board.score, held: heldLevel(board), next: nextLevel(board), danger: board.overSteps > 0, out: board.out, catchingUp: !board.out && lagMs(board) > CATCH_UP_NOTICE_MS }
      : NO_HUD;
    setHud((current) => (sameHud(current, next) ? current : next));
  }, [lagMs]);

  const save = useCallback(() => {
    const board = boardRef.current;
    const { key, startedAt, status } = latest.current;
    if (!board || status !== 'IN_PROGRESS' || !storageRef.current) {
      return;
    }
    saveBoard(storageRef.current, key, serialize(board, startedAt));
    lastSavedAtRef.current = clock();
  }, [clock]);

  const handle = useCallback((events: GameEvent[]) => {
    if (events.length === 0) {
      return;
    }
    const at = clock();
    events.forEach((event) => {
      if (event.type === 'merge') {
        effectsRef.current.push({ x: event.x, y: event.y, radius: radiusOf(Math.min(event.level + 1, MAX_LEVEL)), at });
      }
    });
    effectsRef.current = effectsRef.current.filter((effect) => at - effect.at < EFFECT_MS);
    if (events.some((event) => event.type === 'out')) {
      save(); // R32 탈락한 순간
    }
    listenersRef.current.forEach((listener) => listener(events));
  }, [clock, save]);

  // 화면을 받을 때마다: 시작 시각 맞추기(R15), 판 만들기(R33·R34), 서버와 맞추기(R21 (1)·(2)), 끝나면 저장 지우기(R33).
  useEffect(() => {
    const store = storageRef.current ?? NO_STORAGE;
    const at = clock();
    const key = boardKey(code, meId);
    const epoch = `${key}:${game.startedAt}`;
    const candidate = at - (game.serverNow - game.startedAt);
    if (epochRef.current !== epoch) {
      epochRef.current = epoch;
      startLocalRef.current = candidate;
      boardRef.current = null;
      effectsRef.current = [];
      lastSavedAtRef.current = at;
      clearOtherBoards(store, key);
    }
    startLocalRef.current = Math.min(startLocalRef.current, candidate);
    const mine = game.players.find((player) => player.playerId === meId);
    if (!mine || mine.state === 'FORFEITED') {
      boardRef.current = null;
    } else if (!boardRef.current && game.status === 'IN_PROGRESS') {
      // S8: 혼자 하기는 저절로 떨어지지 않는다.
      const autoDrop = game.participantIds.length > 1;
      boardRef.current = boardFrom(loadBoard(store, key, { startedAt: game.startedAt, seed: game.seed }), game.seed, autoDrop);
    }
    const board = boardRef.current;
    if (board && mine) {
      board.score = Math.max(board.score, mine.score);
      if (mine.state === 'OUT' && !board.out) {
        freeze(board);
      }
    }
    if (game.status === 'GAME_OVER') {
      removeBoard(store, key);
    }
    setHasBoard(board !== null);
    syncHud();
  }, [game, code, meId, clock, syncHud]);

  // 틱(R15·R16): 판이 살아 있는 동안만 돈다. 탈락·끝난 판은 마지막 모습으로 남는다.
  const running = hasBoard && game.status === 'IN_PROGRESS' && !hud.out;
  useEffect(() => {
    if (!running) {
      return undefined;
    }
    const tick = () => {
      const board = boardRef.current;
      if (!board || board.out || latest.current.status !== 'IN_PROGRESS') {
        return;
      }
      const budgetMs = isVisible() ? TICK_BUDGET_MS : null;
      handle(runTick(board, elapsedMs(), { maxSteps: MAX_STEPS_PER_TICK, budgetMs, now: clock }));
      if (clock() - lastSavedAtRef.current >= SAVE_MS) {
        save(); // R32
      }
      syncHud();
    };
    return (latest.current.ticker ?? defaultTicker)(tick);
  }, [running, game.startedAt, clock, elapsedMs, handle, save, syncHud]);

  // R32: 떠나거나 가려질 때 저장한다.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        save();
      }
    };
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [save]);

  // R16: 밀리는 동안에는 입력을 받지 않는다(자동 떨어뜨리기는 일어난다).
  const playable = useCallback(() => {
    const board = boardRef.current;
    if (!board || board.out || latest.current.status !== 'IN_PROGRESS' || lagMs(board) > CATCH_UP_NOTICE_MS) {
      return null;
    }
    return board;
  }, [lagMs]);

  const aim = useCallback((x: number) => {
    const board = playable();
    if (board) {
      aimGame(board, x);
    }
  }, [playable]);

  const drop = useCallback(() => {
    const board = playable();
    if (!board) {
      return;
    }
    handle(dropGame(board));
    syncHud();
  }, [playable, handle, syncHud]);

  const getFrame = useCallback(() => (boardRef.current ? frameOf(boardRef.current) : null), []);
  const getAutoDropLeftMs = useCallback(() => (boardRef.current ? autoDropLeftMs(boardRef.current) : null), []);
  const getLocal = useCallback(() => {
    const board = boardRef.current;
    return board ? { score: board.score, out: board.out } : null;
  }, []);
  const getEffects = useCallback((): MergeEffect[] => {
    if (latest.current.reduced) {
      return [];
    }
    const at = clock();
    return effectsRef.current
      .filter((effect) => at - effect.at < EFFECT_MS)
      .map(({ x, y, radius, at: startedAt }) => ({ x, y, radius, progress: Math.max(0, (at - startedAt) / EFFECT_MS) }));
  }, [clock]);
  const onEvents = useCallback((listener: (events: GameEvent[]) => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  return { hasBoard, hud, getFrame, getEffects, getAutoDropLeftMs, getLocal, elapsedMs, aim, drop, onEvents };
}
