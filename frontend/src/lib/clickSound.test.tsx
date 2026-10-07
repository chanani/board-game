import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClickSound } from './clickSound';
import { SoundProvider, writeDrawSound, writeMuted } from './sound';

/** 실제 SoundProvider가 소리를 낼 때 만드는 노드를 기록하는 가짜 AudioContext. */
const made = { oscillators: [] as number[], noises: 0 };
const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
const node = <T extends object>(extra: T) => ({ connect: (next: unknown) => next, ...extra });
class FakeCtx {
  state = 'running';
  currentTime = 0;
  sampleRate = 100;
  destination = {};
  createGain() { return node({ gain: param() }); }
  createBiquadFilter() { return node({ type: '', frequency: param() }); }
  createBuffer(_channels: number, length: number) { return { getChannelData: () => new Float32Array(length) }; }
  createBufferSource() { made.noises += 1; return node({ buffer: null, start: vi.fn() }); }
  createOscillator() {
    const frequency = { ...param(), setValueAtTime: (hz: number) => { made.oscillators.push(hz); } };
    return node({ type: '', frequency, start: vi.fn(), stop: vi.fn() });
  }
  resume() { return Promise.resolve(); }
}
const holder = window as unknown as { AudioContext?: unknown };
const sounds = () => made.oscillators.length + made.noises;

function renderSite(ui: ReactNode) {
  return render(<SoundProvider><ClickSound />{ui}</SoundProvider>);
}

beforeEach(() => {
  made.oscillators = [];
  made.noises = 0;
  holder.AudioContext = FakeCtx;
  vi.spyOn(performance, 'now').mockReturnValue(1000);
});

afterEach(() => {
  delete holder.AudioContext;
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('ClickSound', () => {
  it('버튼을 누르면 고른 소리가 난다(기본 슥)', async () => {
    renderSite(<button type="button">방 만들기</button>);

    await userEvent.click(screen.getByRole('button', { name: '방 만들기' }));

    expect(made.noises).toBe(1);
    expect(made.oscillators).toEqual([]);
  });

  it('닉네임 메뉴에서 고른 소리(뽁)를 쓴다', async () => {
    writeDrawSound('pop');
    renderSite(<a href="#top">기록</a>);

    await userEvent.click(screen.getByRole('link', { name: '기록' }));

    expect(made.noises).toBe(0);
    expect(made.oscillators).toEqual([380]);
  });

  it('비활성 버튼과 aria-disabled 컨트롤은 소리가 나지 않는다', async () => {
    renderSite(<><button type="button" disabled>시작</button><button type="button" aria-disabled="true">카드</button></>);

    await userEvent.click(screen.getByRole('button', { name: '시작' }));
    await userEvent.click(screen.getByRole('button', { name: '카드' }));

    expect(sounds()).toBe(0);
  });

  it('효과음을 끄면 소리가 나지 않는다', async () => {
    writeMuted(true);
    renderSite(<button type="button">나가기</button>);

    await userEvent.click(screen.getByRole('button', { name: '나가기' }));

    expect(sounds()).toBe(0);
  });

  it('data-no-click-sound가 붙은 컨트롤(과 그 안)은 소리가 나지 않는다', async () => {
    renderSite(<button type="button" data-no-click-sound><span>카드 뽑기</span></button>);

    await userEvent.click(screen.getByText('카드 뽑기'));

    expect(sounds()).toBe(0);
  });

  it('글자 입력칸을 누르거나 입력해도 소리가 나지 않는다', async () => {
    renderSite(<input aria-label="채팅" />);

    await userEvent.click(screen.getByRole('textbox', { name: '채팅' }));
    await userEvent.keyboard('안녕');

    expect(sounds()).toBe(0);
  });

  it('키보드(Enter)로 눌러도 소리가 나고, 60ms 안에 다시 누르면 한 번만 난다', async () => {
    renderSite(<button type="button">준비</button>);
    const button = screen.getByRole('button', { name: '준비' });
    act(() => button.focus());

    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{Enter}');
    expect(made.noises).toBe(1);

    vi.mocked(performance.now).mockReturnValue(1100);
    await userEvent.keyboard('{Enter}');
    expect(made.noises).toBe(2);
  });
});
