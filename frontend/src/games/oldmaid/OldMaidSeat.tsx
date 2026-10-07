import { motion, useReducedMotion } from 'motion/react';
import type { OldMaidPlayerView } from '../../api/types';
import { AvatarFace } from '../../components/Avatar';
import { Countdown } from '../../components/Countdown';
import { MedalIcon, ThiefMaskIcon } from '../../components/icons';
import type { AvatarKey } from '../../lib/avatars';
import { LIFT_RATIO, scaledIndex } from './layout';
import { PlayingCardFace } from './PlayingCardFace';

type Props = {
  player: OldMaidPlayerView;
  nickname: string;
  /** 지금 뽑는 사람. */
  active: boolean;
  /** 지금 뽑히는 상대. */
  targeted: boolean;
  backWidth: number;
  /** 뒷면 부채에 그릴 최대 장수(나머지는 생략). */
  maxBacks: number;
  /** 뽑히는 상대일 때 신호 자리(null = 고르지 않음). */
  liftIndex: number | null;
  timer?: { deadline: number | null; serverNow: number };
  connected?: boolean;
  offlineSeconds?: number;
  shuffling?: boolean;
  /** 게임이 끝나 도둑으로 정해짐. */
  thief?: boolean;
  avatar?: AvatarKey;
  /** 짝 버리기 표시: 처음 버리기 단계의 "버리는 중"·"다 버림"(R36), 짝 버리기 단계 뽑은 사람의 "짝 버리는 중"(R37). */
  note?: SeatNote | null;
};

export type SeatNote = { text: string; done: boolean };

const TAG = 'whitespace-nowrap rounded-full px-2 py-0.5 shadow-[0_1px_0_rgb(0_0_0/0.3)]';

export function OldMaidSeat({ player, nickname, active, targeted, backWidth, maxBacks, liftIndex, timer, connected, offlineSeconds = 0, shuffling = false, thief = false, avatar, note = null }: Props) {
  const reduced = useReducedMotion();
  const backs = Math.min(player.cardCount, maxBacks);
  const lifted = targeted && liftIndex !== null ? scaledIndex(liftIndex, player.cardCount, backs) : null;
  const label = `${nickname}, 카드 ${player.cardCount}장${active ? ', 차례' : ''}${note ? `, ${note.text}` : ''}${player.rank !== null ? `, ${player.rank}등` : ''}${player.forfeited ? ', 기권' : ''}${thief ? ', 도둑' : ''}`;
  const finished = player.rank !== null && !thief;
  return (
    <div role="group" aria-label={label} data-testid="oldmaid-seat" data-player={player.playerId}
      data-active={active ? 'true' : undefined} data-targeted={targeted ? 'true' : undefined} data-shuffling={shuffling ? 'true' : undefined}
      // 차례인 자리는 우노와 같은 안쪽 강조 테두리. 여백은 늘 같아 차례가 바뀌어도 자리가 흔들리지 않는다.
      className={`relative -my-1 flex flex-col items-center gap-1 rounded-2xl px-1.5 py-1 ${active ? 'turn-ring bg-black/20 ring-[3px] ring-inset ring-(--turn-ring)' : ''} ${player.forfeited ? 'opacity-55' : ''}`}>
      <div className="flex items-center gap-1.5">
        {connected !== undefined ? <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-stone-400'}`} /> : null}
        <span data-testid="seat-tag" className={`inline-flex max-w-[5.5rem] items-center rounded-full px-2.5 py-0.5 text-xs font-bold shadow-[0_2px_0_rgb(0_0_0/0.3)] md:max-w-[7rem] ${active ? 'turn-glow bg-(--turn-tag-bg) text-(--turn-tag-ink)' : 'bg-cream-50 text-wood-800'}`}>
          {avatar ? <AvatarFace avatar={avatar} size={18} className="-my-0.5 -ml-1.5 mr-1" /> : null}
          <span className="min-w-0 truncate">{nickname}</span>
        </span>
        {timer ? <Countdown size="sm" deadline={timer.deadline} serverNow={timer.serverNow} /> : null}
      </div>
      {connected === false ? <span className="felt-ink text-xs">연결 끊김 {offlineSeconds}초</span> : null}
      <div data-oldmaid-zone={`hand:${player.playerId}`} aria-hidden="true" className="flex items-end"
        style={{ minHeight: backWidth * (1.5 + LIFT_RATIO), minWidth: backWidth }}>
        {Array.from({ length: backs }, (_, index) => (
          <motion.span key={index} data-testid="seat-back" data-lifted={index === lifted ? 'true' : undefined}
            style={{ marginLeft: index === 0 ? 0 : -backWidth * 0.62 }}
            animate={{
              y: index === lifted ? -backWidth * 1.5 * LIFT_RATIO : 0,
              x: shuffling && !reduced ? [0, index % 2 === 0 ? 8 : -8, index % 2 === 0 ? -5 : 5, 0] : 0,
              opacity: shuffling && reduced ? [1, 0.5, 1] : 1,
            }}
            transition={{ duration: shuffling ? 0.6 : 0.15 }}>
            <PlayingCardFace card={null} width={backWidth} decorative className={index === lifted ? 'rounded-[3px] ring-2 ring-(--accent)' : undefined} />
          </motion.span>
        ))}
      </div>
      <div className="flex flex-nowrap items-center gap-1 text-[11px] font-bold">
        {active && !note ? <span data-testid="turn-tag" className={`${TAG} bg-(--turn-tag-bg) text-(--turn-tag-ink)`}>차례</span> : null}
        {note ? (
          <span data-testid="discard-note" data-done={note.done ? 'true' : undefined}
            className={`${TAG} ${note.done ? 'bg-emerald-600 text-white' : 'bg-(--turn-tag-bg) text-(--turn-tag-ink)'}`}>{note.text}</span>
        ) : null}
        {targeted ? <span data-testid="target-tag" className={`${TAG} bg-(--accent) text-(--accent-text)`}>뽑히는 중</span> : null}
        {player.rank === null && !player.forfeited ? <span data-testid="card-count" className={`${TAG} bg-black/35 text-cream-50`}>{player.cardCount}장</span> : null}
        {finished ? (
          <motion.span data-testid="rank-badge" initial={reduced ? false : { scale: 0.6 }} animate={{ scale: 1 }}
            className={`${TAG} inline-flex items-center gap-0.5 bg-amber-300 text-wood-900`}><MedalIcon className="h-3 w-3" />{player.rank}등</motion.span>
        ) : null}
        {thief ? <span data-testid="thief-badge" className={`${TAG} inline-flex items-center gap-0.5 bg-rose-600 text-white`}><ThiefMaskIcon className="h-3 w-3" />도둑</span> : null}
        {player.forfeited ? <span data-testid="forfeit-tag" className={`${TAG} bg-stone-500 text-white`}>기권</span> : null}
      </div>
    </div>
  );
}
