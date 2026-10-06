import { useEffect, useState, type FormEvent } from 'react';
import { LockIcon } from '../components/icons';
import { Modal } from '../components/Modal';
import { ToggleSwitch } from '../components/ToggleSwitch';
import { Button, TextInput } from '../components/ui';

type Props = {
  open: boolean;
  defaultName: string;
  onClose: () => void;
  onCreate: (name: string, maxPlayers: number, password?: string) => void;
};

const SEAT_OPTIONS = [2, 3, 4, 5];

export function CreateRoomModal({ open, defaultName, onClose, onCreate }: Props) {
  const [name, setName] = useState(defaultName);
  const [maxPlayers, setMaxPlayers] = useState(5);
  const [priv, setPriv] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (open) {
      setName(defaultName);
      setMaxPlayers(5);
      setPriv(false);
      setPassword('');
    }
  }, [open, defaultName]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onCreate(name, maxPlayers, priv ? password : undefined);
  };

  return (
    <Modal open={open} title="방 만들기" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <h2 className="text-lg font-black">방 만들기</h2>
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
        <ToggleSwitch checked={priv} onChange={setPriv} label="비공개방" icon={<LockIcon className="h-4 w-4" />} />
        {priv ? (
          <TextInput id="createPassword" label="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            minLength={4} maxLength={20} autoComplete="off" placeholder="4~20자" required />
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button type="submit">만들기</Button>
        </div>
      </form>
    </Modal>
  );
}
