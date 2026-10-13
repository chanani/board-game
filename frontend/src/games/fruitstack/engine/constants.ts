/** 판(R1). 길이는 물리 단위, 왼쪽 위가 (0, 0). */
export const BOARD_W = 360;
export const BOARD_H = 540;
export const LINE_Y = 90;
export const DROP_Y = 45;
export const WALL = 40;
export const FALL_OUT_Y = 640;

/** 걸음(R3). 판의 시계는 걸음 수로 센다: 1초 = 60걸음. */
export const STEP_MS = 1000 / 60;
export const STEPS_PER_SECOND = 60;
export const DROP_COOLDOWN_STEPS = 30; // R6 500 ms
export const AUTO_DROP_STEPS = 600; // R7 10000 ms
export const OVER_LINE_STEPS = 120; // R12 2000 ms
export const MAX_STEPS_PER_TICK = 300; // R16 한 틱에 5초 분량까지
export const TICK_BUDGET_MS = 12; // R16 화면이 보일 때 한 틱의 걸음 밟기 시간
export const CATCH_UP_NOTICE_MS = 1000; // R16 밀림이 이보다 크면 "따라잡는 중…"
export const HIDDEN_TICK_MS = 1000; // R15 가려진 탭의 타이머

/** 경기·보고·신호·저장(R17~R25, R32). */
export const MATCH_LIMIT_MS = 600_000;
export const SCORE_REPORT_GAP_MS = 500;
export const SCORE_RUSH_FROM_MS = 597_000;
export const OUT_RETRY_MS = 1000;
export const REPORT_BACKOFF_MS = 5000;
export const BOARD_SIGNAL_MS = 250;
export const OUT_SIGNAL_MS = 2000;
export const BLEND_MS = 250;
export const MATCH_DISTANCE = 80;
export const MAX_SNAPSHOT_FRUITS = 239;
export const SAVE_MS = 1000;

/** 과일 11단계(R2). points = 이 과일 두 개를 합칠 때 점수 = level × (level + 1) / 2. */
export const FRUITS = [
  { level: 1, name: '체리', radius: 11, points: 1, color: '#E23D4F' },
  { level: 2, name: '딸기', radius: 15, points: 3, color: '#F2617A' },
  { level: 3, name: '포도', radius: 20, points: 6, color: '#8E5BD0' },
  { level: 4, name: '귤', radius: 24, points: 10, color: '#F59A23' },
  { level: 5, name: '감', radius: 30, points: 15, color: '#F0762B' },
  { level: 6, name: '사과', radius: 37, points: 21, color: '#D83A34' },
  { level: 7, name: '배', radius: 44, points: 28, color: '#D9D36A' },
  { level: 8, name: '복숭아', radius: 52, points: 36, color: '#F7A8B8' },
  { level: 9, name: '파인애플', radius: 60, points: 45, color: '#F2C230' },
  { level: 10, name: '멜론', radius: 70, points: 55, color: '#9BD36B' },
  { level: 11, name: '수박', radius: 80, points: 66, color: '#3FA34D' },
] as const;
export const MAX_LEVEL = 11;

const fruitOf = (level: number) => FRUITS[level - 1];
export const radiusOf = (level: number): number => fruitOf(level).radius;
export const pointsOf = (level: number): number => fruitOf(level).points;
export const fruitName = (level: number): string => fruitOf(level).name;

/** 그리기·신호가 쓰는 판 한 장. held 0 = 들고 있지 않음. */
export type FrameFruit = { level: number; x: number; y: number; angle: number };
export type BoardFrame = { held: number; aimX: number; danger: boolean; fruits: FrameFruit[] };
