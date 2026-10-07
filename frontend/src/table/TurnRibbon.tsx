import { motion, useReducedMotion } from 'motion/react';
import { useRemaining } from '../components/Countdown';

type Props = {
  deadline: number | null | undefined;
  serverNow: number | undefined;
};

/**
 * 내 차례 동안 손패 칸 윗변(펠트 아래 테두리)에 걸쳐 뜨는 강조색 리본. 남은 결정 시간을 초로 보인다.
 * 손패 칸 위로 띄워(absolute) 배치 높이를 바꾸지 않고, 행동 줄 버튼·들어 올린 카드·"내기" 말풍선을 가리지 않는다.
 * 차례 안내 바가 이미 "내 차례"와 문구를 읽어 주므로 화면 읽기 프로그램에는 숨긴다.
 */
export function TurnRibbon({ deadline, serverNow }: Props) {
  const reduced = useReducedMotion();
  const remaining = useRemaining(deadline, serverNow);
  const seconds = remaining === null ? null : Math.ceil(remaining / 1000);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute bottom-[calc(100%-0.375rem)] left-0 right-0 z-10 flex justify-center">
      <motion.div data-testid="my-turn-ribbon" initial={reduced ? false : { y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-(--accent) px-3 py-0.5 text-xs font-extrabold leading-5 text-(--accent-text) shadow-[0_3px_0_var(--accent-shadow),0_6px_14px_rgb(0_0_0/0.3)]">
        <span data-testid="my-turn-ribbon-dot" className="live-dot h-1.5 w-1.5 shrink-0 rounded-full bg-(--accent-text)" />
        내 차례{seconds === null ? null : ` · ${seconds}초`}
      </motion.div>
    </div>
  );
}
