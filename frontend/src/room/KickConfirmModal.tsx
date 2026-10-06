import { Modal } from '../components/Modal';
import { Button } from '../components/ui';

type Props = { nickname: string | null; onCancel: () => void; onConfirm: () => void };

/** 방장이 대기 중에 참가자를 내보내기 전에 한 번 더 묻는다. nickname이 없으면 닫혀 있다. */
export function KickConfirmModal({ nickname, onCancel, onConfirm }: Props) {
  const question = `${nickname ?? ''}님을 내보낼까요?`;
  return (
    <Modal open={nickname !== null} title={question} onClose={onCancel}>
      <div className="flex flex-col items-center gap-5">
        <h2 className="text-lg font-bold text-wood-800">{question}</h2>
        <div className="flex w-full gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>취소</Button>
          <Button variant="danger" className="flex-1" onClick={onConfirm}>내보내기</Button>
        </div>
      </div>
    </Modal>
  );
}
