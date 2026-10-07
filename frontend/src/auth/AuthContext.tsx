import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../api/auth';
import { setUnauthorizedHandler, type UnauthorizedReason } from '../api/http';
import type { Member } from '../api/types';

type AuthState = {
  member: Member | null;
  loading: boolean;
  login: (loginId: string, password: string) => Promise<void>;
  signup: (loginId: string, nickname: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** 프로필 그림을 바로 저장하고, 저장된 내 정보로 화면(헤더·방)을 바꾼다. */
  changeAvatar: (avatar: string) => Promise<void>;
  /** 로그인 화면으로 보낼 때 함께 보여 줄 안내. 다른 곳에서 로그인해서 끊겼을 때만 있다. */
  notice: string | null;
  /** 웹소켓이 4001(다른 곳에서 로그인)로 닫혔을 때 부른다. */
  sessionReplaced: () => void;
};

export const SESSION_REPLACED_NOTICE = '다른 곳에서 로그인해서 로그아웃됐어요.';

export class SignupLoginError extends Error {
  constructor() {
    super('가입은 완료됐지만 자동 로그인에 실패했어요.');
  }
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const expire = useCallback((reason?: UnauthorizedReason) => {
    setNotice(reason === 'SESSION_REPLACED' ? SESSION_REPLACED_NOTICE : null);
    setMember(null);
  }, []);
  const sessionReplaced = useCallback(() => expire('SESSION_REPLACED'), [expire]);

  useEffect(() => {
    setUnauthorizedHandler(expire);
    return () => setUnauthorizedHandler(null);
  }, [expire]);

  useEffect(() => {
    authApi
      .me()
      .then(setMember)
      .catch(() => setMember(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (loginId: string, password: string) => {
    const next = await authApi.login(loginId, password);
    setNotice(null);
    setMember(next);
  }, []);

  const signup = useCallback(async (loginId: string, nickname: string, password: string) => {
    await authApi.signup(loginId, nickname, password);
    try {
      const next = await authApi.login(loginId, password);
      setNotice(null);
      setMember(next);
    } catch {
      throw new SignupLoginError();
    }
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setNotice(null);
    setMember(null);
  }, []);

  const changeAvatar = useCallback(async (avatar: string) => {
    const next = await authApi.changeAvatar(avatar);
    setMember(next);
  }, []);

  const value = useMemo(
    () => ({ member, loading, login, signup, logout, changeAvatar, notice, sessionReplaced }),
    [member, loading, login, signup, logout, changeAvatar, notice, sessionReplaced],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('AuthProvider 안에서만 쓸 수 있어요.');
  }
  return context;
}
