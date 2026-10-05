import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { messageOf } from '../api/http';
import { useAuth } from '../auth/AuthContext';
import { Button, Panel, TextInput } from '../components/ui';
import { useToast } from '../components/Toast';

export function LoginPage() {
  const { member, login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (member) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(loginId, password);
      navigate('/', { replace: true });
    } catch (error) {
      toast.show(messageOf(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Panel className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-safari-700">🌿 보드게임 라운지</h1>
        <p className="mb-6 text-sm text-stone-500">친구들과 함께하는 보드게임</p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <TextInput id="loginId" label="아이디" value={loginId} onChange={(e) => setLoginId(e.target.value)} autoComplete="username" required />
          <TextInput id="password" label="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          <Button type="submit" className="w-full" disabled={submitting}>로그인</Button>
        </form>
        <p className="mt-4 text-center text-sm text-stone-500">
          처음이신가요? <Link to="/signup" className="font-semibold text-safari-700">회원가입</Link>
        </p>
      </Panel>
    </div>
  );
}
