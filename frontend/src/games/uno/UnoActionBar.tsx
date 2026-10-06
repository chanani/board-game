import type { UnoStage } from '../../api/types';
import { Button } from '../../components/ui';

type Props = { stage: UnoStage | null; myTurn: boolean; onDraw: () => void; onPlayDrawn: () => void; onKeep: () => void };

/** 손패 바로 위, 높이 고정. 상황에 맞는 버튼만 보인다(스펙 6.4). */
export function UnoActionBar({ stage, myTurn, onDraw, onPlayDrawn, onKeep }: Props) {
  return (
    <div data-testid="uno-action-bar" className="flex h-12 items-center justify-center gap-2">
      {myTurn && stage === 'PLAY' ? <Button variant="secondary" onClick={onDraw}>카드 뽑기</Button> : null}
      {myTurn && stage === 'DRAWN' ? (
        <>
          <Button onClick={onPlayDrawn}>뽑은 카드 내기</Button>
          <Button variant="secondary" onClick={onKeep}>갖고 넘기기</Button>
        </>
      ) : null}
    </div>
  );
}
