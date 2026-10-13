import type { FruitStackPlayerView } from '../../api/types';
import { MemberAvatar } from '../../components/Avatar';
import { EmoteBubble } from '../../emote/EmoteBubble';
import { BoardCanvas } from './BoardCanvas';
import type { BoardFrame } from './engine/constants';
import { formatScore } from './texts';

type Props = {
  width: number;
  player: FruitStackPlayerView;
  nickname: string;
  avatar?: string | null;
  getFrame: () => BoardFrame | null;
  /** 판 신호를 한 번이라도 받았는지(내 판이면 늘 true). */
  hasFrame: boolean;
  danger: boolean;
  /** 지켜보기 모드의 큰 판: 매 프레임 그린다. */
  large?: boolean;
  connected?: boolean;
  offlineSeconds?: number;
};

/** 남의 판(작은 판, 지켜보기 모드의 큰 판): 판 + 이름·점수 줄. 차례가 없어 강조 테두리·사람별 카운트다운은 없다. */
export function MiniBoard({ width, player, nickname, avatar, getFrame, hasFrame, danger, large = false, connected, offlineSeconds }: Props) {
  const { playerId, score, state } = player;
  const out = state === 'OUT';
  const alarmed = danger && state === 'PLAYING';
  const points = `${formatScore(score)}점`;
  const label = `${nickname}님의 판, ${points}${alarmed ? ', 위험' : ''}${out ? ', 탈락' : ''}`;
  const small = width < 72;
  return (
    <div data-testid="mini-board" data-player={playerId} data-state={state} data-danger={alarmed ? 'true' : undefined} data-large={large ? 'true' : undefined}
      className="relative shrink-0" style={{ width }}>
      <div data-testid="board-box" className={`relative overflow-hidden rounded-lg ring-2 ${alarmed ? 'ring-red-500' : 'ring-white/25'}`}
        style={{ width, height: width * 1.5 }}>
        <BoardCanvas width={width} getFrame={getFrame} dimmed={out} everyOtherFrame={!large} label={label} />
        {hasFrame ? null : <span className="pointer-events-none absolute inset-0 text-cream-50/75 flex items-center justify-center text-center text-[10px] font-bold">불러오는 중…</span>}
        {out ? (
          <span data-testid="out-badge" className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-stone-700 font-black text-white shadow-[0_2px_0_rgb(0_0_0/0.3)] ${small ? 'px-1.5 py-0.5 text-[10px]' : 'px-3 py-1 text-sm'}`}>탈락</span>
        ) : null}
      </div>
      <EmoteBubble memberId={playerId} className="absolute -right-2 -top-4" />
      {small ? (
        // 좁은 판은 이름과 점수를 한 줄에 둘 수 없어 두 줄로 쓴다(높이는 같은 22px).
        <div className="flex h-[22px] flex-col justify-center text-center text-[10px] font-bold leading-[11px]">
          <span className={`truncate ${connected === false ? 'opacity-75' : ''}`}>{connected === false ? `끊김 ${offlineSeconds ?? 0}초` : nickname}</span>
          <span className="truncate tabular-nums">{points}</span>
        </div>
      ) : (
        <div className="flex h-[22px] items-center gap-1 text-[11px] font-bold leading-none">
          <MemberAvatar memberId={playerId} avatar={avatar} size={16} />
          {connected === false
            ? <span className="min-w-0 flex-1 truncate opacity-75">연결 끊김 {offlineSeconds ?? 0}초</span>
            : <span className="min-w-0 flex-1 truncate">{nickname}</span>}
          <span className="shrink-0 tabular-nums">{points}</span>
        </div>
      )}
    </div>
  );
}
