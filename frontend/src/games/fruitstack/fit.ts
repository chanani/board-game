import type { TableLayout } from '../../lib/useTableLayout';

export type FitInput = { layout: TableLayout; box: { w: number; h: number }; mode: 'play' | 'watch'; big: number; mini: number };
/** hudBeside: 세로 휴대폰에서 점수 칸을 작은 판 줄 옆에 둘지(아니면 점수 띠가 작은 판 줄 위 한 줄을 쓴다). */
export type BoardFit = { bigWidth: number; miniWidth: number; bigCols: number; miniCols: number; hudBeside: boolean };

const GAP = 12;
const MINI_GAP = 8;
const LABEL = 22;
const HUD = 44;
const COMPACT_HUD = 28;
const RAIL = 64;
/** 지켜보기 모드 가로 휴대폰: 줄인 점수 띠와 판 사이 간격, 작은 판 폭. */
const WATCH_LANDSCAPE_GAP = 4;
const WATCH_MINI_LANDSCAPE = 40;
/** 세로 휴대폰: 줄 사이 간격, 점수 칸을 작은 판 옆에 둘 때의 가장 좁은 폭·가장 낮은 높이, 작은 판 높이의 범위. */
const PHONE_GAP = 6;
const SIDE_HUD_WIDTH = 148;
const SIDE_HUD_HEIGHT = 72;
const PHONE_MINI_MIN = 54;
const PHONE_MINI_MAX = 180;
/** 세로 휴대폰에서 내 판은 들어갈 수 있는 가장 큰 크기의 90%로 둔다(가득 채우면 너무 넓다). */
const PHONE_BOARD_SCALE = 0.9;
const widthOf = (height: number) => Math.max(0, Math.floor((height * 2) / 3));
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function playPc({ box, mini }: FitInput): BoardFit {
  const height = Math.min(600, box.h - HUD - GAP);
  const bigWidth = widthOf(height);
  const cols = Math.min(mini, 2);
  if (cols === 0) {
    return { bigWidth, miniWidth: 0, bigCols: 1, miniCols: 0, hudBeside: false };
  }
  const rows = mini <= 2 ? 1 : 2;
  const target = Math.min(300, (height + HUD - (rows - 1) * GAP) / rows - LABEL);
  const room = Math.floor((box.w - bigWidth - cols * GAP) / cols);
  return { bigWidth, miniWidth: Math.max(0, Math.min(widthOf(target), room)), bigCols: 1, miniCols: cols, hudBeside: false };
}

type PortraitFit = { bigWidth: number; miniWidth: number; hudBeside: boolean };

/**
 * 세로 휴대폰의 한 가지 놓는 법. beside면 [점수 칸 | 작은 판들] 한 줄, 아니면 점수 띠 한 줄 아래 작은 판 줄. 그 아래가 내 판이다.
 * 작은 판은 내 판이 폭을 다 쓰고 남는 높이만큼만 커지고, 남는 높이가 없으면 가장 작은 크기로 줄어 내 판에 높이를 내준다.
 */
const miniRoom = ({ box, mini }: FitInput, beside: boolean) => Math.floor((box.w - (beside ? SIDE_HUD_WIDTH + MINI_GAP : 0) - (mini - 1) * MINI_GAP) / mini);
const miniRowHeight = (miniWidth: number, beside: boolean) => Math.max(Math.ceil(miniWidth * 1.5) + LABEL, beside ? SIDE_HUD_HEIGHT : 0);

function portraitWith(input: FitInput, beside: boolean): PortraitFit {
  const { box } = input;
  const above = beside ? 0 : HUD + PHONE_GAP;
  const spare = box.h - PHONE_GAP - Math.ceil(box.w * 1.5) - above - LABEL;
  const miniWidth = Math.min(widthOf(clamp(spare, PHONE_MINI_MIN, PHONE_MINI_MAX)), miniRoom(input, beside));
  const row = miniRowHeight(miniWidth, beside);
  return { bigWidth: Math.min(box.w, widthOf(box.h - above - row - PHONE_GAP)), miniWidth, hudBeside: beside };
}

/**
 * 가장 큰 놓는 법에서 내 판만 PHONE_BOARD_SCALE로 줄인다(가로세로 비는 그대로, 가운데 정렬은 테이블이 한다).
 * 줄어 남는 높이는 작은 판 줄이 가져가 상대 판이 커진다(높이 180·줄 폭까지). 전체 높이는 줄이기 전보다 크지 않다.
 */
