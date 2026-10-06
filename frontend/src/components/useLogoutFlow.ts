import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { messageOf } from '../api/http';
import { roomsApi } from '../api/rooms';
import { useAuth } from '../auth/AuthContext';
import { useToast } from './Toast';

/** 로그아웃 확인 흐름. modalProps는 LogoutConfirmModal에 그대로 펼쳐 쓴다. */
export function useLogoutFlow() {
  const { member, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  // 닫히는 동안 문구가 바뀌지 않도록 open과 inGame을 따로 둔다.
  const [open, setOpen] = useState(false);
  const [inGame, setInGame] = useState(false);
  const [pending, setPending] = useState(false);

  const askLogout = async () => {
    // 방을 확인하지 못하면 보수적으로 기권 안내를 보인다(실제로 게임 중이면 서버가 기권 처리한다).
    try {
      const room = await roomsApi.mine();
      setInGame(room !== null && room.status === 'PLAYING' && room.members.some((m) => m.id === member?.id));
    } catch {
      setInGame(true);
    }
    setOpen(true);
  };

  const doLogout = async () => {
    setPending(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.show(messageOf(error));
      setPending(false);
    }
  };

  return { askLogout, modalProps: { open, inGame, pending, onCancel: () => setOpen(false), onConfirm: doLogout } };
}
