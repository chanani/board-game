import { Modal } from '../components/Modal';
import type { LogEntry } from '../lib/eventLog';
import { LogList, type Nickname } from './LogList';

/** 진행 기록 전체를 화면 안 대화상자로 보여준다. */
export function LogModal({ open, onClose, log, nicknameOf }: { open: boolean; onClose: () => void; log: LogEntry[]; nicknameOf?: Nickname }) {
  return (
    <Modal open={open} title="진행 기록" onClose={onClose}>
      <h3 className="mb-2 text-base font-bold">진행 기록</h3>
      <LogList log={log} nicknameOf={nicknameOf} className="max-h-[60vh]" />
    </Modal>
  );
}
