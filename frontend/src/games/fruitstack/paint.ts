import { BOARD_H, BOARD_W, DROP_Y, LINE_Y, radiusOf, type BoardFrame } from './engine/constants';

/** 판을 그리는 데 필요한 가장 작은 인터페이스(D18). 캔버스 없이도 가짜로 그리기 순서를 검사한다. */
export type Painter = {
  clear(width: number, height: number): void;
  rect(x: number, y: number, width: number, height: number, fill: string): void;
  line(x1: number, y1: number, x2: number, y2: number, color: string, width: number, dash: number[]): void;
  fruit(level: number, x: number, y: number, radius: number, angle: number, alpha: number): void;
  ring(x: number, y: number, radius: number, color: string, alpha: number): void;
  text(text: string, x: number, y: number, size: number, color: string): void;
};
/** progress 0~1. */
export type MergeEffect = { x: number; y: number; radius: number; progress: number };
export type PaintOptions = { scale: number; mine: boolean; dimmed: boolean; effects: MergeEffect[]; autoDropLeftMs: number | null };

const BACKDROP = 'rgba(0, 0, 0, 0.28)';
const LINE = 'rgba(255, 255, 255, 0.45)';
const AIM = 'rgba(255, 255, 255, 0.35)';
const DANGER = '#EF4444';
const WHITE = '#FFFFFF';
const DIMMED_ALPHA = 0.45;
const COUNTDOWN_FROM_MS = 3000;

/** 좌표는 물리 단위 × scale. */
export function paintBoard(painter: Painter, frame: BoardFrame | null, { scale: s, mine, dimmed, effects, autoDropLeftMs }: PaintOptions): void {
  const width = BOARD_W * s;
  const height = BOARD_H * s;
  painter.clear(width, height);
  painter.rect(0, 0, width, height, BACKDROP);
  painter.line(0, LINE_Y * s, width, LINE_Y * s, frame?.danger ? DANGER : LINE, 2, [6, 6]);
  if (!frame) {
    return;
  }
  const holding = frame.held > 0;
  const aimX = frame.aimX * s;
  const alpha = dimmed ? DIMMED_ALPHA : 1;
  if (mine && holding) {
    painter.line(aimX, DROP_Y * s, aimX, height, AIM, 1, [4, 8]);
  }
  frame.fruits.forEach((fruit) => painter.fruit(fruit.level, fruit.x * s, fruit.y * s, radiusOf(fruit.level) * s, fruit.angle, alpha));
  if (holding) {
    painter.fruit(frame.held, aimX, DROP_Y * s, radiusOf(frame.held) * s, 0, alpha);
  }
  effects.forEach((effect) => painter.ring(effect.x * s, effect.y * s, effect.radius * s * (1 + effect.progress), WHITE, 1 - effect.progress));
  if (mine && holding && autoDropLeftMs !== null && autoDropLeftMs <= COUNTDOWN_FROM_MS) {
    const seconds = autoDropLeftMs <= 0 ? '1' : String(Math.ceil(autoDropLeftMs / 1000));
    painter.text(seconds, aimX, (DROP_Y - radiusOf(frame.held) - 8) * s, 16, WHITE);
  }
  if (mine && frame.danger) {
    painter.text('위험', width - 22, LINE_Y * s - 8, 12, DANGER);
  }
}
