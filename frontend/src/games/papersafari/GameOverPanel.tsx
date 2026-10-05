import type { PaperSafariView } from '../../api/types';
import { Button, Panel } from '../../components/ui';
import { resultLabel } from '../../lib/format';
import { PlayerBoard } from './PlayerBoard';

type Props = { game: PaperSafariView; meId: number; nicknameOf: (memberId: number) => string; onClose: () => void };

export function GameOverPanel({ game, meId, nicknameOf, onClose }: Props) {
  const won = game.winnerId === meId;
  const standings = Object.entries(game.tokens).sort(([, a], [, b]) => b - a);
  const lastRound = game.lastRoundResult;
  const tokensOf = (memberId: number) => game.tokens[String(memberId)] ?? 0;
  return (
    <Panel className="mx-auto max-w-2xl text-center">
      <p className="text-4xl">{won ? '🏆' : '🌿'}</p>
      <h2 className="mt-2 text-2xl font-bold">{game.winnerId !== null ? `${nicknameOf(game.winnerId)}님 승리!` : '게임 종료'}</h2>
      <ul className="my-4 space-y-1 text-sm">
        {standings.map(([memberId, tokens]) => (
          <li key={memberId} className="flex justify-between rounded-lg bg-stone-50 px-3 py-1.5">
            <span>{nicknameOf(Number(memberId))}</span>
            <span>토큰 {tokens}개</span>
          </li>
        ))}
      </ul>
      {lastRound ? (
        <section className="mb-4 text-left">
          <h3 className="mb-2 text-sm font-bold">마지막 라운드 결과</h3>
          <ul className="mb-3 space-y-1 text-sm">
            {[...lastRound.players].sort((a, b) => a.score - b.score).map((result) => (
              <li key={result.playerId} className="flex justify-between rounded-lg bg-stone-50 px-3 py-1.5">
                <span>{nicknameOf(result.playerId)}</span>
                <span>
                  {result.score}점 · <strong className={result.outcome === 'WIN' ? 'text-safari-700' : ''}>{resultLabel(result.outcome)}</strong>
                </span>
              </li>
            ))}
          </ul>
          <div className="grid gap-3 sm:grid-cols-2">
            {game.round.boards.map((board) => (
              <PlayerBoard key={board.playerId} board={board} nickname={nicknameOf(board.playerId)}
                tokens={tokensOf(board.playerId)} active={false} size="sm" />
            ))}
          </div>
        </section>
      ) : null}
      <Button onClick={onClose}>대기실로 돌아가기</Button>
    </Panel>
  );
}
