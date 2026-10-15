import type { FruitStackEndReason, FruitStackView, Room } from '../../api/types';
import { Confetti } from '../../components/Confetti';
import { Modal } from '../../components/Modal';
import { FooterButton, HeadlineIcon, ReadyChips } from '../../table/gameOver';
import type { Nickname } from '../gameModule';
import { formatScore } from './texts';
import type { SoloBest } from './useSoloBest';

type Props = { game: FruitStackView; room: Room; meId: number; nicknameOf: Nickname; onReady: () => void; onClose: () => void; best: SoloBest | null };

/** 끝난 이유를 머리말 아래 한 줄로(판이 가득 찬 보통 끝은 머리말이 말한다). */
const REASON_LINES: Partial<Record<FruitStackEndReason, string>> = {
  ABANDONED: '오래 움직임이 없어 지금 점수로 끝났어요',
  FORFEIT: '게임 중에 나가서 그때까지의 점수로 끝났어요',
};

type Verdict = { headline: string; best: number | null; isNew: boolean; gap: string | null };

/**
 * 이번 점수와 이번 판 전 최고 점수로 정한 머리말·최고 점수·차이. 이번 판 전 값을 모르면(못 불러옴, 끝난 뒤 처음 불러옴)
 * 새 기록인지 말하지 않는다. 같은 점수는 새 기록이 아니다(서버도 더 높을 때만 바꾼다).
 */
function verdictOf(score: number, reason: FruitStackEndReason, best: SoloBest | null): Verdict {
  const plain = reason === 'ALL_OUT' ? '판이 가득 찼어요!' : '게임이 끝났어요';
  if (best === null) {
    return { headline: plain, best: null, isNew: false, gap: null };
  }
  const { previous, fresh } = best;
  const top = Math.max(previous ?? 0, score);
  if (!fresh) {
    return { headline: plain, best: top, isNew: false, gap: null };
  }
  if (previous === null) {
    return { headline: '첫 기록이에요!', best: score, isNew: true, gap: null };
  }
  if (score > previous) {
    return { headline: '새 최고 점수예요!', best: score, isNew: true, gap: null };
  }
  const gap = score === previous ? '최고 점수와 같아요' : `최고 점수까지 ${formatScore(previous - score)}점 남았어요`;
  return { headline: plain, best: previous, isNew: false, gap };
}

/** 끝난 점수가 새 최고 점수(첫 기록 포함)인지. 이번 판 전 값을 모르면 false. */
export function isNewSoloBest(score: number, best: SoloBest | null): boolean {
  return verdictOf(score, 'ALL_OUT', best).isNew;
}

function Tile({ testId, label, value, highlight = false }: { testId: string; label: string; value: number; highlight?: boolean }) {
  return (
    <div data-testid={testId} data-new={highlight ? 'true' : undefined}
      className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-3 sm:px-4 ${highlight ? 'bg-mustard-300/60 ring-2 ring-mustard-400' : 'bg-cream-200/70'}`}>
      <span className="text-xs font-bold text-wood-700">{label}</span>
      <span className="whitespace-nowrap text-2xl font-black tabular-nums text-wood-900 sm:text-3xl">{formatScore(value)}<span className="ml-0.5 text-sm sm:text-base">점</span></span>
    </div>
  );
}

/** 혼자 하기 결과(스펙 12장): 머리말, 이번 점수, 최고 점수(새 기록이면 강조), 대기실로. 지켜본 사람에게는 점수만. */
export function SoloGameOverPanel({ game, room, meId, nicknameOf, onReady, onClose, best }: Props) {
  const player = game.participantIds[0];
  const mine = player === meId;
  const standing = game.result?.standings[0];
  const score = standing?.score ?? game.players[0]?.score ?? 0;
  const reason = game.result?.reason ?? 'ALL_OUT';
  const verdict = verdictOf(score, reason, mine ? best : null);
  const headline = mine ? verdict.headline : `${nicknameOf(player)}님의 ${reason === 'ALL_OUT' ? '판이 가득 찼어요!' : '게임이 끝났어요'}`;
  const reasonLine = REASON_LINES[reason] ?? null;
  return (
    <>
      <Confetti active={mine && verdict.isNew} />
      <Modal open title="게임 결과" onClose={onClose} padding="roomy" initialFocus="dialog">
        <div data-testid="solo-game-over" className="space-y-6">
          <div className="flex flex-col items-center gap-1">
            <HeadlineIcon won={mine && verdict.isNew} />
            <h2 className="text-center text-2xl font-black">{headline}</h2>
            {reasonLine ? <p data-testid="end-reason" className="text-center text-sm font-bold text-wood-700">{reasonLine}</p> : null}
          </div>
          <div className="flex gap-3">
            <Tile testId="solo-score" label={mine ? '이번 점수' : '점수'} value={score} />
            {verdict.best === null ? null : <Tile testId="solo-best-score" label="최고 점수" value={verdict.best} highlight={verdict.isNew} />}
          </div>
          {verdict.isNew && best?.previous !== null && best?.previous !== undefined ? (
            <p data-testid="solo-previous" className="text-center text-sm font-bold text-wood-700">이전 최고 {formatScore(best.previous)}점</p>
          ) : null}
          {verdict.gap ? <p data-testid="solo-gap" className="text-center text-sm font-bold text-wood-700">{verdict.gap}</p> : null}
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
