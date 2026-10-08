import { motion, useReducedMotion } from 'motion/react';
import type { UnoStage } from '../../api/types';
import { Button } from '../../components/ui';

type Props = {
  stage: UnoStage | null;
  myTurn: boolean;
  /** 내가 1장이 되어 열린 잡기 창 동안만 참(서버 canCallUno). 차례와 상관없이 우노! 버튼을 보인다. */
  canCallUno: boolean;
  catchTarget: { id: number; name: string } | null;
  onDraw: () => void;
  onPlayDrawn: () => void;
  onKeep: () => void;
  onCallUno: () => void;
  onCatch: () => void;
};

/** 손패 바로 위, 높이 고정. 상황에 맞는 버튼만 보인다(스펙 6.4). */
export function UnoActionBar({ stage, myTurn, canCallUno, catchTarget, onDraw, onPlayDrawn, onKeep, onCallUno, onCatch }: Props) {
  const reduced = useReducedMotion();
  return (
    <div data-testid="uno-action-bar" className="flex min-h-12 flex-wrap items-center justify-center gap-2">
      {myTurn && stage === 'PLAY' ? <Button variant="secondary" data-no-click-sound onClick={onDraw}>카드 뽑기</Button> : null}
      {myTurn && stage === 'DRAWN' ? (
        <>
          <Button data-no-click-sound onClick={onPlayDrawn}>뽑은 카드 내기</Button>
          <Button variant="secondary" onClick={onKeep}>갖고 넘기기</Button>
        </>
      ) : null}
      {canCallUno ? (
        <motion.button type="button" data-no-click-sound onClick={onCallUno}
          animate={reduced ? { boxShadow: ['0 0 0 0 rgb(250 204 21 / 0.0)', '0 0 18px 4px rgb(250 204 21 / 0.8)'] } : { scale: [0.9, 1.05, 0.9] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="press-3d rounded-full bg-yellow-300 px-5 py-2 text-base font-black text-wood-900 shadow-[0_4px_0_#a16207]">
          우노!
        </motion.button>
      ) : null}
      {catchTarget ? (
        <button type="button" data-no-click-sound onClick={onCatch} aria-label={`우노 안 외쳤어요! (${catchTarget.name}님 잡기)`}
          className="press-3d rounded-full bg-red-600 px-5 py-2 text-base font-black text-white shadow-[0_4px_0_#7f1d1d]">
          우노 안 외쳤어요!
        </button>
      ) : null}
    </div>
  );
}
