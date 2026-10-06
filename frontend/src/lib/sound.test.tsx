import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readMuted, SoundProvider, useSound, writeMuted } from './sound';

const wrapper = ({ children }: { children: ReactNode }) => <SoundProvider>{children}</SoundProvider>;

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('sound', () => {
  it('음소거 설정을 저장하고 다시 읽는다', () => {
    writeMuted(true);
    expect(readMuted()).toBe(true);
    writeMuted(false);
    expect(readMuted()).toBe(false);
  });

  it('저장소가 예외를 던져도 기본값(소리 켬)으로 동작한다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });

    expect(readMuted()).toBe(false);
    expect(() => writeMuted(true)).not.toThrow();
  });

  it('토글하면 muted가 바뀌고 저장된다', () => {
    const { result } = renderHook(() => useSound(), { wrapper });
    expect(result.current.muted).toBe(false);

    act(() => result.current.toggleMuted());

    expect(result.current.muted).toBe(true);
    expect(readMuted()).toBe(true);
  });

  it('AudioContext가 없어도 play는 아무 일 없이 끝난다', async () => {
    function Player() {
      const { play } = useSound();
      return <button type="button" onClick={() => play('draw')}>재생</button>;
    }
    render(<SoundProvider><Player /></SoundProvider>);

    await userEvent.click(screen.getByRole('button', { name: '재생' }));

    expect(screen.getByRole('button', { name: '재생' })).toBeInTheDocument();
  });

  it('Provider 밖에서도 useSound를 쓸 수 있다', () => {
    const { result } = renderHook(() => useSound());

    expect(() => result.current.play('click')).not.toThrow();
    expect(result.current.muted).toBe(false);
  });

  it('멈춘 AudioContext는 다음 입력 때 다시 깨운다', async () => {
    const resume = vi.fn(() => Promise.reject(new Error('blocked')));
    class FakeCtx { state = 'suspended'; resume = resume; }
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeCtx;
    render(<SoundProvider><span>x</span></SoundProvider>);

    await userEvent.keyboard('a');
    await userEvent.keyboard('b');

    expect(resume).toHaveBeenCalledTimes(2);
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  });
});
