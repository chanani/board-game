import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clampVolume, readMuted, readVolume, SoundProvider, useSound, writeMuted, writeVolume } from './sound';

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

  it('음량은 기본 70이고, 저장한 값을 0~100 정수로 읽는다', () => {
    expect(readVolume()).toBe(70);
    writeVolume(35);
    expect(readVolume()).toBe(35);
    window.localStorage.setItem('bg.volume', 'abc');
    expect(readVolume()).toBe(70);
    window.localStorage.setItem('bg.volume', '150');
    expect(readVolume()).toBe(100);
    window.localStorage.setItem('bg.volume', '-3');
    expect(readVolume()).toBe(0);
    expect(clampVolume(42.6)).toBe(43);
  });

  it('저장소가 막혀도 음량 기본값 70으로 동작한다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readVolume()).toBe(70);
    expect(() => writeVolume(10)).not.toThrow();
  });

  it('setVolume은 범위를 잘라 저장하고, 재생할 때 출력 음량을 volume/100으로 둔다', async () => {
    const outputs: { gain: { value: number } }[] = [];
    class FakeNode { connect = vi.fn(() => this); }
    class FakeCtx {
      state = 'running'; currentTime = 0; sampleRate = 8000; destination = new FakeNode();
      resume = vi.fn(() => Promise.resolve());
      createGain() {
        const node = Object.assign(new FakeNode(), { gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } });
        outputs.push(node);
        return node;
      }
      createOscillator() { return Object.assign(new FakeNode(), { type: 'sine', frequency: { setValueAtTime: vi.fn() }, start: vi.fn(), stop: vi.fn() }); }
      createBuffer() { return { getChannelData: () => new Float32Array(10) }; }
      createBufferSource() { return Object.assign(new FakeNode(), { buffer: null, start: vi.fn() }); }
      createBiquadFilter() { return Object.assign(new FakeNode(), { type: 'bandpass', frequency: { value: 0 } }); }
    }
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeCtx;
    let api = null as ReturnType<typeof useSound> | null;
    function Probe() {
      api = useSound();
      return <button type="button" onClick={() => api?.play('click')}>재생</button>;
    }
    render(<SoundProvider><Probe /></SoundProvider>);

    act(() => api?.setVolume(140));
    expect(api?.volume).toBe(100);
    act(() => api?.setVolume(25));
    expect(readVolume()).toBe(25);
    await userEvent.click(screen.getByRole('button', { name: '재생' }));

    // 재생마다 만든 첫 GainNode가 출력 노드다(그 뒤 tone이 만드는 노드는 소리별 envelope).
    expect(outputs[0].gain.value).toBe(0.25);
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  });
});
