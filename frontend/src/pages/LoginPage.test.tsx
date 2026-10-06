import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/Toast';
import { LoginPage } from './LoginPage';

const mine = vi.hoisted(() => vi.fn());
const login = vi.hoisted(() => vi.fn());
vi.mock('../api/rooms', () => ({ roomsApi: { mine: () => mine() } }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ member: null, login }) }));

const NOTICE = '다른 곳에서 로그인해서 로그아웃됐어요.';

function renderLogin(state?: unknown) {
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={[{ pathname: '/login', state }]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>목록 화면</p>} />
          <Route path="/rooms/:code" element={<p>방 화면</p>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

async function submit() {
  await userEvent.type(screen.getByLabelText('아이디'), 'alice01');
  await userEvent.type(screen.getByLabelText('비밀번호'), 'password1');
  await userEvent.click(screen.getByRole('button', { name: '로그인' }));
}

beforeEach(() => {
  mine.mockReset();
  login.mockReset();
  login.mockResolvedValue(undefined);
});

describe('LoginPage', () => {
  it('경로 state로 받은 안내를 위에 보여준다', () => {
    renderLogin({ notice: NOTICE });

    expect(screen.getByRole('alert')).toHaveTextContent(NOTICE);
  });

  it('안내가 없으면 알림 띠도 없다', () => {
    renderLogin();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('로그인 직후 방에 있으면 그 방으로 간다', async () => {
    mine.mockResolvedValue({ code: 'ABC234' });
    renderLogin();

    await submit();

    expect(await screen.findByText('방 화면')).toBeInTheDocument();
  });

  it('로그인 직후 방에 없으면 목록으로 간다', async () => {
    mine.mockResolvedValue(null);
    renderLogin();

    await submit();

    expect(await screen.findByText('목록 화면')).toBeInTheDocument();
  });

  it('방 확인이 실패해도 목록으로 간다', async () => {
    mine.mockRejectedValue(new Error('down'));
    renderLogin();

    await submit();

    expect(await screen.findByText('목록 화면')).toBeInTheDocument();
  });
});
