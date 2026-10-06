import { describe, expect, it } from 'vitest';
import { ghostBox } from './ghostGeometry';

describe('ghostBox', () => {
  it('구역이 넓어도 카드 고정 크기(높이 1.5배)로 두 구역 중심 사이를 잇는다', () => {
    const box = ghostBox({ x: 0, y: 100, width: 400, height: 90 }, { x: 300, y: 0, width: 60, height: 90 }, 64);

    expect(box).toEqual({ left: 168, top: 97, width: 64, height: 96, dx: 130, dy: -100 });
  });
});
