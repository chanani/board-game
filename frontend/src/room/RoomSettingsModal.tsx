import { useEffect, useState } from 'react';
import type { Room, RoomTheme } from '../api/types';
import { Modal } from '../components/Modal';
import { Button } from '../components/ui';
import { SeatPicker } from './SeatPicker';
import { ThemePicker } from './ThemePicker';

type Props = {
  open: boolean;
  room: Room;
  onClose: () => void;
  /** 실패하면 reject한다(알림은 부르는 쪽에서). 그러면 창이 열린 채로 남는다. */
  onSave: (maxPlayers: number, theme: RoomTheme) => Promise<unknown>;
};

/** 대기 중인 방장이 최대 인원과 테마를 바꾸는 창. 지금 있는 인원보다 적게는 줄일 수 없다. */
export function RoomSettingsModal({ open, room, onClose, onSave }: Props) {
  const [maxPlayers, setMaxPlayers] = useState(room.maxPlayers);
  const [theme, setTheme] = useState<RoomTheme>(room.theme);
  const [pending, setPending] = useState(false);
  const min = Math.max(2, room.members.length);

  useEffect(() => {
    if (open) {
      setMaxPlayers(room.maxPlayers);
      setTheme(room.theme);
    }
    // 열릴 때만 현재 설정으로 되돌린다. 열려 있는 동안 방송이 와도 고르던 값을 덮어쓰지 않는다.
  }, [open]);

  const save = async () => {
    setPending(true);
    try {
      await onSave(maxPlayers, theme);
      onClose();
    } catch {
      // 오류 알림은 onSave 쪽에서 한다.
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal open={open} title="방 설정" onClose={onClose} padding="snug">
      <div className="space-y-4">
        <h2 className="pr-10 text-lg font-black leading-7 text-wood-800">방 설정</h2>
        <SeatPicker value={maxPlayers} onChange={setMaxPlayers} min={min} />
        {min > 2 ? <p className="text-xs text-stone-500">지금 {min}명이 있어서 {min - 1}명 이하로는 줄일 수 없어요.</p> : null}
        <ThemePicker value={theme} onChange={setTheme} />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button onClick={save} disabled={pending}>저장</Button>
        </div>
      </div>
    </Modal>
  );
}
