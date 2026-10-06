import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { messageOf } from '../api/http';
import { SignupLoginError, useAuth } from '../auth/AuthContext';
import { pathAfterLogin } from '../auth/afterLogin';
import { motion } from 'motion/react';
import { Felt } from '../components/Felt';
import { Button, Panel, TextInput } from '../components/ui';
import { CardFace } from '../games/papersafari/CardFace';
import { useToast } from '../components/Toast';

export function SignupPage() {
  const { member, signup } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [loginId, setLoginId] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (member && !submitting) {
    return <Navigate to="/" replace />;
  }

  const handleFailure = (error: unknown) => {
    if (error instanceof SignupLoginError) {
      toast.show('가입은 완료됐어요. 로그인해 주세요.', 'info');
      navigate('/login', { replace: true });
      return;
    }
    toast.show(messageOf(error));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await signup(loginId, nickname, password);
      navigate(await pathAfterLogin(), { replace: true });
    } catch (error) {
      handleFailure(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Felt className="relative w-full max-w-md px-6 py-10">
        <div aria-hidden="true" className="pointer-events-none absolute -left-6 -top-8 z-10 flex">
          <div className="-rotate-12"><CardFace card={{ kind: 'NUMBER', value: 9 }} faceUp known size="md" /></div>
          <div className="-ml-4 rotate-6"><CardFace card={{ kind: 'FOX', value: -2 }} faceUp known size="md" /></div>
        </div>
        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
      <Panel>
        <h1 className="mb-6 text-2xl font-bold text-safari-700">회원가입</h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <TextInput id="loginId" label="아이디" hint="4~20자 영문과 숫자" value={loginId} onChange={(e) => setLoginId(e.target.value)} autoComplete="username" required />
          <TextInput id="nickname" label="닉네임" hint="2~10자" value={nickname} onChange={(e) => setNickname(e.target.value)} required />
          <TextInput id="password" label="비밀번호" type="password" hint="8자 이상" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
          <Button type="submit" className="w-full" disabled={submitting}>가입하고 시작하기</Button>
        </form>
        <p className="mt-4 text-center text-sm text-stone-500">
          이미 계정이 있나요? <Link to="/login" className="font-semibold text-safari-700">로그인</Link>
        </p>
      </Panel>
        </motion.div>
      </Felt>
    </div>
  );
}
