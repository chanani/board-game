import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { messageOf } from '../api/http';
import { roomsApi } from '../api/rooms';
import { useAuth } from '../auth/AuthContext';
import { LogoutConfirmModal } from '../components/LogoutConfirmModal';
import { ToggleSwitch } from '../components/ToggleSwitch';
import { useToast } from '../components/Toast';
import { Button, Panel } from '../components/ui';
import { useSound } from '../lib/sound';

export function SettingsPage() {
  const { member, logout } = useAuth();
  const { play, muted, toggleMuted, volume, setVolume } = useSound();
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

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <h1 className="text-2xl font-black text-cream-50 drop-shadow">설정</h1>
      <Panel className="flex flex-col gap-4">
        <h2 id="settings-sound" className="text-lg font-bold text-wood-800">소리</h2>
        <section aria-labelledby="settings-sound" className="flex flex-col gap-4">
          <ToggleSwitch checked={!muted} onChange={toggleMuted} label="효과음" />
          <div className="flex items-center gap-3">
            <label htmlFor="volume" className="text-sm font-semibold text-wood-700">음량</label>
            <input id="volume" type="range" min={0} max={100} step={1} value={volume} disabled={muted}
              onChange={(e) => setVolume(Number(e.target.value))} className="min-w-0 flex-1 accent-mustard-400 disabled:opacity-40" />
            <span aria-hidden="true" className="w-8 text-right tabular-nums text-wood-800">{volume}</span>
          </div>
          <Button variant="secondary" onClick={() => play('myTurn')}>소리 들어보기</Button>
        </section>
      </Panel>
      <Panel className="flex flex-col gap-4">
        <h2 id="settings-account" className="text-lg font-bold text-wood-800">계정</h2>
        <section aria-labelledby="settings-account" className="flex flex-col gap-4">
          <dl className="flex flex-col gap-1 text-sm text-wood-700">
            <div className="flex justify-between gap-3"><dt>닉네임</dt><dd className="font-bold text-wood-800">{member?.nickname}</dd></div>
            <div className="flex justify-between gap-3"><dt>아이디</dt><dd className="font-bold text-wood-800">{member?.loginId}</dd></div>
          </dl>
          <Button variant="danger" className="w-full" onClick={askLogout}>로그아웃</Button>
        </section>
      </Panel>
      <LogoutConfirmModal open={open} inGame={inGame} pending={pending} onCancel={() => setOpen(false)} onConfirm={doLogout} />
    </div>
  );
}
