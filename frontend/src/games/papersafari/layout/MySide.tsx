import { Button } from '../../../components/ui';

type Props = { canDiscard: boolean; estimate: { score: number; hidden: number } | null; onDiscard: () => void };

/** 내 판 오른쪽 세로 칸: 버리기 버튼 위, 예상 점수 아래. 칸이 좁으면 가려진 장수를 숨기고 글자를 줄인다. */
export function MySide({ canDiscard, estimate, onDiscard }: Props) {
  return (
    <div data-testid="my-side" className="@container flex w-24 shrink-0 flex-col items-stretch gap-2 self-center">
      <Button variant="secondary" disabled={!canDiscard} onClick={onDiscard}>버리기</Button>
      {estimate ? (
        <span className="rounded-2xl bg-black/35 px-2 py-1 text-center text-xs text-cream-50">
          현재 예상 점수 <strong className="text-lg text-mustard-400 @max-[120px]:text-base">{estimate.score}</strong>
          {estimate.hidden > 0 ? <span className="estimate-hidden-note block text-cream-200/80 @max-[120px]:hidden">(+ 가려진 {estimate.hidden}장)</span> : null}
        </span>
      ) : null}
    </div>
  );
}
