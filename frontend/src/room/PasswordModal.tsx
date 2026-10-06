import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../components/Modal';
import { Button, TextInput } from '../components/ui';

type Props = { open: boolean; roomName: string; error: string | null; onSubmit: (password: string) => void; onCancel: () => void };

export function PasswordModal({ open, roomName, error, onSubmit, onCancel }: Props) {
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (open) {
      setPassword('');
    }
  }, [open, roomName]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(password);
  };

  return (
    <Modal open={open} title={`${roomName} 비밀번호`} onClose={onCancel}>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <h2 className="pr-8 text-lg font-black">비공개방이에요</h2>
        <TextInput id="roomPassword" label="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          maxLength={20} autoComplete="off" required />
        {error ? <p role="alert" className="text-sm font-semibold text-brick-600">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>취소</Button>
          <Button type="submit">들어가기</Button>
        </div>
      </form>
    </Modal>
  );
}
