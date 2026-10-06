import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Outlet } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

const { passThrough } = vi.hoisted(() => ({ passThrough: ({ children }: { children: ReactNode }) => children }));
vi.mock('./auth/AuthContext', () => ({ AuthProvider: passThrough }));
vi.mock('./components/Toast', () => ({ ToastProvider: passThrough }));
vi.mock('./lib/sound', () => ({ SoundProvider: passThrough }));
vi.mock('./auth/RequireAuth', () => ({ RequireAuth: () => <Outlet /> }));
vi.mock('./components/Layout', () => ({ Layout: () => <Outlet /> }));
vi.mock('./pages/GameShelfPage', () => ({ GameShelfPage: () => <p>게임 목록 화면</p> }));
vi.mock('./pages/GameLobbyPage', () => ({ GameLobbyPage: () => null }));
vi.mock('./pages/LoginPage', () => ({ LoginPage: () => null }));
vi.mock('./pages/RecordsPage', () => ({ RecordsPage: () => null }));
vi.mock('./pages/RoomPage', () => ({ RoomPage: () => null }));
vi.mock('./pages/SignupPage', () => ({ SignupPage: () => null }));

describe('App 라우트', () => {
  it('없어진 설정 페이지(/settings)로 오면 게임 목록(/)으로 보낸다', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText('게임 목록 화면')).toBeInTheDocument();
  });
});
