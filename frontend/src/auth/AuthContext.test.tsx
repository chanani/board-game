import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '../api/auth';
import { AuthProvider, SignupLoginError, useAuth } from './AuthContext';

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
