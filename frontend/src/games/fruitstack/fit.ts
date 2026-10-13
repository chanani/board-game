import type { TableLayout } from '../../lib/useTableLayout';

export type FitInput = { layout: TableLayout; box: { w: number; h: number }; mode: 'play' | 'watch'; big: number; mini: number };
export type BoardFit = { bigWidth: number; miniWidth: number; bigCols: number; miniCols: number };

const GAP = 12;
const MINI_GAP = 8;
const LABEL = 22;
const HUD = 44;
const COMPACT_HUD = 28;
const RAIL = 64;
/** 지켜보기 모드 가로 휴대폰: 줄인 점수 띠와 판 사이 간격, 작은 판 폭. */
const WATCH_LANDSCAPE_GAP = 4;
const WATCH_MINI_LANDSCAPE = 40;
const widthOf = (height: number) => Math.max(0, Math.floor((height * 2) / 3));
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function playPc({ box, mini }: FitInput): BoardFit {
  const height = Math.min(600, box.h - HUD - GAP);
  const bigWidth = widthOf(height);
  const cols = Math.min(mini, 2);
  if (cols === 0) {
    return { bigWidth, miniWidth: 0, bigCols: 1, miniCols: 0 };
  }
  const rows = mini <= 2 ? 1 : 2;
  const target = Math.min(300, (height + HUD - (rows - 1) * GAP) / rows - LABEL);
  const room = Math.floor((box.w - bigWidth - cols * GAP) / cols);
  return { bigWidth, miniWidth: Math.max(0, Math.min(widthOf(target), room)), bigCols: 1, miniCols: cols };
}

function playPortrait({ box, mini }: FitInput): BoardFit {
  const target = clamp(Math.floor(box.h * 0.16), 60, 120);
  const miniWidth = mini === 0 ? 0 : Math.min(widthOf(target), Math.floor((box.w - (mini - 1) * MINI_GAP) / mini));
  const row = mini === 0 ? 0 : target + LABEL;
  const height = box.h - row - HUD - 24;
  return { bigWidth: Math.min(box.w, widthOf(height)), miniWidth, bigCols: 1, miniCols: mini };
}

function playLandscape({ box, mini }: FitInput): BoardFit {
  const bigWidth = widthOf(box.h);
  if (mini === 0) {
    return { bigWidth, miniWidth: 0, bigCols: 1, miniCols: 0 };
  }
  const cols = mini <= 2 ? 1 : 2;
  const rows = mini <= 1 ? 1 : 2;
  const target = Math.min(300, (box.h - (rows - 1) * MINI_GAP) / rows - LABEL);
  const room = Math.floor((box.w - RAIL - GAP - bigWidth - GAP - (cols - 1) * MINI_GAP) / cols);
  return { bigWidth, miniWidth: Math.max(0, Math.min(widthOf(target), room)), bigCols: 1, miniCols: cols };
}

const WATCH_PC_COLS = [1, 2, 3, 2, 3];

/** 지켜보기 모드의 가로 휴대폰: 작은 판 세로 줄이 높이를 넘으면 줄을 나눈다. */
function watchLandscape({ box, big, mini }: FitInput): BoardFit {
  const count = clamp(big, 1, 5);
  const room = box.h - COMPACT_HUD - WATCH_LANDSCAPE_GAP;
  const perColumn = Math.max(1, Math.floor((room + MINI_GAP) / (WATCH_MINI_LANDSCAPE * 1.5 + LABEL + MINI_GAP)));
  const miniCols = Math.ceil(mini / perColumn);
  const side = miniCols > 0 ? miniCols * WATCH_MINI_LANDSCAPE + (miniCols - 1) * MINI_GAP + GAP : 0;
  const bigWidth = Math.min(Math.floor((box.w - side - (count - 1) * GAP) / count), widthOf(room - LABEL));
  return { bigWidth, miniWidth: mini > 0 ? WATCH_MINI_LANDSCAPE : 0, bigCols: count, miniCols };
}

// 위에서부터: 점수 띠, (작은 판 줄), 큰 판 줄들. 사이마다 GAP.
function watch(input: FitInput): BoardFit {
  if (input.layout === 'landscape') {
    return watchLandscape(input);
  }
  const { layout, box, big, mini } = input;
  const count = clamp(big, 1, 5);
  const pc = layout === 'pc';
  const cols = pc ? WATCH_PC_COLS[count - 1] : Math.min(count, 2);
  const rows = Math.ceil(count / cols);
  const miniHeight = pc ? 72 : 60;
  const miniRow = mini > 0 ? miniHeight + LABEL + GAP : 0;
  const cell = (box.h - HUD - GAP - miniRow - (rows - 1) * GAP) / rows - LABEL;
  const bigWidth = Math.min(pc ? 400 : box.w, Math.floor((box.w - (cols - 1) * GAP) / cols), widthOf(cell));
  return { bigWidth, miniWidth: mini > 0 ? widthOf(miniHeight) : 0, bigCols: cols, miniCols: mini };
}

const PLAY: Record<TableLayout, (input: FitInput) => BoardFit> = { pc: playPc, portrait: playPortrait, landscape: playLandscape };

/** 스펙 6.4: 테이블 몸통 상자 안에 큰 판과 작은 판이 들어가는 폭(px). 높이 = 폭 × 1.5. */
export function fitBoard(input: FitInput): BoardFit {
  return input.mode === 'play' ? PLAY[input.layout](input) : watch(input);
}
