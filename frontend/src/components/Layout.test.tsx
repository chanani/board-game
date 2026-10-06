import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Layout } from './Layout';

const state = vi.hoisted(() => ({ connected: false }));
vi.mock('../realtime/RealtimeContext', () => ({ useRealtime: () => ({ realtime: {}, connected: state.connected }) }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ member: { id: 1, nickname: '앨리스' }, logout: vi.fn() }) }));
vi.mock('../api/rooms', () => ({ roomsApi: { mine: () => Promise.resolve(null) } }));
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

describe('Layout 상단바', () => {
  it('좁은 화면에서도 줄바꿈 없이 홈 링크 이름과 닉네임을 유지한다', () => {
    render(ui());

    const home = screen.getByRole('link', { name: '보드게임 라운지' });
    expect(home).toHaveClass('whitespace-nowrap');
    expect(screen.getByText('앨리스')).toHaveClass('truncate');
    expect(screen.getByRole('button', { name: '로그아웃' })).toHaveClass('whitespace-nowrap');
  });

  it('메뉴 이름은 게임 목록이고 음소거 버튼은 이모지 대신 아이콘이다', () => {
    render(ui());

    expect(screen.getByRole('link', { name: '게임 목록' })).toBeInTheDocument();
    const mute = screen.getByRole('button', { name: '소리 끄기' });
    expect(mute.querySelector('svg')).not.toBeNull();
    expect(mute).not.toHaveTextContent('🔊');
  });
});

describe('Layout 모바일 상단바', () => {
  it('좁은 화면에서는 로고 그림, 아이콘 메뉴와 짧은 글자, 아이콘 로그아웃만 남겨 넘치지 않는다', () => {
    render(ui());

    const home = screen.getByRole('link', { name: '보드게임 라운지' });
    expect(home.querySelector('span.hidden.sm\\:inline')).toHaveTextContent('보드게임 라운지');
    for (const [name, short] of [['게임 목록', '목록'], ['내 전적', '전적']]) {
      const link = screen.getByRole('link', { name });
      expect(link.querySelector('svg')).not.toBeNull();
      expect(link.querySelector('.sm\\:hidden')).toHaveTextContent(short);
      expect(link.querySelector('.hidden.sm\\:inline')).toHaveTextContent(name);
    }
    const logout = screen.getByRole('button', { name: '로그아웃' });
    expect(logout.querySelector('svg')).not.toBeNull();
    expect(logout.querySelector('.hidden.sm\\:inline')).toHaveTextContent('로그아웃');
    expect(screen.getByText('앨리스')).toHaveClass('truncate', 'min-w-0');
    expect(screen.getByRole('banner').firstElementChild).toHaveClass('min-w-0');
  });
});

describe('Layout 테마 범위', () => {
  it('방 밖 화면에는 방 테마가 없다(원목 배경 그대로)', () => {
    const { container } = render(ui());

    expect(container.querySelector('[data-theme]')).toBeNull();
    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(document.body).not.toHaveAttribute('data-theme');
  });
});
