import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useBoardBox } from './useBoardBox';

function Probe() {
  const { ref, box } = useBoardBox('landscape', 6);
  return <div ref={ref} data-testid="probe">{`${box.w}x${box.h}`}</div>;
}

function measureAt(top: number, scrollY: number): string {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(632);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top, left: 0, width: 632, height: 100, right: 632, bottom: top + 100, x: 0, y: top, toJSON: () => ({}) });
  vi.stubGlobal('innerHeight', 390);
  vi.stubGlobal('scrollY', scrollY);
  render(<Probe />);
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

  it('페이지가 스크롤되어 있어도 맨 위에서 잰 것과 같다(스크롤만큼 판이 커지지 않는다)', () => {
    expect(measureAt(54 - 250, 250)).toBe('632x326');
  });
});
