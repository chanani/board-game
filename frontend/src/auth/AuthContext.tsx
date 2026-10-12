import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  /** 로그인 화면으로 보낼 때 함께 보여 줄 안내. 다른 곳에서 로그인해서 끊겼거나, 로그인해 있다가 세션이 사라졌을 때 있다. */
  notice: string | null;
  /** 웹소켓이 4001(다른 곳에서 로그인)로 닫혔을 때 부른다. */
  sessionReplaced: () => void;
};

export const SESSION_REPLACED_NOTICE = '다른 곳에서 로그인해서 로그아웃됐어요.';
/**
 * 로그인해 있던 사람이 401을 받았을 때의 안내. 로그인은 서버 메모리에 있어 서버가 새로 시작되면(배포) 모두 풀리고 방도 사라진다.
 * 말없이 로그인 화면으로 보내면 고장처럼 보이므로 까닭을 알린다.
 */
export const SESSION_LOST_NOTICE = '로그인이 풀려서 다시 로그인이 필요해요. 서버가 새로 시작됐다면 진행 중이던 게임은 이어지지 않아요.';

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

  // 스스로 로그아웃한 뒤 늦게 도착한 401에는 안내를 띄우지 않으려고, 지금 로그인해 있는지 기억한다.
  const loggedIn = useRef(false);
  loggedIn.current = member !== null;

  const expire = useCallback((reason?: UnauthorizedReason) => {
    setMember(null);
    if (reason === 'SESSION_REPLACED') {
      setNotice(SESSION_REPLACED_NOTICE);
      return;
    }
    if (loggedIn.current) {
      // 다른 곳에서 로그인해서 끊긴 안내가 이미 있으면 그대로 둔다.
      setNotice((current) => current ?? SESSION_LOST_NOTICE);
    }
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
