import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Layout } from './Layout';

const state = vi.hoisted(() => ({ connected: false }));
vi.mock('../realtime/RealtimeContext', () => ({ useRealtime: () => ({ realtime: {}, connected: state.connected }) }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ member: { id: 1, nickname: '앨리스' }, logout: vi.fn() }) }));
vi.mock('./Toast', () => ({ useToast: () => ({ show: vi.fn() }) }));

const BANNER = '서버와 연결이 끊겼어요. 다시 연결하는 중…';
const ui = () => <MemoryRouter><Layout /></MemoryRouter>;

describe('Layout 연결 안내', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    state.connected = false;
  });
  afterEach(() => vi.useRealTimers());

  it('처음 3초 동안은 연결 전이어도 배너를 숨긴다', () => {
    render(ui());
    expect(screen.queryByText(BANNER)).not.toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(3000); });

    expect(screen.getByText(BANNER)).toBeInTheDocument();
  });

  it('연결된 적이 있으면 끊기는 즉시 배너를 보인다', () => {
    state.connected = true;
    const { rerender } = render(ui());
    expect(screen.queryByText(BANNER)).not.toBeInTheDocument();

    state.connected = false;
    rerender(ui());

    expect(screen.getByText(BANNER)).toBeInTheDocument();
  });
});
