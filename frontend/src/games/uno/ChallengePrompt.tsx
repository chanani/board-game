import { Countdown } from '../../components/Countdown';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/ui';

type Props = { open: boolean; byName: string; deadline: number | null; serverNow: number; onAccept: () => void; onChallenge: () => void };

/** 닫기 없음(Esc로도 닫히지 않는다). 시간이 지나면 서버가 4장 받기로 처리한다. */
export function ChallengePrompt({ open, byName, deadline, serverNow, onAccept, onChallenge }: Props) {
  return (
    <Modal open={open} title="와일드 +4를 받았어요">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-black text-wood-800">와일드 +4를 받았어요</h2>
        <Countdown deadline={deadline} serverNow={serverNow} />
      </div>
      <p className="mt-2 text-sm text-stone-700">
        {byName}님이 지금 색 카드를 갖고 있었다고 생각하면 도전하세요. 맞으면 {byName}님이 4장, 틀리면 내가 6장을 뽑아요.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onAccept}>4장 받기</Button>
        <Button variant="danger" onClick={onChallenge}>도전하기</Button>
      </div>
    </Modal>
  );
}
