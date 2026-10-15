import type { FruitStackEndReason, FruitStackStanding, FruitStackView, Room } from '../../api/types';
import { AvatarFace } from '../../components/Avatar';
import { Confetti } from '../../components/Confetti';
import { MedalIcon } from '../../components/icons';
import { Modal } from '../../components/Modal';
import { roomAvatarOf } from '../../lib/avatars';
import { FooterButton, HeadlineIcon, ReadyChips } from '../../table/gameOver';
import type { Nickname } from '../gameModule';
import { SoloGameOverPanel } from './SoloGameOverPanel';
import { formatScore } from './texts';
import type { SoloBest } from './useSoloBest';

/** best: 혼자 하기에서 이번 판 전의 내 최고 점수(모르면 null). 대결에서는 쓰지 않는다. */
type Props = { game: FruitStackView; room: Room; meId: number; nicknameOf: Nickname; onReady: () => void; onClose: () => void; best?: SoloBest | null };

const REASON_LINES: Record<FruitStackEndReason, string | null> = {
  ALL_OUT: null,
  TIME_UP: '10분이 지나 지금 점수로 끝났어요',
  FORFEIT: '상대가 나가서 게임이 끝났어요',
  DECIDED: '마지막 한 사람의 점수가 가장 높아 바로 끝났어요',
  ABANDONED: null,
};

function Mark({ standing }: { standing: FruitStackStanding }) {
  if (standing.state === 'FORFEITED') {
    return <span className="text-xs font-bold text-stone-500">기권</span>;
  }
  if (standing.outcome === 'WIN') {
    return <span className="inline-flex items-center"><MedalIcon className="h-5 w-5" /><span className="sr-only">승리</span></span>;
  }
  return standing.outcome === 'DRAW' ? <span className="text-xs font-bold text-wood-700">무승부</span> : null;
}

function StandingRow({ standing, name, room, mine }: { standing: FruitStackStanding; name: string; room: Room; mine: boolean }) {
  return (
    <li data-testid="standing-row" data-player={standing.playerId} data-me={mine ? 'true' : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${mine ? 'bg-mustard-300/50 ring-2 ring-mustard-300' : 'bg-cream-200/60'} ${standing.state === 'FORFEITED' ? 'opacity-60' : ''}`}>
      <span className="w-10 shrink-0 font-black tabular-nums">{standing.rank}등</span>
      <AvatarFace avatar={roomAvatarOf(room, standing.playerId)} size={24} />
      <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
      <span className="shrink-0 font-black tabular-nums">{formatScore(standing.score)}점</span>
      <span className="flex w-12 shrink-0 justify-end"><Mark standing={standing} /></span>
    </li>
  );
}

function headlineOf(game: FruitStackView, nicknameOf: Nickname, won: boolean): string {
  if (won) {
    return '내가 이겼어요!';
  }
  return game.winnerId === null ? '비겼어요!' : `${nicknameOf(game.winnerId)}님이 이겼어요!`;
}

/** 게임 결과: 머리말, 끝난 이유, 순위 표, 다음 게임 준비(스펙 6.9). */
export function FruitStackGameOverPanel({ game, room, meId, nicknameOf, onReady, onClose, best = null }: Props) {
  // 혼자 하기(스펙 12장)는 순위·승패 대신 이번 점수와 최고 점수.
  if (game.participantIds.length === 1) {
    return <SoloGameOverPanel game={game} room={room} meId={meId} nicknameOf={nicknameOf} onReady={onReady} onClose={onClose} best={best} />;
  }
  const standings = game.result?.standings ?? [];
  const won = standings.some((standing) => standing.playerId === meId && standing.outcome === 'WIN');
  const reasonLine = game.result ? REASON_LINES[game.result.reason] : null;
  return (
    <>
      <Confetti active={won} />
      <Modal open title="게임 결과" onClose={onClose} wide padding="roomy" initialFocus="dialog">
        <div data-testid="fruit-game-over" className="space-y-6">
          <div className="flex flex-col items-center gap-1">
            <HeadlineIcon won={won} />
            <h2 className="text-center text-2xl font-black">{headlineOf(game, nicknameOf, won)}</h2>
            {reasonLine ? <p data-testid="end-reason" className="text-center text-sm font-bold text-wood-700">{reasonLine}</p> : null}
          </div>
          <ol aria-label="순위" className="space-y-2">
            {standings.map((standing) => (
              <StandingRow key={standing.playerId} standing={standing} name={nicknameOf(standing.playerId)} room={room} mine={standing.playerId === meId} />
            ))}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ReadyChips members={room.members} />
            <div className="ml-auto">
              <FooterButton guest={room.hostId !== meId} onReady={onReady} onClose={onClose} />
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
