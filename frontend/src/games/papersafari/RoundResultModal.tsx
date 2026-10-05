import type { PaperSafariSessionView } from '../../api/types';
import { Button } from '../../components/ui';
import { resultLabel } from '../../lib/format';
import { PlayerBoard } from './PlayerBoard';
import { cardAt, columnScore } from './score';

type Props = {
  view: PaperSafariSessionView;
  meId: number;
  nicknameOf: (memberId: number) => string;
  onReady: () => void;
};

export function RoundResultModal({ view, meId, nicknameOf, onReady }: Props) {
  const game = view.game;
  const results = [...(game.lastRoundResult?.players ?? [])].sort((a, b) => a.score - b.score);
  const seated = game.round.boards.some((board) => board.playerId === meId);
  const ready = view.readyPlayerIds.includes(meId);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold">{game.roundNumber}라운드 결과</h2>
        <ul className="mb-4 space-y-1">
          {results.map((result) => (
            <li key={result.playerId} className="flex justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm">
              <span className="font-medium">{nicknameOf(result.playerId)}</span>
              <span>
                {result.score}점 · <strong className={result.outcome === 'WIN' ? 'text-safari-700' : ''}>{resultLabel(result.outcome)}</strong>
              </span>
            </li>
          ))}
        </ul>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          {game.round.boards.map((board) => (
            <div key={board.playerId}>
              <PlayerBoard board={board} nickname={nicknameOf(board.playerId)} tokens={game.tokens[String(board.playerId)] ?? 0} active={false} size="sm" />
              <p className="mt-1 text-center text-xs text-stone-500">
                열 점수{' '}
                {[0, 1, 2]
                  .map((column) => {
                    const top = cardAt(board, column, 0);
                    const bottom = cardAt(board, column, 1);
                    return top && bottom ? columnScore(top, bottom) : '?';
                  })
                  .join(' + ')}
              </p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-500">
            준비: {view.readyPlayerIds.map(nicknameOf).join(', ') || '아직 없음'}
          </span>
          {game.status === 'ROUND_OVER' && seated ? (
            <Button onClick={onReady} disabled={ready}>{ready ? '다른 사람을 기다리는 중…' : '다음 라운드 준비'}</Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
