import type { UnoPlayerView } from '../../api/types';
import { Countdown } from '../../components/Countdown';
import { AlertIcon, StarIcon } from '../../components/icons';
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
};

export function UnoSeat({ player, nickname, active, backWidth, maxBacks, timer, connected, offlineSeconds = 0, catchable }: Props) {
  const backs = Math.min(player.cardCount, maxBacks);
  const label = `${nickname}, 카드 ${player.cardCount}장${player.unoDeclared ? ', 우노' : ''}`;
  return (
    <div role="group" aria-label={label} data-testid="uno-seat" data-player={player.playerId} className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1.5">
        {connected !== undefined ? <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-stone-400'}`} /> : null}
        <span className={`max-w-[5.5rem] truncate rounded-full px-2.5 py-0.5 text-xs font-bold shadow-[0_2px_0_rgb(0_0_0/0.3)] ${active ? 'turn-glow bg-(--turn-tag-bg) text-(--turn-tag-ink)' : 'bg-cream-50 text-wood-800'}`}>{nickname}</span>
        {catchable ? <span data-testid="catch-badge" aria-label="우노를 안 외쳤어요" className="rounded-full bg-red-600 p-0.5 text-white"><AlertIcon className="h-3 w-3" /></span> : null}
        {timer ? <Countdown size="sm" deadline={timer.deadline} serverNow={timer.serverNow} /> : null}
      </div>
      {connected === false ? <span className="felt-ink text-xs">연결 끊김 {offlineSeconds}초</span> : null}
      <div data-uno-zone={`hand:${player.playerId}`} aria-hidden="true" className="flex" style={{ minHeight: backWidth * 1.5 }}>
        {Array.from({ length: backs }, (_, index) => (
          <span key={index} style={{ marginLeft: index === 0 ? 0 : -backWidth * 0.62 }}><UnoCardFace card={null} width={backWidth} decorative /></span>
        ))}
      </div>
      <div className="flex items-center gap-1 text-[11px] font-bold">
        <span data-testid="card-count" className="rounded-full bg-black/35 px-2 py-0.5 text-cream-50">{player.cardCount}장</span>
        {player.unoDeclared ? (
          <span data-testid="uno-badge" className="inline-flex items-center gap-0.5 rounded-full bg-yellow-300 px-2 py-0.5 text-wood-900"><StarIcon className="h-3 w-3" />우노</span>
        ) : null}
      </div>
    </div>
  );
}
