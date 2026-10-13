import { FRUITS } from '../engine/constants';

/** 과일 그림의 하나뿐인 원천(D17). 좌표는 -50~50, 몸 원 반지름 48. SVG(FruitIcon)와 캔버스 스프라이트가 함께 쓴다. */
type Paint = { fill?: string; stroke?: string; strokeWidth?: number; opacity?: number };
export type ArtShape =
  | ({ kind: 'circle'; cx: number; cy: number; r: number } & Paint)
  | ({ kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number } & Paint)
  | ({ kind: 'path'; d: string } & Paint);

/** 각 채널 × factor, 내림. 소문자 #rrggbb. */
export function shade(hex: string, factor: number): string {
  const channel = (at: number) => {
    const value = Math.floor(parseInt(hex.slice(at, at + 2), 16) * factor);
    return Math.min(255, Math.max(0, value)).toString(16).padStart(2, '0');
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

const LEAF = '#4E9A3A';
const STEM = '#6B4A2B';
const FACE = '#3A2A1E';

const line = (d: string, stroke: string, strokeWidth: number): ArtShape => ({ kind: 'path', d, stroke, strokeWidth, fill: 'none' });
const filled = (d: string, fill: string): ArtShape => ({ kind: 'path', d, fill });
const dot = (cx: number, cy: number, r: number, fill: string, opacity?: number): ArtShape =>
  (opacity === undefined ? { kind: 'circle', cx, cy, r, fill } : { kind: 'circle', cx, cy, r, fill, opacity });

const PATTERNS: Record<number, ArtShape[]> = {
  1: [line('M 0 -44 Q 8 -50 18 -46', '#5B7F2A', 4), line('M 0 -44 Q -6 -50 -14 -48', '#5B7F2A', 4)],
  2: [
    ...[[-24, -6], [24, -6], [-30, 20], [30, 20], [-12, 34], [12, 34]].map(([cx, cy]) => dot(cx, cy, 2.5, '#FFE08A')),
    filled('M -18 -40 L 0 -30 L 18 -40 L 8 -46 L 0 -40 L -8 -46 Z', LEAF),
  ],
  3: [[-22, -14], [22, -14], [0, 30]].map(([cx, cy]) => dot(cx, cy, 12, shade('#8E5BD0', 0.85), 0.6)),
  4: [filled('M 0 -44 Q 14 -50 22 -40 Q 10 -36 0 -44 Z', LEAF)],
  5: [filled('M 0 -46 L 12 -38 L 26 -40 L 14 -32 L 0 -34 L -14 -32 L -26 -40 L -12 -38 Z', '#4E7A2E')],
  6: [line('M 0 -40 L 2 -50', STEM, 4), filled('M 2 -46 Q 16 -50 22 -42 Q 10 -40 2 -46 Z', LEAF)],
  7: [{ kind: 'ellipse', cx: 0, cy: -26, rx: 26, ry: 14, fill: '#EFEA9A', opacity: 0.7 }, line('M 0 -42 L -2 -50', STEM, 4)],
  8: [line('M 0 -46 Q -10 0 0 44', shade('#F7A8B8', 0.8), 3), dot(-26, 16, 6, '#F27C97', 0.6), dot(26, 16, 6, '#F27C97', 0.6)],
  9: [
    line('M -34 -20 L 34 20 M -34 20 L 34 -20 M -20 -40 L 40 0 M -40 0 L 20 40', shade('#F2C230', 0.75), 3),
    filled('M -12 -42 L -6 -50 L 0 -42 L 6 -50 L 12 -42 Z', LEAF),
  ],
  10: [line('M -40 -16 Q 0 -30 40 -16 M -44 10 Q 0 -4 44 10 M -16 -42 Q -30 0 -16 42 M 16 -42 Q 30 0 16 42', '#D8F0B8', 2.5)],
  11: ['M -30 -34 Q -38 0 -30 34', 'M -15 -43 Q -20 0 -15 43', 'M 0 -46 L 0 46', 'M 15 -43 Q 20 0 15 43', 'M 30 -34 Q 38 0 30 34']
    .map((d) => line(d, '#1F6B32', 5)),
};

const GLOSS: ArtShape = { kind: 'ellipse', cx: -18, cy: -22, rx: 12, ry: 7, fill: '#FFFFFF', opacity: 0.35 };
// 얼굴이 있어 구를 때 각도가 보인다.
const FACE_SHAPES: ArtShape[] = [dot(-14, 6, 4, FACE), dot(14, 6, 4, FACE), line('M -9 18 Q 0 26 9 18', FACE, 3)];

/** 몸 → 무늬 → 반사광 → 얼굴. 1~11 밖의 단계는 빈 목록. */
export function fruitArt(level: number): ArtShape[] {
  const fruit = FRUITS[level - 1];
  if (!Number.isInteger(level) || !fruit) {
    return [];
  }
  const body: ArtShape = { kind: 'circle', cx: 0, cy: 0, r: 48, fill: fruit.color, stroke: shade(fruit.color, 0.7), strokeWidth: 4 };
  return [body, ...PATTERNS[level], GLOSS, ...FACE_SHAPES];
}
