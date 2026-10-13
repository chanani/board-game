import { describe, expect, it } from 'vitest';
import type { BoardFrame } from './constants';
import { decodeBoard, encodeBoard } from './snapshot';

const frame = (overrides: Partial<BoardFrame> = {}): BoardFrame => ({ held: 5, aimX: 180, danger: false, fruits: [{ level: 1, x: 180, y: 529, angle: 0 }], ...overrides });

describe('R23 판 신호 인코딩', () => {
  it('확인 값: 감을 들고 체리 하나가 바닥에 있는 판', () => {
    expect(encodeBoard(frame())).toBe('WAAAAGAPqA');
  });

  it('머리만 있는 빈 판은 5글자이고 들고 있지 않으면 단계 0이다', () => {
    expect(encodeBoard({ held: 0, aimX: 0, danger: false, fruits: [] })).toBe('AAAAA');
    expect(encodeBoard({ held: 0, aimX: 0, danger: true, fruits: [] })).toBe('AAIAA');
  });

  it('풀면 양자화 오차 안에서 같은 판이 나온다', () => {
    const original = frame({ held: 3, aimX: 271.3, danger: true, fruits: [{ level: 11, x: 80, y: 460, angle: 1.25 }, { level: 4, x: 333.3, y: 12.5, angle: -0.5 }] });

    const decoded = decodeBoard(encodeBoard(original));

    expect(decoded).not.toBeNull();
    expect(decoded?.held).toBe(3);
    expect(decoded?.danger).toBe(true);
    expect(decoded?.aimX).toBeCloseTo(271.3, 0);
    expect(decoded?.fruits.map((fruit) => fruit.level)).toEqual([11, 4]);
    expect(decoded?.fruits[0].x).toBeCloseTo(80, 0);
    expect(decoded?.fruits[0].y).toBeCloseTo(460, 0);
    expect(decoded?.fruits[0].angle).toBeCloseTo(1.25, 1);
    expect(decoded?.fruits[1].angle).toBeCloseTo(2 * Math.PI - 0.5, 1);
  });

  it('과일은 239개까지만 싣고 길이는 1200을 넘지 않는다', () => {
    const many = Array.from({ length: 300 }, (_, index) => ({ level: (index % 11) + 1, x: index, y: index, angle: 0 }));

    const text = encodeBoard(frame({ fruits: many }));

    expect(text).toHaveLength(1200);
    expect(text).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeBoard(text)?.fruits).toHaveLength(239);
  });

  it('판 밖 좌표는 가장자리로 자른다', () => {
    const decoded = decodeBoard(encodeBoard(frame({ fruits: [{ level: 2, x: -50, y: 9999, angle: 0 }] })));

    expect(decoded?.fruits[0]).toMatchObject({ level: 2, x: 0, y: 540 });
  });

  it('형식이 어긋난 글은 null이고 단계가 틀린 과일 낱말은 건너뛴다', () => {
    expect(decodeBoard('')).toBeNull();
    expect(decodeBoard('WAAA')).toBeNull();
    expect(decodeBoard('WAAAAG')).toBeNull();
    expect(decodeBoard('WAAA+')).toBeNull();
    expect(decodeBoard('WAAAAAAAAAGAPqA')?.fruits).toEqual([expect.objectContaining({ level: 1 })]);
    expect(decodeBoard('WAAAA8AAAA')?.fruits).toEqual([]);
  });
});
