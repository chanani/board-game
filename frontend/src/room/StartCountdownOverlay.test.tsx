import { act, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Room } from '../api/types';
import { SILENT_SOUND, SoundContext } from '../lib/sound';
import { StartCountdownOverlay, countdownNumber } from './StartCountdownOverlay';

const SERVER_NOW = 1_000_000;

function roomOf(startsAt: number | null, serverNow = SERVER_NOW, status: Room['status'] = 'WAITING'): Room {
  return {
    code: 'ABC234', name: '방', gameType: 'UNO', gameTypeName: '우노', status, hostId: 1, maxPlayers: 4,
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

  describe('소리', () => {
    const play = vi.fn();
    const withSound = (room: Room, muted = false) => (
      <SoundContext.Provider value={{ ...SILENT_SOUND, play, muted }}><StartCountdownOverlay room={room} /></SoundContext.Provider>
    );
    const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
    const sounds = () => play.mock.calls.map(([name]) => name);

    beforeEach(() => {
      play.mockClear();
    });

    it('숫자마다 한 번씩 울리고, 게임이 시작되는 순간 시작음이 한 번 난다', () => {
      const { rerender } = render(withSound(roomOf(SERVER_NOW + 3000)));
      expect(sounds()).toEqual(['countdown']);

      tick(900);
      expect(sounds()).toEqual(['countdown']);
      tick(100);
      expect(sounds()).toEqual(['countdown', 'countdown']);
      tick(1000);
      expect(sounds()).toEqual(['countdown', 'countdown', 'countdown']);

      // 내 시계가 먼저 0이 되어도 서버가 시작을 알리기 전에는 시작음이 없다.
      tick(1200);
      expect(sounds()).toEqual(['countdown', 'countdown', 'countdown']);

      rerender(withSound(roomOf(null, SERVER_NOW + 3050, 'PLAYING')));
      expect(sounds()).toEqual(['countdown', 'countdown', 'countdown', 'gameStart']);

      rerender(withSound(roomOf(null, SERVER_NOW + 4000, 'PLAYING')));
      tick(2000);
      expect(sounds()).toEqual(['countdown', 'countdown', 'countdown', 'gameStart']);
    });

    it('다시 그려지거나 방 정보가 다시 와도(시계가 조금 흔들려도) 같은 숫자는 다시 울리지 않는다', () => {
      const { rerender } = render(withSound(roomOf(SERVER_NOW + 3000)));
      rerender(withSound(roomOf(SERVER_NOW + 3000)));
      tick(1100);
      expect(sounds()).toEqual(['countdown', 'countdown']);

      // 같은 startsAt인데 서버 시계가 살짝 앞선 방 정보: 남은 시간이 2.1초로 보여 3이 잠깐 다시 뜬다.
      rerender(withSound(roomOf(SERVER_NOW + 3000, SERVER_NOW + 900)));
      rerender(withSound(roomOf(SERVER_NOW + 3000, SERVER_NOW + 900)));
      expect(sounds()).toEqual(['countdown', 'countdown']);
    });

    it('StrictMode에서도 숫자마다 한 번이다', () => {
      render(<StrictMode>{withSound(roomOf(SERVER_NOW + 3000))}</StrictMode>);
      expect(sounds()).toEqual(['countdown']);

      tick(1000);
      expect(sounds()).toEqual(['countdown', 'countdown']);
    });

    it('도중에 들어오면 지나간 숫자는 울리지 않고 떠 있는 숫자부터 울린다', () => {
      render(withSound(roomOf(SERVER_NOW + 1500)));
      expect(numbersShown()).toEqual(['2']);
      expect(sounds()).toEqual(['countdown']);

      tick(500);
      expect(sounds()).toEqual(['countdown', 'countdown']);
      tick(1500);
      expect(sounds()).toEqual(['countdown', 'countdown']);
    });

    it('취소되면 더 울리지 않고 시작음도 없다. 다시 시작하면 처음부터 울린다', () => {
      const { rerender } = render(withSound(roomOf(SERVER_NOW + 3000)));
      tick(1000);
      expect(sounds()).toEqual(['countdown', 'countdown']);

      rerender(withSound(roomOf(null, SERVER_NOW + 1200)));
      tick(3000);
      expect(sounds()).toEqual(['countdown', 'countdown']);

      // 취소된 뒤 한참 있다 누군가 게임을 시작해도(카운트다운을 못 본 채 게임 중이 됨) 시작음은 없다.
      rerender(withSound(roomOf(null, SERVER_NOW + 5000, 'PLAYING')));
      expect(sounds()).toEqual(['countdown', 'countdown']);

      rerender(withSound(roomOf(null, SERVER_NOW + 6000)));
      rerender(withSound(roomOf(SERVER_NOW + 10_000, SERVER_NOW + 7000)));
      expect(sounds()).toEqual(['countdown', 'countdown', 'countdown']);
    });

    it('카운트다운 없이 게임 중인 방에 들어오면 아무 소리도 없다', () => {
      render(withSound(roomOf(null, SERVER_NOW, 'PLAYING')));
      tick(3000);

      expect(sounds()).toEqual([]);
    });
  });
});
