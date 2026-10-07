import { describe, expect, it } from 'vitest';
import { EDGE_FADE, fanAngle, fanSpacing } from './fan';

describe('fan', () => {
  it('폭이 넉넉하면 카드 폭 + 6px 간격', () => {
    const { step, scroll } = fanSpacing(3, 1000, 80, 30);
    expect(step).toBe(86);
    expect(scroll).toBe(false);
  });

  it('좁으면 겹치다가 최소 보이는 폭보다 좁아지면 그 폭으로 두고 가로 스크롤', () => {
    expect(fanSpacing(10, 400, 80, 30).step).toBeLessThan(86);
    const tight = fanSpacing(14, 200, 80, 30);
    expect(tight.step).toBe(30);
    expect(tight.scroll).toBe(true);
  });

  it('부채꼴 각도는 가운데가 0이고 양끝이 대칭', () => {
    expect(fanAngle(0, 1)).toBe(0);
    expect(fanAngle(0, 5)).toBe(-fanAngle(4, 5));
    expect(fanAngle(2, 5)).toBe(0);
  });

  it('스크롤 줄 양끝 흐림은 16px', () => {
    expect(EDGE_FADE).toBe('linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)');
  });
});
