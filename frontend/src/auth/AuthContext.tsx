import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { Member } from '../api/types';

type AuthState = {
  member: Member | null;
  loading: boolean;
  login: (loginId: string, password: string) => Promise<void>;
  signup: (loginId: string, nickname: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .me()
      .then(setMember)
      .catch(() => setMember(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (loginId: string, password: string) => {
    setMember(await authApi.login(loginId, password));
  }, []);

  const signup = useCallback(async (loginId: string, nickname: string, password: string) => {
    await authApi.signup(loginId, nickname, password);
    setMember(await authApi.login(loginId, password));
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setMember(null);
  }, []);

  const value = useMemo(() => ({ member, loading, login, signup, logout }), [member, loading, login, signup, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('AuthProvider 안에서만 쓸 수 있어요.');
  }
  return context;
}
