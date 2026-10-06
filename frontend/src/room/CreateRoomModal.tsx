import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { RoomTheme } from '../api/types';
import { LockIcon } from '../components/icons';
import { Modal } from '../components/Modal';
import { ToggleSwitch } from '../components/ToggleSwitch';
import { Button, TextInput } from '../components/ui';
import { DEFAULT_ROOM_THEME } from './roomTheme';
import { SeatPicker, SECTION_TITLE } from './SeatPicker';
import { ThemePicker } from './ThemePicker';

type Props = {
  open: boolean;
  defaultName: string;
  onClose: () => void;
  onCreate: (name: string, maxPlayers: number, theme: RoomTheme, password?: string) => void;
};

export function CreateRoomModal({ open, defaultName, onClose, onCreate }: Props) {
  const [name, setName] = useState(defaultName);
  const [maxPlayers, setMaxPlayers] = useState(5);
  const [priv, setPriv] = useState(false);
  const [password, setPassword] = useState('');
  const [theme, setTheme] = useState<RoomTheme>(DEFAULT_ROOM_THEME);

  useEffect(() => {
    if (open) {
      setName(defaultName);
      setMaxPlayers(5);
      setPriv(false);
      setPassword('');
      setTheme(DEFAULT_ROOM_THEME);
    }
  }, [open, defaultName]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed === '' || (priv && password.length < 4)) {
      return;
    }
    onCreate(trimmed, maxPlayers, theme, priv ? password : undefined);
  };

  return (
    <Modal open={open} title="새 방 만들기" onClose={onClose} padding="snug">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <h2 className="pr-10 text-lg font-black leading-7 text-wood-800">새 방 만들기</h2>
        <div className="space-y-1.5">
          <label htmlFor="roomName" className={`block ${SECTION_TITLE}`}>방 이름</label>
          <input id="roomName" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} required
            className="w-full rounded-xl border border-cream-300 bg-cream px-3 py-2.5 text-sm text-wood-800 shadow-[inset_0_2px_4px_rgb(0_0_0/0.08)] outline-none focus:border-mustard-400 focus:ring-2 focus:ring-mustard-300/50" />
        </div>
        <SeatPicker value={maxPlayers} onChange={setMaxPlayers} />
        <ThemePicker value={theme} onChange={setTheme} />
        <div>
          <ToggleSwitch checked={priv} onChange={setPriv} label="비공개방" icon={<LockIcon className="h-4 w-4 text-wood-500" />}
            className="w-full rounded-xl bg-cream px-3 py-2.5 text-sm font-bold text-wood-800" />
          {/* 높이·투명도로 펼치고 접는다. 위쪽 12px 간격(pt-3)은 안쪽에 두어 높이와 함께 나타나고 사라진다.
              바깥에 margin을 두면 접힐 때 튄다. 동작 줄이기 설정은 App의 MotionConfig가 따른다. */}
          <AnimatePresence initial={false}>
            {priv ? (
              <motion.div key="password" data-testid="password-reveal" style={{ overflow: 'hidden' }}
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}>
                <div className="px-0.5 pb-1 pt-3">
                  <TextInput id="createPassword" label="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    minLength={4} maxLength={20} autoComplete="off" placeholder="4~20자" required aria-describedby="createPasswordHint" />
                  <p id="createPasswordHint" className="mt-1.5 text-xs text-stone-500">4~20자로 정해요. 함께할 친구에게 알려 주세요.</p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button type="submit">방 만들기</Button>
        </div>
      </form>
    </Modal>
  );
}
