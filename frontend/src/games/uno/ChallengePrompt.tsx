import type { UnoColor } from '../../api/types';
import { Countdown } from '../../components/Countdown';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/ui';
import { COLOR_HEX, COLOR_NAMES } from './cards';

type Props = {
  open: boolean;
  byName: string;
  /** +4를 내기 직전의 색. 도전 판정은 고른 색이 아니라 이 색 기준이다. */
  previousColor: UnoColor | null;
  deadline: number | null;
  serverNow: number;
  onAccept: () => void;
  onChallenge: () => void;
};

/** 닫기 없음(Esc로도 닫히지 않는다). 시간이 지나면 서버가 4장 받기로 처리한다. */
export function ChallengePrompt({ open, byName, previousColor, deadline, serverNow, onAccept, onChallenge }: Props) {
  const colorName = previousColor ? COLOR_NAMES[previousColor] : '직전 색';
  return (
    <Modal open={open} title="와일드 +4를 받았어요">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-black text-wood-800">와일드 +4를 받았어요</h2>
        <Countdown deadline={deadline} serverNow={serverNow} />
      </div>
      <p className="mt-2 text-sm text-stone-700">
        {byName}님이 직전 색 카드를 갖고 있었다고 생각하면 도전하세요. 맞으면 {byName}님이 4장, 틀리면 내가 6장을 뽑아요.
      </p>
      <p data-testid="challenge-basis" className="mt-2 flex items-center gap-1.5 rounded-lg bg-cream-200/60 px-2.5 py-1.5 text-sm font-bold text-wood-800">
        {previousColor ? <span aria-hidden="true" className="inline-block h-3 w-3 shrink-0 rounded-full ring-1 ring-black/20" style={{ background: COLOR_HEX[previousColor] }} /> : null}
        직전 색({colorName})을 낸 사람이 갖고 있었으면 도전 성공
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onAccept}>4장 받기</Button>
        <Button variant="danger" onClick={onChallenge}>도전하기</Button>
      </div>
    </Modal>
  );
}
