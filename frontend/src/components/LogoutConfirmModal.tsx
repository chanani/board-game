import { LogoutIcon } from './icons';
import { Modal } from './Modal';
import { Button } from './ui';

type Props = { open: boolean; inGame: boolean; pending: boolean; onCancel: () => void; onConfirm: () => void };

/** 로그아웃 확인. 게임에 참가 중이면 기권된다는 것을 알리고 버튼 문구도 바꾼다. */
export function LogoutConfirmModal({ open, inGame, pending, onCancel, onConfirm }: Props) {
  const title = inGame ? '게임 중이에요' : '로그아웃할까요?';
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <div className="flex flex-col items-center gap-4 text-center">
        <LogoutIcon className="h-11 w-11 text-wood-700" />
        <h2 className="text-lg font-bold text-wood-800">{title}</h2>
        <p className="text-sm text-stone-600">
          {inGame ? <>지금 로그아웃하면 <b className="text-red-700">진행 중인 게임은 기권 처리되고 방에서 나가요.</b> 그래도 로그아웃할까요?</> : '다음에 다시 로그인하면 이어서 즐길 수 있어요.'}
        </p>
        <div className="flex w-full gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>{inGame ? '계속 게임하기' : '취소'}</Button>
          <Button variant="danger" className="flex-1" disabled={pending} onClick={onConfirm}>{inGame ? '기권하고 로그아웃' : '로그아웃'}</Button>
        </div>
      </div>
    </Modal>
  );
}
