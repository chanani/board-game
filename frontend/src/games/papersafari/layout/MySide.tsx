import type { ReactNode } from 'react';
import { Button } from '../../../components/ui';
import { UndoButton } from './UndoButton';

type Props = {
  canDiscard: boolean;
  canUndo: boolean;
  estimate: { score: number; hidden: number } | null;
  onDiscard: () => void;
  onUndo: () => void;
  /** 버리기와 예상 점수 사이에 두는 손 카드 자리. 기울어진 카드가 버튼을 덮지 않게 위아래 여백을 둔다. */
  hand?: ReactNode;
};

/** 내 판 오른쪽 세로 칸: 되돌리기(있을 때)·버리기 버튼 위, 예상 점수 아래. 칸(컨테이너)이 110px보다 좁으면 가려진 장수를 숨기고 글자를 줄인다. */
export function MySide({ canDiscard, canUndo, estimate, onDiscard, onUndo, hand }: Props) {
  return (
    <div data-testid="my-side" className="@container flex min-w-[4.25rem] flex-1 flex-col items-stretch gap-2 self-center">
      {/* 되돌리기가 없을 때도 같은 높이의 자리를 남겨, 카드를 가져와 버튼이 생겨도 내 판 줄(과 그 아래 채팅 줄)이 움직이지 않게 한다. */}
      {canUndo ? <UndoButton onUndo={onUndo} className="h-9 px-2!" /> : <div data-testid="undo-slot" aria-hidden="true" className="h-9" />}
      <Button variant="secondary" className="px-2!" disabled={!canDiscard} onClick={onDiscard}>버리기</Button>
      {hand ? <div className="flex justify-center py-1.5">{hand}</div> : null}
      {estimate ? (
        <span className="pill rounded-2xl px-2 py-1 text-center text-xs break-keep">
          현재 예상 점수 <strong className="text-lg text-mustard-400 @max-[110px]:text-base">{estimate.score}</strong>
          {estimate.hidden > 0 ? <span className="estimate-hidden-note block opacity-85 @max-[110px]:hidden">(+ 가려진 {estimate.hidden}장)</span> : null}
        </span>
      ) : null}
    </div>
  );
}
