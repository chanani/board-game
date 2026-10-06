import { useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { CardView, PaperSafariView, SlotView } from '../../api/types';
import type { ViewTransition } from '../../room/useRoomChannel';

export type FinalePhase = 'idle' | 'revealing' | 'banner' | 'done';

const FLIP_STEP_MS = 120;
const REVEAL_MAX_MS = 1200;
const BANNER_MS = 1300;
/** 뒷면 카드가 많으면 뒤집기 간격이 짧아지므로, 소리는 이 간격보다 자주 내지 않는다. */
const SOUND_GAP_MS = 100;

/** 연출 한 번. hidden은 직전까지 뒷면이던 칸의 열쇠("playerId:column:row")를 뒤집을 순서대로 담는다. */
type Run = { game: PaperSafariView; hidden: string[] };
type Progress = { stage: 'revealing' | 'banner' | 'done'; flipped: number };

export const slotKey = (playerId: number, column: number, row: number) => `${playerId}:${column}:${row}`;

const isOver = (game: PaperSafariView) => game.status === 'GAME_OVER';

const sameCard = (a: CardView | null, b: CardView | null) => a?.kind === b?.kind && a?.value === b?.value;

/** 마지막 행동이 들고 있던 카드를 내려놓은 것이면, 그 카드가 들어간 칸(직전까지 뒷면)의 열쇠. 이미 앞면으로 놓였으니 다시 뒤집지 않는다. */
function lastPlaced(prev: PaperSafariView, next: PaperSafariView): string | null {
  const held = prev.round.held;
  if (!held) {
    return null;
  }
  const card = held.source === 'DISCARD' ? prev.round.discardTop : held.card;
  const before = prev.round.boards.find((board) => board.playerId === held.playerId);
  const after = next.round.boards.find((board) => board.playerId === held.playerId);
  const wasHidden = (slot: SlotView) => !before?.slots.find((old) => old.column === slot.column && old.row === slot.row)?.faceUp;
  const target = after?.slots.find((slot) => wasHidden(slot) && sameCard(slot.card, card));
  return target ? slotKey(held.playerId, target.column, target.row) : null;
}

function hiddenBefore(prev: PaperSafariView, next: PaperSafariView): string[] {
  const placed = lastPlaced(prev, next);
  return next.round.boards.flatMap((board) => {
    const before = prev.round.boards.find((item) => item.playerId === board.playerId);
    return board.slots
      .filter((slot) => !before?.slots.find((old) => old.column === slot.column && old.row === slot.row)?.faceUp)
      .map((slot) => slotKey(board.playerId, slot.column, slot.row));
  }).filter((key) => key !== placed);
}

/** 게임 중이던 상태에서 라운드 결과와 함께 끝났을 때만 연출한다. 기권 종료·동작 줄이기는 바로 결과로 간다. */
function startRun(prev: PaperSafariView | null, next: PaperSafariView, reduced: boolean): Run | null {
  if (!prev || isOver(prev) || !isOver(next) || reduced || !next.lastRoundResult) {
    return null;
  }
  return { game: next, hidden: hiddenBefore(prev, next) };
}

/**
 * 방 상태가 먼저 대기 중으로 바뀌면 테이블이 잠깐 내려갔다가 끝난 화면으로 다시 열린다.
 * 그때도 연출하도록, 새로 열릴 때는 마지막으로 받은 전환이 "게임 중 → 끝"이었는지를 본다.
 */
function previousOnMount(game: PaperSafariView, transition: ViewTransition | null): PaperSafariView | null {
  if (transition && transition.animate && transition.to === game) {
    return transition.from;
  }
  return null;
}

function timings(count: number) {
  const step = count === 0 ? 0 : Math.min(FLIP_STEP_MS, REVEAL_MAX_MS / count);
  const soundEvery = step === 0 ? 1 : Math.ceil(SOUND_GAP_MS / step);
  return { step, reveal: step * count, soundEvery };
}

/**
 * 게임이 끝나면 결과 창 전에 마무리 연출을 한다: 뒷면이던 칸을 차례로 뒤집고(revealing),
 * "게임 끝!" 배너를 보인 뒤(banner), 결과 창을 연다(done). 시간은 자체 타이머로만 잰다.
 */
export function useFinale(game: PaperSafariView, transition: ViewTransition | null, onFlip: () => void) {
  const reduced = Boolean(useReducedMotion());
  const [run, setRun] = useState<Run | null>(() => startRun(previousOnMount(game, transition), game, reduced));
  const [seen, setSeen] = useState(game);
  const [progress, setProgress] = useState<Progress>({ stage: 'revealing', flipped: 0 });
  const onFlipRef = useRef(onFlip);
  onFlipRef.current = onFlip;

  if (seen !== game) {
    setSeen(game);
    if (!isOver(game) || !isOver(seen)) {
      setRun(startRun(seen, game, reduced));
      setProgress({ stage: 'revealing', flipped: 0 });
    }
  }

  useEffect(() => {
    if (!run) {
      return undefined;
    }
    const { step, reveal, soundEvery } = timings(run.hidden.length);
    const flips = run.hidden.map((_, index) => window.setTimeout(() => {
      setProgress({ stage: 'revealing', flipped: index + 1 });
      if (index % soundEvery === 0) {
        onFlipRef.current();
      }
    }, step * index));
    const banner = window.setTimeout(() => setProgress((current) => ({ ...current, stage: 'banner' })), reveal);
    const done = window.setTimeout(() => setProgress((current) => ({ ...current, stage: 'done' })), reveal + BANNER_MS);
    return () => [...flips, banner, done].forEach((timer) => window.clearTimeout(timer));
  }, [run]);

  const phase: FinalePhase = phaseOf(game, run, progress);
  const pending = new Set(phase === 'revealing' && run ? run.hidden.slice(progress.flipped) : []);
  return { phase, active: phase === 'revealing' || phase === 'banner', pending };
}

function phaseOf(game: PaperSafariView, run: Run | null, progress: Progress): FinalePhase {
  if (!isOver(game)) {
    return 'idle';
  }
  if (!run) {
    return 'done';
  }
  return progress.stage;
}
