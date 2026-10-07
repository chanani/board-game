import { useState } from 'react';
import { messageOf } from '../api/http';
import { useAuth } from '../auth/AuthContext';
import { AVATAR_KEYS, AVATAR_LABELS, avatarOf, type AvatarKey } from '../lib/avatars';
import { AvatarFace } from './Avatar';
import { CheckIcon } from './icons';
import { Modal } from './Modal';
import { useToast } from './Toast';

type Props = { open: boolean; onClose: () => void };

/** 동물 얼굴 12종 격자. 누르면 바로 저장하고, 지금 고른 그림에 체크와 테두리를 단다. */
export function AvatarPickerModal({ open, onClose }: Props) {
  const { member, changeAvatar } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState<AvatarKey | null>(null);
  const [saved, setSaved] = useState(false);
  const current = member ? avatarOf(member.avatar, member.id) : null;

  const choose = async (key: AvatarKey) => {
    if (saving || key === current) {
      return;
    }
    setSaving(key);
    setSaved(false);
    try {
      await changeAvatar(key);
      setSaved(true);
    } catch (error) {
      toast.show(messageOf(error));
    } finally {
      setSaving(null);
    }
  };

  const close = () => {
    setSaved(false);
    onClose();
  };

  return (
    <Modal open={open} title="프로필 사진" onClose={close}>
      <h2 className="text-lg font-black text-wood-800">프로필 사진</h2>
      <p className="mt-1 text-sm text-stone-600">고르면 바로 저장돼요.</p>
      <ul aria-label="프로필 사진 고르기" className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
        {AVATAR_KEYS.map((key) => {
          const selected = key === current;
          return (
            <li key={key}>
              <button type="button" aria-pressed={selected} aria-label={AVATAR_LABELS[key]} disabled={saving !== null}
                onClick={() => void choose(key)}
                className={`relative flex w-full flex-col items-center gap-1 rounded-2xl p-1.5 text-[11px] font-bold text-wood-800 transition-colors disabled:cursor-wait sm:p-2 ${selected ? 'bg-mustard-300/60 ring-2 ring-mustard-600' : 'hover:bg-cream-200'}`}>
                <span className="block aspect-square w-full max-w-16"><AvatarFace avatar={key} /></span>
                <span aria-hidden="true">{AVATAR_LABELS[key]}</span>
                {selected ? (
                  <span data-testid="avatar-selected" className="absolute right-1 top-1 rounded-full bg-green-600 p-0.5 text-white shadow"><CheckIcon className="h-3 w-3" /></span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      <p aria-live="polite" className="mt-3 min-h-5 text-center text-sm font-bold text-green-700">{saved ? '저장했어요' : ''}</p>
    </Modal>
  );
}
