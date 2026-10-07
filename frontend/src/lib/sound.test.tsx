import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clampVolume, readDrawSound, readMuted, readVolume, SoundProvider, useSound, writeDrawSound, writeMuted, writeVolume } from './sound';

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

  it('카드 가져오는 소리는 기본이 슥(swish)이고, 저장한 값을 읽으며 모르는 값이면 기본으로 돌아간다', () => {
    expect(readDrawSound()).toBe('swish');
    writeDrawSound('tock');
    expect(readDrawSound()).toBe('tock');
    window.localStorage.setItem('bg.drawSound', 'gostop');
    expect(readDrawSound()).toBe('swish');
  });

  it('저장소가 막혀도 카드 가져오는 소리는 기본값으로 동작한다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readDrawSound()).toBe('swish');
    expect(() => writeDrawSound('pop')).not.toThrow();
  });

  it('setDrawSound는 고른 소리를 저장하고 drawSound에 반영한다', () => {
    const { result } = renderHook(() => useSound(), { wrapper });
    expect(result.current.drawSound).toBe('swish');

    act(() => result.current.setDrawSound('chime'));

    expect(result.current.drawSound).toBe('chime');
    expect(readDrawSound()).toBe('chime');
  });
});

describe('카드 움직임 소리', () => {
  const hz: number[] = [];
  let noises = 0;
  class FakeNode { connect = vi.fn((next: unknown) => next); }
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  class FakeCtx {
    state = 'running'; currentTime = 0; sampleRate = 100; destination = new FakeNode();
    resume = vi.fn(() => Promise.resolve());
    createGain() { return Object.assign(new FakeNode(), { gain: param() }); }
    createOscillator() {
      return Object.assign(new FakeNode(), { type: 'sine', frequency: { ...param(), setValueAtTime: (value: number) => { hz.push(value); } }, start: vi.fn(), stop: vi.fn() });
    }
    createBuffer(_channels: number, length: number) { return { getChannelData: () => new Float32Array(length) }; }
    createBufferSource() { noises += 1; return Object.assign(new FakeNode(), { buffer: null, start: vi.fn() }); }
    createBiquadFilter() { return Object.assign(new FakeNode(), { type: 'bandpass', frequency: param() }); }
  }

  async function playAll(names: Parameters<ReturnType<typeof useSound>['play']>[0][]) {
    hz.length = 0;
    noises = 0;
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeCtx;
    function Probe() {
      const { play } = useSound();
      return <button type="button" onClick={() => names.forEach((name) => play(name))}>재생</button>;
    }
    render(<SoundProvider><Probe /></SoundProvider>);
    await userEvent.click(screen.getByRole('button', { name: '재생' }));
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  }

  it('카드를 내려놓는 소리(place)도 고른 소리(뽁)로 난다 — 예전 낮은 뚱 소리(180Hz)는 없다', async () => {
    writeDrawSound('pop');

    await playAll(['place', 'draw']);

    expect(hz).toEqual([380, 380]);
    expect(hz).not.toContain(180);
  });

  it('기본(슥)이면 place도 슥(잡음 한 번)으로 난다', async () => {
    await playAll(['place']);

    expect(noises).toBe(1);
    expect(hz).toEqual([]);
  });

  it('효과음을 끄면 place도 나지 않는다', async () => {
    writeMuted(true);

    await playAll(['place']);

    expect(noises + hz.length).toBe(0);
  });

  it('차례 알림·시간 경고·뒤집기 같은 카드 움직임이 아닌 소리는 고른 소리와 상관없이 그대로다', async () => {
    writeDrawSound('pop');

    await playAll(['myTurn', 'tick']);

    expect(hz).toEqual([784, 1047, 660, 660]);
  });
});
