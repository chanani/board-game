import { Modal } from '../components/Modal';
import { DoorIcon } from '../components/icons';
import { Button } from '../components/ui';

type Props = { open: boolean; onCancel: () => void; onConfirm: () => void };

export function LeaveConfirmModal({ open, onCancel, onConfirm }: Props) {
  return (
    <Modal open={open} title="정말 나갈까요?" onClose={onCancel}>
      <div className="flex flex-col items-center gap-5">
        <DoorIcon className="h-12 w-12 text-wood-700" />
        <div className="flex w-full gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>취소</Button>
          <Button variant="danger" className="flex-1" onClick={onConfirm}>나가기</Button>
        </div>
      </div>
    </Modal>
  );
}
