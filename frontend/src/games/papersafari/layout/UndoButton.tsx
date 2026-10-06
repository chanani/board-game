import { UndoIcon } from '../../../components/icons';
import { Button } from '../../../components/ui';

/** 버린 카드 더미에서 가져온 카드를 다시 내려놓는다(CANCEL_DRAW). */
export function UndoButton({ onUndo, className = '' }: { onUndo: () => void; className?: string }) {
  return (
    <Button variant="secondary" aria-label="되돌리기" title="되돌리기" onClick={onUndo} className={`flex items-center justify-center ${className}`}>
      <UndoIcon />
    </Button>
  );
}
