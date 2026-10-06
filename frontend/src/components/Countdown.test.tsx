import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Countdown } from './Countdown';

const START = 1_700_000_000_000;

describe('Countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
  });
  afterEach(() => vi.useRealTimers());

  it('5초보다 많이 남으면 숨기고, 5초부터 숫자와 링을 보이며 0에서 멈춘다', () => {
    // 서버 시계가 클라이언트보다 1분 앞서도 deadline - serverNow로 남은 시간을 잰다.
    const serverNow = START + 60_000;
    render(<Countdown deadline={serverNow + 8000} serverNow={serverNow} />);
    expect(screen.queryByTestId('countdown')).not.toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(3000); });
    const shown = screen.getByTestId('countdown');
    expect(shown).toHaveTextContent('5');
    expect(shown.querySelector('svg circle')).not.toBeNull();

    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByTestId('countdown')).toHaveTextContent('4');

    act(() => { vi.advanceTimersByTime(10_000); });
    expect(screen.getByTestId('countdown')).toHaveTextContent('0');
  });

  it('마감이 없으면 아무것도 보이지 않는다', () => {
    render(<Countdown deadline={null} serverNow={START} />);
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(screen.queryByTestId('countdown')).not.toBeInTheDocument();
  });

  it('5초가 되면 경고를 한 번만 알린다', () => {
    const onWarn = vi.fn();
    render(<Countdown deadline={START + 7000} serverNow={START} onWarn={onWarn} />);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(onWarn).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1500); });
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onWarn).toHaveBeenCalledTimes(1);
  });

  it('처음부터 5초 이하로 남았으면 바로 보인다', () => {
    render(<Countdown deadline={START + 3000} serverNow={START} />);
    expect(screen.getByTestId('countdown')).toHaveTextContent('3');
  });

  it('새 마감(deadline/serverNow)이 오면 받은 시점부터 다시 잰다', () => {
    const { rerender } = render(<Countdown deadline={START + 5000} serverNow={START} />);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByTestId('countdown')).toHaveTextContent('2');

    // 서버가 새 마감을 보냈다(서버 시계는 클라이언트보다 10초 뒤). 15초 남았으니 숨긴다.
    const serverNow = START + 3000 - 10_000;
    rerender(<Countdown deadline={serverNow + 15_000} serverNow={serverNow} />);
    expect(screen.queryByTestId('countdown')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(screen.getByTestId('countdown')).toHaveTextContent('5');
  });

  it('색은 테마 변수를 쓴다', () => {
    render(<Countdown deadline={START + 3000} serverNow={START} />);
    const shown = screen.getByTestId('countdown');
    expect(shown).toHaveClass('bg-(--timer-bg)', 'text-(--timer-ink)');
    expect(shown.className).not.toMatch(/#[0-9a-f]{3,6}/i);
    expect(shown.querySelector('circle[stroke="var(--timer-ring)"]')).not.toBeNull();
  });
});
