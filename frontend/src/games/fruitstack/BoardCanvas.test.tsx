import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoardCanvas } from './BoardCanvas';

const METHODS = ['clearRect', 'fillRect', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'fill', 'arc', 'ellipse', 'setLineDash', 'save', 'restore', 'translate', 'rotate', 'scale', 'fillText', 'drawImage', 'setTransform'] as const;

function fakeContext() {
  const context = Object.fromEntries(METHODS.map((name) => [name, vi.fn()])) as Record<(typeof METHODS)[number], ReturnType<typeof vi.fn>>;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  return context;
}

// 가짜 rAF의 한 프레임은 16ms다.
const frames = (count: number) => vi.advanceTimersByTime(16 * count);

describe('BoardCanvas', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('폭에 맞춘 2:3 캔버스와 이름을 그린다', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const { unmount } = render(<BoardCanvas width={200} getFrame={() => null} label="내 판" role="application" />);

    const canvas = screen.getByRole('application', { name: '내 판' });
    expect(canvas.tagName).toBe('CANVAS');
    expect(canvas).toHaveStyle({ width: '200px', height: '300px' });
    unmount();

    render(<BoardCanvas width={90} getFrame={() => null} label="P2님의 판" />);
    expect(screen.getByRole('img', { name: 'P2님의 판' })).toHaveStyle({ width: '90px', height: '135px' });
  });

  it('캔버스를 쓸 수 없으면(jsdom) 오류 없이 넘어간다', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const getFrame = vi.fn(() => null);

    expect(() => render(<BoardCanvas width={200} getFrame={getFrame} label="내 판" />)).not.toThrow();
    expect(getFrame).not.toHaveBeenCalled();
  });

  it('getContext가 예외를 던져도 넘어간다', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => { throw new Error('없음'); });

    expect(() => render(<BoardCanvas width={200} getFrame={() => null} label="내 판" />)).not.toThrow();
  });

  it('그릴 수 있으면 프레임마다 판을 읽어 그린다', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
    const context = fakeContext();
    const getFrame = vi.fn(() => ({ held: 5, aimX: 180, danger: false, fruits: [{ level: 1, x: 100, y: 500, angle: 0 }] }));
    const { unmount } = render(<BoardCanvas width={180} getFrame={getFrame} mine label="내 판" />);

    frames(2);

    expect(getFrame.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 180, 270);
    expect(context.setTransform).toHaveBeenCalled();
    // 과일 하나와 든 과일 하나: 스프라이트를 붙이거나(drawImage) 못 만들면 몸 색 원을 그린다.
    expect(context.drawImage.mock.calls.length + context.arc.mock.calls.length).toBeGreaterThanOrEqual(2);

    unmount();
    const before = getFrame.mock.calls.length;
    frames(4);
    expect(getFrame.mock.calls.length).toBe(before);
  });

  it('everyOtherFrame이면 두 프레임에 한 번만 그린다', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
    fakeContext();
    const getFrame = vi.fn(() => null);
    render(<BoardCanvas width={90} getFrame={getFrame} everyOtherFrame label="P2님의 판" />);

    frames(4);

    expect(getFrame).toHaveBeenCalledTimes(2);
  });

  it('getFrame이 바뀌어도 고리를 다시 만들지 않고 최신 것을 부른다', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
    const context = fakeContext();
    const first = vi.fn(() => null);
    const second = vi.fn(() => null);
    const { rerender } = render(<BoardCanvas width={90} getFrame={first} label="판" />);
    frames(1);
    const transforms = context.setTransform.mock.calls.length;

    rerender(<BoardCanvas width={90} getFrame={second} label="판" />);
    frames(2);

    expect(second).toHaveBeenCalled();
    expect(context.setTransform.mock.calls.length).toBe(transforms);
  });
});
