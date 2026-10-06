import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { BoardView, PaperSafariSessionView } from '../../api/types';
import { Felt } from '../../components/Felt';
import { RollingNumber } from '../../components/RollingNumber';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/ui';
import { useSound } from '../../lib/sound';
import { resultLabel } from '../../lib/format';
import { PlayerBoard } from './PlayerBoard';
import { cardAt, columnScore } from './score';

type Props = {
  view: PaperSafariSessionView;
  meId: number;
  nicknameOf: (memberId: number) => string;
  onReady: () => void;
};

const REVEAL_STEP_MS = 120;
const SLOTS_PER_BOARD = 6;

export function RoundResultModal({ view, meId, nicknameOf, onReady }: Props) {
  const game = view.game;
  const players = game.lastRoundResult?.players ?? [];
  const seated = game.round.boards.some((board) => board.playerId === meId);
  const ready = view.readyPlayerIds.includes(meId);
  const reduced = useReducedMotion();
  const total = game.round.boards.length * SLOTS_PER_BOARD;
  const [revealed, setRevealed] = useState(reduced ? total : 0);

  useEffect(() => {
    if (revealed >= total) {
      return undefined;
    }
    const timer = window.setTimeout(() => setRevealed((value) => value + 1), REVEAL_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [revealed, total]);

  const done = revealed >= total;
  const { play } = useSound();
  const playRef = useRef(play);
  playRef.current = play;
  const soundedRound = useRef<number | null>(null);
  const myOutcome = players.find((player) => player.playerId === meId)?.outcome;
  const roundNumber = game.roundNumber;
  useEffect(() => {
    if (!done || !myOutcome || soundedRound.current === roundNumber) {
      return;
    }
    soundedRound.current = roundNumber;
    playRef.current(myOutcome === 'WIN' ? 'roundWin' : 'roundLose');
  }, [done, myOutcome, roundNumber]);
  // 카드가 모두 뒤집히기 전에는 자리 순서로 두고 승패·리본을 숨겨, 점수를 센 뒤에 승자를 보여 준다.
  const results = done ? [...players].sort((a, b) => a.score - b.score) : players;
  const won = (outcome: string) => done && outcome === 'WIN';
  const staged = (board: BoardView, boardIndex: number): BoardView => ({
    ...board,
    slots: board.slots.map((slot, slotIndex) => (boardIndex * SLOTS_PER_BOARD + slotIndex < revealed ? slot : { ...slot, faceUp: false })),
  });

  return (
    <Modal open title={`${game.roundNumber}라운드 결과`} wide padding="roomy">
      <div className="space-y-6">
      <h2 className="text-xl font-black">{game.roundNumber}라운드 결과</h2>
      <ul className="space-y-2">
        {results.map((result, index) => (
          <motion.li key={result.playerId} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 * index }}
            className={`flex justify-between rounded-lg px-3 py-2 text-sm ${won(result.outcome) ? 'bg-mustard-300/60' : 'bg-cream-200/60'}`}>
            <span className="font-medium">{won(result.outcome) ? '🎀 ' : ''}{nicknameOf(result.playerId)}</span>
            <span>
              {done ? <><RollingNumber value={result.score} />점 · <strong className={won(result.outcome) ? 'text-safari-700' : ''}>{resultLabel(result.outcome)}</strong></> : '…'}
            </span>
          </motion.li>
        ))}
      </ul>
      <div className="grid gap-4 sm:grid-cols-2">
        {game.round.boards.map((board, boardIndex) => (
          <Felt key={board.playerId} className="p-3">
            <PlayerBoard board={staged(board, boardIndex)} nickname={nicknameOf(board.playerId)} tokens={game.tokens[String(board.playerId)] ?? 0} active={false} size="sm" />
            <p className="mt-1 text-center text-xs text-cream-50">
              열 점수{' '}
              {!done ? '…' : [0, 1, 2]
                .map((column) => {
                  const top = cardAt(board, column, 0);
                  const bottom = cardAt(board, column, 1);
                  return top && bottom ? columnScore(top, bottom) : '?';
                })
                .join(' + ')}
            </p>
          </Felt>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-wood-700">
          준비: {view.readyPlayerIds.map(nicknameOf).join(', ') || '아직 없음'}
        </span>
        {game.status === 'ROUND_OVER' && seated ? (
          <Button onClick={onReady} disabled={ready}>{ready ? '다른 사람을 기다리는 중…' : '다음 라운드 준비'}</Button>
        ) : null}
      </div>
      </div>
    </Modal>
  );
}
