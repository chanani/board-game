import { MATCH_DISTANCE, type BoardFrame, type FrameFruit } from './constants';

const TAU = Math.PI * 2;

/** R25: 최신 판의 i번째 과일과 이어진 이전 판 과일의 번호(없으면 null). */
export function matchFruits(prev: FrameFruit[], next: FrameFruit[]): (number | null)[] {
  const used = new Set<number>();
  return next.map((fruit) => {
    let best: number | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    prev.forEach((candidate, index) => {
      const distance = Math.hypot(candidate.x - fruit.x, candidate.y - fruit.y);
      if (!used.has(index) && candidate.level === fruit.level && distance <= MATCH_DISTANCE && distance < bestDistance) {
        best = index;
        bestDistance = distance;
      }
    });
    if (best !== null) {
      used.add(best);
    }
    return best;
  });
}

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

// 각도는 짧은 쪽으로.
function lerpAngle(from: number, to: number, t: number): number {
  const delta = ((((to - from + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
  return from + delta * t;
}

export function blend(prev: BoardFrame | null, next: BoardFrame, t: number): BoardFrame {
  if (!prev || t >= 1) {
    return next;
  }
  const at = Math.max(0, t);
  const matches = matchFruits(prev.fruits, next.fruits);
  const fruits = next.fruits.map((fruit, index) => {
    const match = matches[index];
    if (match === null) {
      return fruit;
    }
    const from = prev.fruits[match];
    return { level: fruit.level, x: lerp(from.x, fruit.x, at), y: lerp(from.y, fruit.y, at), angle: lerpAngle(from.angle, fruit.angle, at) };
  });
  return { held: next.held, aimX: lerp(prev.aimX, next.aimX, at), danger: next.danger, fruits };
}
