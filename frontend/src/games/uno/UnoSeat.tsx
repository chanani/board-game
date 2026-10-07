import { motion, useReducedMotion } from 'motion/react';
import type { UnoPlayerView } from '../../api/types';
import { Countdown } from '../../components/Countdown';
import { AlertIcon, SkipIcon, StarIcon } from '../../components/icons';
import { UnoCardFace } from './UnoCardFace';

type Props = {
  player: UnoPlayerView;
  nickname: string;
  active: boolean;
  backWidth: number;
  /** 뒷면 부채에 그릴 최대 장수(나머지는 생략). */
  maxBacks: number;
  timer?: { deadline: number | null; serverNow: number };
  connected?: boolean;
  offlineSeconds?: number;
  catchable: boolean;
  bubble?: boolean;
  shaking?: boolean;
  skipped?: boolean;
};

export function UnoSeat({ player, nickname, active, backWidth, maxBacks, timer, connected, offlineSeconds = 0, catchable, bubble = false, shaking = false, skipped = false }: Props) {
  const reduced = useReducedMotion();
  const shake = shaking && !reduced;
  const backs = Math.min(player.cardCount, maxBacks);
  const label = `${nickname}, 카드 ${player.cardCount}장${player.unoDeclared ? ', 우노' : ''}${active ? ', 차례' : ''}`;
  return (
    <motion.div role="group" aria-label={label} data-testid="uno-seat" data-player={player.playerId} data-shaking={shaking ? 'true' : undefined}
      data-active={active ? 'true' : undefined}
      animate={shake ? { x: [0, -6, 6, -6, 6, 0] } : { x: 0 }} transition={{ duration: 0.5 }}
      // 차례인 상대 자리는 페이퍼 사파리 판처럼 안쪽 강조 테두리로 둘러 멀리서도 보이게 한다. 여백은 늘 같아 차례가 바뀌어도 자리가 흔들리지 않고,
      // 위아래 여백은 음수 바깥 여백으로 되돌려 펠트 높이(눕힌 화면 한 화면 맞춤)를 늘리지 않는다.
      className={`relative -my-1 flex flex-col items-center gap-1 rounded-2xl px-1.5 py-1 ${active ? 'turn-ring bg-black/20 ring-[3px] ring-inset ring-(--turn-ring)' : ''}`}>
      {bubble ? (
        <motion.span data-testid="uno-bubble" initial={reduced ? false : { scale: 0.6 }} animate={{ scale: 1 }}
          // 자리 폭(좁은 이름표)에 끌려 줄바꿈되지 않게 글자 폭 그대로(w-max·nowrap) 두고, 이웃 자리 위로 넘쳐도 가려지지 않게 앞으로 띄운다.
          className="pointer-events-none absolute -top-6 left-1/2 z-20 w-max -translate-x-1/2 whitespace-nowrap rounded-full bg-yellow-300 px-2.5 py-0.5 text-xs font-black leading-tight text-wood-900 shadow">우노!</motion.span>
      ) : null}
      {skipped ? (
        <motion.span data-testid="skip-mark" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.8 }}
          className="absolute -top-6 right-0 text-red-200"><SkipIcon className="h-5 w-5" /></motion.span>
      ) : null}
      <div className="flex items-center gap-1.5">
        {connected !== undefined ? <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-stone-400'}`} /> : null}
        <span className={`max-w-[5.5rem] truncate md:max-w-[7rem] rounded-full px-2.5 py-0.5 text-xs font-bold shadow-[0_2px_0_rgb(0_0_0/0.3)] ${active ? 'turn-glow bg-(--turn-tag-bg) text-(--turn-tag-ink)' : 'bg-cream-50 text-wood-800'}`}>{nickname}</span>
        {catchable ? <span data-testid="catch-badge" role="img" aria-label="우노를 안 외쳤어요" className="rounded-full bg-red-600 p-0.5 text-white"><AlertIcon className="h-3 w-3" /></span> : null}
        {timer ? <Countdown size="sm" deadline={timer.deadline} serverNow={timer.serverNow} /> : null}
      </div>
      {connected === false ? <span className="felt-ink text-xs">연결 끊김 {offlineSeconds}초</span> : null}
      <div data-uno-zone={`hand:${player.playerId}`} aria-hidden="true" className="flex" style={{ minHeight: backWidth * 1.5, minWidth: backWidth }}>
        {Array.from({ length: backs }, (_, index) => (
          <span key={index} style={{ marginLeft: index === 0 ? 0 : -backWidth * 0.62 }}><UnoCardFace card={null} width={backWidth} decorative /></span>
        ))}
      </div>
      <div className="flex flex-nowrap items-center gap-1 text-[11px] font-bold">
        {active ? (
          <span data-testid="turn-tag" className="whitespace-nowrap rounded-full bg-(--turn-tag-bg) px-2 py-0.5 text-(--turn-tag-ink) shadow-[0_1px_0_rgb(0_0_0/0.3)]">차례</span>
        ) : null}
        <span data-testid="card-count" className="whitespace-nowrap rounded-full bg-black/35 px-2 py-0.5 text-cream-50">{player.cardCount}장</span>
        {player.unoDeclared ? (
          <span data-testid="uno-badge" className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-full bg-yellow-300 px-2 py-0.5 text-wood-900"><StarIcon className="h-3 w-3" />우노</span>
        ) : null}
      </div>
    </motion.div>
  );
}
