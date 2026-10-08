import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Room } from '../api/types';
import { StartCountdownOverlay, countdownNumber } from './StartCountdownOverlay';

const SERVER_NOW = 1_000_000;

function roomOf(startsAt: number | null, serverNow = SERVER_NOW): Room {
  return {
    code: 'ABC234', name: '방', gameType: 'UNO', gameTypeName: '우노', status: 'WAITING', hostId: 1, maxPlayers: 4,
    locked: false, members: [], spectators: [], theme: 'WOOD', startsAt, serverNow,
  };
}

function numbersShown(): string[] {
  return screen.queryAllByTestId('start-countdown-number').map((element) => element.textContent ?? '');
}

describe('countdownNumber', () => {
  it('남은 시간을 올림한 초로 보인다', () => {
    expect(countdownNumber(3000)).toBe(3);
    expect(countdownNumber(2400)).toBe(3);
    expect(countdownNumber(2000)).toBe(2);
    expect(countdownNumber(200)).toBe(1);
  });

  it('끝났거나 모르면 띄우지 않는다', () => {
    expect(countdownNumber(0)).toBeNull();
    expect(countdownNumber(null)).toBeNull();
  });
});

describe('StartCountdownOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    vi.setSystemTime(new Date(5_000_000));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('카운트다운 중이 아니면 아무것도 띄우지 않는다', () => {
    render(<StartCountdownOverlay room={roomOf(null)} />);

    expect(screen.queryByTestId('start-countdown')).toBeNull();
  });

  it('서버 시계 기준으로 3, 2, 1을 차례로 보인다(내 시계와 서버 시계가 달라도)', async () => {
    render(<StartCountdownOverlay room={roomOf(SERVER_NOW + 3000)} />);

    expect(screen.getByTestId('start-countdown')).toBeInTheDocument();
    expect(screen.getByText('곧 게임이 시작돼요')).toBeInTheDocument();
    expect(numbersShown()).toEqual(['3']);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    await waitFor(() => expect(numbersShown()).toEqual(['2']));

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    await waitFor(() => expect(numbersShown()).toEqual(['1']));
  });

  it('카운트다운 도중에 들어오면 남은 숫자부터 보인다', () => {
    render(<StartCountdownOverlay room={roomOf(SERVER_NOW + 1500)} />);

    expect(numbersShown()).toEqual(['2']);
  });
});
