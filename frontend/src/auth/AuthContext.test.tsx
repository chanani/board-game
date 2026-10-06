import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '../api/auth';
import { request } from '../api/http';
import { AuthProvider, SignupLoginError, useAuth } from './AuthContext';
import { RequireAuth } from './RequireAuth';

function Consumer() {
  const { member, loading, signup } = useAuth();
  const [outcome, setOutcome] = useState('');
  const handleClick = async () => {
    try {
      await signup('alice01', '앨리스', 'password1');
      setOutcome('ok');
    } catch (error) {
      setOutcome(error instanceof SignupLoginError ? 'signup-login-error' : 'other-error');
    }
  };
  if (loading) {
    return <p>loading</p>;
  }
  return (
    <div>
      <button onClick={handleClick}>go</button>
      <p data-testid="outcome">{outcome}</p>
      <p data-testid="member">{member?.nickname ?? 'none'}</p>
    </div>
  );
}

const alice = { id: 1, loginId: 'alice01', nickname: '앨리스' };

describe('AuthProvider.signup', () => {
  afterEach(() => vi.restoreAllMocks());

  it('가입 후 로그인이 실패하면 SignupLoginError를 던진다', async () => {
    vi.spyOn(authApi, 'me').mockResolvedValue(null);
    vi.spyOn(authApi, 'signup').mockResolvedValue(alice);
    vi.spyOn(authApi, 'login').mockRejectedValue(new TypeError('network'));
    render(<AuthProvider><Consumer /></AuthProvider>);

    await userEvent.click(await screen.findByText('go'));

    await waitFor(() => expect(screen.getByTestId('outcome')).toHaveTextContent('signup-login-error'));
    expect(screen.getByTestId('member')).toHaveTextContent('none');
  });

  it('가입과 로그인이 모두 성공하면 회원이 설정된다', async () => {
    vi.spyOn(authApi, 'me').mockResolvedValue(null);
    vi.spyOn(authApi, 'signup').mockResolvedValue(alice);
    vi.spyOn(authApi, 'login').mockResolvedValue(alice);
    render(<AuthProvider><Consumer /></AuthProvider>);

    await userEvent.click(await screen.findByText('go'));

    await waitFor(() => expect(screen.getByTestId('outcome')).toHaveTextContent('ok'));
    expect(screen.getByTestId('member')).toHaveTextContent('앨리스');
  });
});

describe('AuthProvider 세션 만료', () => {
  afterEach(() => vi.restoreAllMocks());

  it('401 응답을 받으면 회원 정보를 비운다', async () => {
    vi.spyOn(authApi, 'me').mockResolvedValue(alice);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ status: 401, code: 'UNAUTHORIZED', message: 'x' }), { status: 401 }));
    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('member')).toHaveTextContent('앨리스'));

    await request('/api/rooms').catch(() => undefined);

    await waitFor(() => expect(screen.getByTestId('member')).toHaveTextContent('none'));
  });
});

vi.mock('../realtime/RealtimeContext', () => ({
  RealtimeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function LoginProbe() {
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  return <p>로그인 화면 {notice ?? '안내 없음'}</p>;
}

describe('다른 곳에서 로그인해서 끊김', () => {
  afterEach(() => vi.restoreAllMocks());

  function renderProtected() {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginProbe />} />
            <Route element={<RequireAuth />}>
              <Route path="/" element={<p>목록 화면</p>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
  }

  it('SESSION_REPLACED 401이면 로그인 화면으로 가며 안내를 넘긴다', async () => {
    vi.spyOn(authApi, 'me').mockResolvedValue(alice);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ status: 401, code: 'SESSION_REPLACED', message: 'x' }), { status: 401 }));
    renderProtected();
    expect(await screen.findByText('목록 화면')).toBeInTheDocument();

    await request('/api/rooms/me').catch(() => undefined);

    expect(await screen.findByText('로그인 화면 다른 곳에서 로그인해서 로그아웃됐어요.')).toBeInTheDocument();
  });

  it('보통의 401이면 안내 없이 로그인 화면으로 간다', async () => {
    vi.spyOn(authApi, 'me').mockResolvedValue(alice);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ status: 401, code: 'UNAUTHORIZED', message: 'x' }), { status: 401 }));
    renderProtected();
    expect(await screen.findByText('목록 화면')).toBeInTheDocument();

    await request('/api/rooms/me').catch(() => undefined);

    expect(await screen.findByText('로그인 화면 안내 없음')).toBeInTheDocument();
  });

  it('웹소켓이 4001로 닫혔다고 알리면 같은 안내로 로그인 화면에 간다', async () => {
    vi.spyOn(authApi, 'me').mockResolvedValue(alice);
    let replaced: (() => void) | null = null;
    function Trigger() {
      const { sessionReplaced } = useAuth();
      replaced = sessionReplaced;
      return null;
    }
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Trigger />
          <Routes>
            <Route path="/login" element={<LoginProbe />} />
            <Route element={<RequireAuth />}>
              <Route path="/" element={<p>목록 화면</p>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText('목록 화면')).toBeInTheDocument();

    act(() => replaced?.());

    expect(await screen.findByText('로그인 화면 다른 곳에서 로그인해서 로그아웃됐어요.')).toBeInTheDocument();
  });
});
