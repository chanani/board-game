import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TableLayout } from '../../lib/useTableLayout';
import { REMEASURE_MS, useBoardBox } from './useBoardBox';

function Probe({ layout = 'landscape' }: { layout?: TableLayout }) {
  const { ref, box } = useBoardBox(layout, 6);
  return <div ref={ref} data-testid="probe">{`${box.w}x${box.h}`}</div>;
}

const rectAt = (top: number) => ({ top, left: 0, width: 632, height: 100, right: 632, bottom: top + 100, x: 0, y: top, toJSON: () => ({}) });

function measureAt(top: number, scrollY: number, layout: TableLayout = 'landscape'): string {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(632);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rectAt(top));
  vi.stubGlobal('innerHeight', 390);
  vi.stubGlobal('scrollY', scrollY);
  render(<Probe layout={layout} />);
  return screen.getByTestId('probe').textContent ?? '';
}

describe('useBoardBox', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('높이는 화면 아래까지 남은 높이에서 아래 여백과 안쪽 여백을 뺀 값이다', () => {
    expect(measureAt(54, 0)).toBe('632x326'); // 390 - 54 - 4 - 6
  });

  it('세로 휴대폰도 아래 여백은 4px다(PC는 24px)', () => {
    expect(measureAt(54, 0, 'portrait')).toBe('632x326');
  });

  it('PC는 아래 여백이 24px다', () => {
    expect(measureAt(54, 0, 'pc')).toBe('632x306');
  });

  it('요소 크기는 그대로인데 위치만 바뀌어도(연결 끊김 알림이 떴다 사라짐) 0.5초 안에 다시 잰다', () => {
    vi.useFakeTimers();
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(632);
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rectAt(54));
    vi.stubGlobal('innerHeight', 390);
    vi.stubGlobal('scrollY', 0);
    const { unmount } = render(<Probe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('632x326');

    rect.mockReturnValue(rectAt(86));
    act(() => { vi.advanceTimersByTime(REMEASURE_MS); });
    expect(screen.getByTestId('probe')).toHaveTextContent('632x294');

    rect.mockReturnValue(rectAt(54));
    act(() => { vi.advanceTimersByTime(REMEASURE_MS); });
    expect(screen.getByTestId('probe')).toHaveTextContent('632x326');

    unmount();
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });

  it('페이지가 스크롤되어 있어도 맨 위에서 잰 것과 같다(스크롤만큼 판이 커지지 않는다)', () => {
    expect(measureAt(54 - 250, 250)).toBe('632x326');
  });
});