function shrinkPortrait(input: FitInput, fit: PortraitFit): PortraitFit {
  const bigWidth = Math.floor(fit.bigWidth * PHONE_BOARD_SCALE);
  const freed = Math.floor((fit.bigWidth - bigWidth) * 1.5);
  const rowBudget = miniRowHeight(fit.miniWidth, fit.hudBeside) + freed - LABEL;
  const grown = Math.min(widthOf(Math.min(rowBudget, PHONE_MINI_MAX)), miniRoom(input, fit.hudBeside));
  return { bigWidth, miniWidth: Math.max(fit.miniWidth, grown), hudBeside: fit.hudBeside };
}

// 내 판이 더 큰 쪽을 쓰고, 같으면 점수 띠를 한 줄로 두는 쪽을 쓴다(화면이 길어 높이가 남을 때). 그다음 내 판을 90%로 줄인다.
function playPortrait(input: FitInput): BoardFit {
  const { box, mini } = input;
  if (mini === 0) {
    const full = Math.min(box.w, widthOf(box.h - HUD - PHONE_GAP));
    return { bigWidth: Math.floor(full * PHONE_BOARD_SCALE), miniWidth: 0, bigCols: 1, miniCols: 0, hudBeside: false };
  }
  const beside = portraitWith(input, true);
  const stacked = portraitWith(input, false);
  return { ...shrinkPortrait(input, beside.bigWidth > stacked.bigWidth ? beside : stacked), bigCols: 1, miniCols: mini };
}

function playLandscape({ box, mini }: FitInput): BoardFit {
  const bigWidth = widthOf(box.h);
  if (mini === 0) {
    return { bigWidth, miniWidth: 0, bigCols: 1, miniCols: 0, hudBeside: false };
  }
  const cols = mini <= 2 ? 1 : 2;
  const rows = mini <= 1 ? 1 : 2;
  const target = Math.min(300, (box.h - (rows - 1) * MINI_GAP) / rows - LABEL);
  const room = Math.floor((box.w - RAIL - GAP - bigWidth - GAP - (cols - 1) * MINI_GAP) / cols);
  return { bigWidth, miniWidth: Math.max(0, Math.min(widthOf(target), room)), bigCols: 1, miniCols: cols, hudBeside: false };
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
  return { bigWidth, miniWidth: mini > 0 ? WATCH_MINI_LANDSCAPE : 0, bigCols: count, miniCols, hudBeside: false };
}

// 위에서부터: 점수 띠, (작은 판 줄), 큰 판 줄들. 사이마다 GAP.
// 칸 수는 스펙 표의 값에서 시작하되, 다른 칸 수가 판을 더 크게 하면 그쪽을 쓴다(넓은 화면에서 2줄로 접으면 판이 작아진다).
function watch(input: FitInput): BoardFit {
  if (input.layout === 'landscape') {
    return watchLandscape(input);
  }
  const { layout, box, big, mini } = input;
  const count = clamp(big, 1, 5);
  const pc = layout === 'pc';
  const miniHeight = pc ? 72 : 60;
  const miniRow = mini > 0 ? miniHeight + LABEL + GAP : 0;
  const widthWith = (cols: number) => {
    const rows = Math.ceil(count / cols);
    const cell = (box.h - HUD - GAP - miniRow - (rows - 1) * GAP) / rows - LABEL;
    return Math.min(pc ? 400 : box.w, Math.floor((box.w - (cols - 1) * GAP) / cols), widthOf(cell));
  };
  const preferred = pc ? WATCH_PC_COLS[count - 1] : Math.min(count, 2);
  const cols = Array.from({ length: count }, (_, index) => index + 1)
    .reduce((best, candidate) => (widthWith(candidate) > widthWith(best) ? candidate : best), preferred);
  return { bigWidth: widthWith(cols), miniWidth: mini > 0 ? widthOf(miniHeight) : 0, bigCols: cols, miniCols: mini, hudBeside: false };
}

const PLAY: Record<TableLayout, (input: FitInput) => BoardFit> = { pc: playPc, portrait: playPortrait, landscape: playLandscape };

/** 스펙 6.4: 테이블 몸통 상자 안에 큰 판과 작은 판이 들어가는 폭(px). 높이 = 폭 × 1.5. */
export function fitBoard(input: FitInput): BoardFit {
  return input.mode === 'play' ? PLAY[input.layout](input) : watch(input);
}
