import { describe, expect, it } from 'vitest';
import { FRUITS } from '../engine/constants';
import { fruitArt, shade } from './fruitArt';

const LEVELS = Array.from({ length: 11 }, (_, index) => index + 1);

describe('과일 그림 자료', () => {
  it('11단계 모두 그림이 있고 첫 도형은 몸 원이다', () => {
    LEVELS.forEach((level) => {
      const color = FRUITS[level - 1].color;
      expect(fruitArt(level)[0]).toEqual({ kind: 'circle', cx: 0, cy: 0, r: 48, fill: color, stroke: shade(color, 0.7), strokeWidth: 4 });
    });
    expect(fruitArt(0)).toEqual([]);
    expect(fruitArt(12)).toEqual([]);
  });

  it('모든 과일에 반사광과 눈 두 개와 입이 있다', () => {
    LEVELS.forEach((level) => {
      const art = fruitArt(level);
      expect(art).toContainEqual(expect.objectContaining({ kind: 'ellipse', cx: -18, cy: -22, opacity: 0.35 }));
      const eyes = art.filter((shape) => shape.kind === 'circle' && shape.r === 4);
      expect(eyes.map((eye) => (eye.kind === 'circle' ? eye.cx : 0))).toEqual([-14, 14]);
      expect(art).toContainEqual(expect.objectContaining({ kind: 'path', d: 'M -9 18 Q 0 26 9 18' }));
    });
  });

  it('모든 좌표가 -50~50 안이다', () => {
    LEVELS.flatMap(fruitArt).forEach((shape) => {
      if (shape.kind === 'path') {
        const numbers = (shape.d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
        expect(numbers.every((value) => Math.abs(value) <= 50)).toBe(true);
        return;
      }
      const [rx, ry] = shape.kind === 'circle' ? [shape.r, shape.r] : [shape.rx, shape.ry];
      expect(Math.abs(shape.cx) + rx).toBeLessThanOrEqual(50);
      expect(Math.abs(shape.cy) + ry).toBeLessThanOrEqual(50);
    });
  });

  it('수박은 짙은 초록 줄무늬 다섯 개다', () => {
    expect(fruitArt(11).filter((shape) => shape.kind === 'path' && shape.stroke === '#1F6B32')).toHaveLength(5);
  });

  it('shade는 채널마다 곱해 내린다', () => {
    expect(shade('#FFFFFF', 0.5)).toBe('#7f7f7f');
    expect(shade('#3FA34D', 0.7)).toBe('#2c7235');
  });
});
