import { motion } from 'motion/react';
import type { PaperSafariView } from '../../api/types';
import { Confetti } from '../../components/Confetti';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/ui';
import { FELT_GRID, Felt } from '../../components/Felt';
import { resultLabel } from '../../lib/format';
import { PlayerBoard } from './PlayerBoard';

type Props = { game: PaperSafariView; meId: number; nicknameOf: (memberId: number) => string; onClose: () => void };

export function GameOverPanel({ game, meId, nicknameOf, onClose }: Props) {
  const won = game.winnerId === meId;
  const standings = Object.entries(game.tokens).sort(([, a], [, b]) => b - a);
  const lastRound = game.lastRoundResult;
  const tokensOf = (memberId: number) => game.tokens[String(memberId)] ?? 0;
  const isWinner = (memberId: number) => String(game.winnerId) === String(memberId);
  return (
    <>
      <Confetti active={game.winnerId !== null} />
    <Modal open title="게임 종료" onClose={onClose} wide padding="roomy">
      <div className="space-y-6">
      <div className="text-center">
        <motion.div initial={{ rotateY: 180, scale: 0.6 }} animate={{ rotateY: 0, scale: 1 }} transition={{ type: 'spring', bounce: 0.4, duration: 0.8 }}
          className="mx-auto flex h-24 w-20 items-center justify-center rounded-2xl bg-cream-50 text-5xl shadow-[0_5px_0_var(--color-cream-300),0_12px_20px_rgb(0_0_0/0.3)]">
          {won ? '🏆' : '🌿'}
        </motion.div>
        <h2 className="mt-3 text-2xl font-black">{game.winnerId !== null ? `${nicknameOf(game.winnerId)}님 승리!` : '게임 종료'}</h2>
        <ul className="my-4 space-y-2 text-sm">
          {standings.map(([memberId, tokens]) => (
            <li key={memberId} className={`flex justify-between rounded-lg px-3 py-1.5 ${isWinner(Number(memberId)) ? 'gold-sparkle bg-mustard-300/60 font-bold' : 'bg-cream-200/60'}`}>
              <span>{nicknameOf(Number(memberId))}</span>
              <span><span aria-hidden="true" className="mr-1 inline-block h-3 w-3 rounded-full bg-mustard-400 ring-1 ring-mustard-600" />토큰 {tokens}개</span>
            </li>
          ))}
        </ul>
      </div>
      {lastRound ? (
        <section className="space-y-6 text-left">
          <h3 className="text-sm font-bold">마지막 라운드 결과</h3>
          <ul className="space-y-2 text-sm">
            {[...lastRound.players].sort((a, b) => a.score - b.score).map((result) => (
              <li key={result.playerId} className="flex justify-between rounded-lg bg-cream-200/60 px-3 py-1.5">
                <span>{nicknameOf(result.playerId)}</span>
                <span>
                  {result.score}점 · <strong className={result.outcome === 'WIN' ? 'text-safari-700' : ''}>{resultLabel(result.outcome)}</strong>
                </span>
              </li>
            ))}
          </ul>
          <div data-testid="result-boards" className={`${FELT_GRID} sm:grid-cols-2`}>
            {game.round.boards.map((board) => (
              <Felt key={board.playerId} className="p-3">
                <PlayerBoard board={board} nickname={nicknameOf(board.playerId)}
                  tokens={tokensOf(board.playerId)} active={false} size="sm" />
              </Felt>
            ))}
          </div>
        </section>
      ) : null}
      <div className="text-center">
        <Button onClick={onClose}>대기실로 돌아가기</Button>
      </div>
      </div>
    </Modal>
    </>
  );
}
