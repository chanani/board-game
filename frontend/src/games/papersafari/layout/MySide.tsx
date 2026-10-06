import { Button } from '../../../components/ui';
import { UndoButton } from './UndoButton';

type Props = {
  canDiscard: boolean;
  canUndo: boolean;
  estimate: { score: number; hidden: number } | null;
  onDiscard: () => void;
  onUndo: () => void;
};

/** 내 판 오른쪽 세로 칸: 되돌리기(있을 때)·버리기 버튼 위, 예상 점수 아래. 칸(컨테이너)이 110px보다 좁으면 가려진 장수를 숨기고 글자를 줄인다. */
export function MySide({ canDiscard, canUndo, estimate, onDiscard, onUndo }: Props) {
  return (
    <div data-testid="my-side" className="@container flex min-w-[4.25rem] flex-1 flex-col items-stretch gap-2 self-center">
      {canUndo ? <UndoButton onUndo={onUndo} className="px-2!" /> : null}
      <Button variant="secondary" className="px-2!" disabled={!canDiscard} onClick={onDiscard}>버리기</Button>
      {estimate ? (
        <span className="rounded-2xl bg-black/35 px-2 py-1 text-center text-xs break-keep text-cream-50">
          현재 예상 점수 <strong className="text-lg text-mustard-400 @max-[110px]:text-base">{estimate.score}</strong>
          {estimate.hidden > 0 ? <span className="estimate-hidden-note block text-cream-200/80 @max-[110px]:hidden">(+ 가려진 {estimate.hidden}장)</span> : null}
        </span>
      ) : null}
    </div>
  );
}
