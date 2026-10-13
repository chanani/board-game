import { describe, expect, it } from 'vitest';
import type { BoardFrame } from './engine/constants';
import { paintBoard, type PaintOptions, type Painter } from './paint';

type Call = [string, ...unknown[]];

function fakePainter() {
  const calls: Call[] = [];
  const record = (name: string) => (...args: unknown[]) => { calls.push([name, ...args]); };
  const painter: Painter = { clear: record('clear'), rect: record('rect'), line: record('line'), fruit: record('fruit'), ring: record('ring'), text: record('text') };
  return { painter, calls };
}

const options = (overrides: Partial<PaintOptions> = {}): PaintOptions => ({ scale: 1, mine: false, dimmed: false, effects: [], autoDropLeftMs: null, ...overrides });
const frame = (overrides: Partial<BoardFrame> = {}): BoardFrame => ({ held: 5, aimX: 180, danger: false, fruits: [{ level: 1, x: 100, y: 500, angle: 0.5 }], ...overrides });
const named = (calls: Call[], name: string) => calls.filter(([call]) => call === name);

describe('paintBoard', () => {
  it('판이 없으면 바탕과 선만 그린다', () => {
    const { painter, calls } = fakePainter();

    paintBoard(painter, null, options());

    expect(calls).toEqual([
      ['clear', 360, 540],
      ['rect', 0, 0, 360, 540, 'rgba(0, 0, 0, 0.28)'],
      ['line', 0, 90, 360, 90, 'rgba(255, 255, 255, 0.45)', 2, [6, 6]],
    ]);
  });

  it('과일과 든 과일을 배율에 맞춰 그린다', () => {
    const { painter, calls } = fakePainter();

    paintBoard(painter, frame(), options({ scale: 0.5 }));

    expect(named(calls, 'fruit')).toEqual([['fruit', 1, 50, 250, 5.5, 0.5, 1], ['fruit', 5, 90, 22.5, 15, 0, 1]]);
    expect(named(calls, 'line')).toHaveLength(1);
    expect(calls[0]).toEqual(['clear', 180, 270]);
  });

  it('내 판은 조준선과 위험 표시를 그린다', () => {
    const { painter, calls } = fakePainter();

    paintBoard(painter, frame({ danger: true }), options({ mine: true }));

    expect(calls).toContainEqual(['line', 180, 45, 180, 540, 'rgba(255, 255, 255, 0.35)', 1, [4, 8]]);
    expect(calls).toContainEqual(['line', 0, 90, 360, 90, '#EF4444', 2, [6, 6]]);
    expect(calls).toContainEqual(['text', '위험', 338, 82, 12, '#EF4444']);
  });

  it('남의 판에는 위험해도 글자를 쓰지 않고, 들고 있지 않으면 조준선이 없다', () => {
    const other = fakePainter();
    paintBoard(other.painter, frame({ danger: true }), options());
    expect(named(other.calls, 'text')).toEqual([]);

    const empty = fakePainter();
    paintBoard(empty.painter, frame({ held: 0 }), options({ mine: true, autoDropLeftMs: 1000 }));
    expect(named(empty.calls, 'line')).toHaveLength(1);
    expect(named(empty.calls, 'fruit')).toHaveLength(1);
    expect(named(empty.calls, 'text')).toEqual([]);
  });

  it('남은 시간이 3초 이하면 든 과일 위에 초를 쓴다', () => {
    const texts = (autoDropLeftMs: number) => {
      const { painter, calls } = fakePainter();
      paintBoard(painter, frame(), options({ mine: true, autoDropLeftMs }));
      return named(calls, 'text');
    };

    expect(texts(2400)).toEqual([['text', '3', 180, 7, 16, '#FFFFFF']]);
    expect(texts(3001)).toEqual([]);
    expect(texts(0)).toEqual([['text', '1', 180, 7, 16, '#FFFFFF']]);
  });

  it('탈락한 판은 과일을 흐리게, 합치기 고리는 퍼지며 옅어진다', () => {
    const { painter, calls } = fakePainter();

    paintBoard(painter, frame(), options({ dimmed: true, effects: [{ x: 100, y: 200, radius: 20, progress: 0.5 }] }));

    expect(named(calls, 'fruit').map((call) => call[6])).toEqual([0.45, 0.45]);
    expect(calls).toContainEqual(['ring', 100, 200, 30, '#FFFFFF', 0.5]);
  });
});
