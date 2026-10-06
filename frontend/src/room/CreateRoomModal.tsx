import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { RoomTheme } from '../api/types';
import { LockIcon } from '../components/icons';
import { Modal } from '../components/Modal';
import { ToggleSwitch } from '../components/ToggleSwitch';
import { Button, TextInput } from '../components/ui';
import { DEFAULT_ROOM_THEME } from './roomTheme';
import { ThemePicker } from './ThemePicker';

type Props = {
  open: boolean;
  defaultName: string;
  onClose: () => void;
  onCreate: (name: string, maxPlayers: number, theme: RoomTheme, password?: string) => void;
};

const SEAT_OPTIONS = [2, 3, 4, 5];

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
    <Modal open={open} title="방 만들기" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <h2 className="pr-8 text-lg font-black">방 만들기</h2>
        <TextInput id="roomName" label="방 이름" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} required />
        <div>
          <span id="seatLabel" className="text-sm font-semibold text-wood-700">최대 인원</span>
          <div role="radiogroup" aria-labelledby="seatLabel" className="mt-1 flex gap-2">
            {SEAT_OPTIONS.map((count) => (
              <button key={count} type="button" role="radio" aria-checked={maxPlayers === count} onClick={() => setMaxPlayers(count)}
                className={`press-3d h-9 w-9 rounded-full text-sm font-bold shadow ${maxPlayers === count ? 'bg-mustard-400 text-wood-800' : 'bg-cream-50 text-wood-700'}`}>
                {count}
              </button>
            ))}
          </div>
        </div>
        <ThemePicker value={theme} onChange={setTheme} />
        <div>
          <ToggleSwitch checked={priv} onChange={setPriv} label="비공개방" icon={<LockIcon className="h-4 w-4" />} />
          {/* 높이·투명도로 펼치고 접는다. 동작 줄이기 설정은 App의 MotionConfig가 따른다. */}
          <AnimatePresence initial={false}>
            {priv ? (
              <motion.div key="password" data-testid="password-reveal" style={{ overflow: 'hidden' }}
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}>
                <div className="px-0.5 pb-1 pt-3">
                  <TextInput id="createPassword" label="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    minLength={4} maxLength={20} autoComplete="off" placeholder="4~20자" required />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button type="submit">만들기</Button>
        </div>
      </form>
    </Modal>
  );
}
