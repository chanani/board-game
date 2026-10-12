import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeProvider } from './RealtimeContext';

const fake = vi.hoisted(() => ({ recover: vi.fn(), reconnect: vi.fn() }));

vi.mock('./Realtime', () => ({
  Realtime: class {
    recover = fake.recover;
    reconnect = fake.reconnect;
    start() {}
    stop() {}
    onConnectionChange() { return () => undefined; }
    onSessionReplaced() { return () => undefined; }
  },
}));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ sessionReplaced: () => undefined }) }));

const setVisibility = (state: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
};

describe('RealtimeProvider 연결 되살리기', () => {
  beforeEach(() => {
    fake.recover.mockClear();
    fake.reconnect.mockClear();
  });
  afterEach(() => setVisibility('visible'));

  it('화면이 다시 보이면 멈춘 연결인지 확인하고, 가려질 때는 건드리지 않는다', () => {
    render(<RealtimeProvider><p>화면</p></RealtimeProvider>);

    setVisibility('hidden');
    expect(fake.recover).not.toHaveBeenCalled();

    setVisibility('visible');
    expect(fake.recover).toHaveBeenCalledTimes(1);
  });

  it('네트워크가 돌아오면 멈춘 연결인지 확인한다', () => {
    render(<RealtimeProvider><p>화면</p></RealtimeProvider>);

    act(() => { window.dispatchEvent(new Event('online')); });

    expect(fake.recover).toHaveBeenCalledTimes(1);
    expect(fake.reconnect).not.toHaveBeenCalled();
  });

  it('네트워크가 끊기면 하트비트를 기다리지 않고 바로 연결을 버려 끊김 안내가 뜨게 한다', () => {
    render(<RealtimeProvider><p>화면</p></RealtimeProvider>);

    act(() => { window.dispatchEvent(new Event('offline')); });

    expect(fake.reconnect).toHaveBeenCalledTimes(1);
  });

  it('화면에서 내려가면 더 듣지 않는다', () => {
    const { unmount } = render(<RealtimeProvider><p>화면</p></RealtimeProvider>);
    unmount();

    act(() => { window.dispatchEvent(new Event('online')); });
    act(() => { window.dispatchEvent(new Event('offline')); });

    expect(fake.recover).not.toHaveBeenCalled();
    expect(fake.reconnect).not.toHaveBeenCalled();
  });
});
