import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { BoardView, PaperSafariView, PlayerResultView, Room } from '../../api/types';
import { Confetti } from '../../components/Confetti';
import { FELT_GRID, Felt } from '../../components/Felt';
import { Modal } from '../../components/Modal';
import { RollingNumber } from '../../components/RollingNumber';
import { resultLabel } from '../../lib/format';
import { FooterButton, HeadlineIcon, ReadyChips, useResultSound } from '../../table/gameOver';
import { PlayerBoard, type BoardResult } from './PlayerBoard';
import { resolveBoard } from './score';

type Props = {
  game: PaperSafariView;
  room: Room;
  meId: number;
  nicknameOf: (memberId: number) => string;
  onReady: () => void;
  onClose: () => void;
};

const REVEAL_STEP_MS = 120;

/** 카드를 한 장씩 공개하는 연출. 동작 줄이기면 처음부터 모두 공개한다. */
function useStagedReveal(total: number) {
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(reduced ? total : 0);
  useEffect(() => {
    if (revealed >= total) {
      return undefined;
    }
    const timer = window.setTimeout(() => setRevealed((value) => value + 1), REVEAL_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [revealed, total]);
  return { revealed, done: revealed >= total };
}

function wildNotes(board: BoardView): string[] {
  const { wilds } = resolveBoard(board);
  return [0, 1, 2].map((column) => {
    const copies = wilds.filter((wild) => wild.column === column).map((wild) => wild.value);
    return copies.length === 0 ? '' : `와일드 → ${copies.join(' · ')}`;
  });
}

function totalLabel(values: (number | null)[]): string {
  return values.includes(null) ? '합계 ?점' : `합계 ${values.reduce<number>((sum, value) => sum + (value ?? 0), 0)}점`;
}

function resultFor(board: BoardView, done: boolean, winnerId: number | null, label: (id: number) => string, outcome: PlayerResultView['outcome'] | undefined): BoardResult {
  const values = resolveBoard(board).columns;
  const winner = done && winnerId === board.playerId;
  const suffix = done && outcome ? ` · ${resultLabel(outcome)}` : '';
  return {
    tag: `${label(board.playerId)}${suffix}`,
    total: done ? totalLabel(values) : '합계 …',
    badges: values.map((value) => (done ? String(value ?? '?') : '…')),
    notes: done ? wildNotes(board) : undefined,
    winner,
  };
}

function ScoreRows({ players, done, nicknameOf }: { players: PlayerResultView[]; done: boolean; nicknameOf: (memberId: number) => string }) {
  // 카드가 모두 뒤집히기 전에는 자리 순서로 두고 점수·승패를 숨겨, 점수를 센 뒤에 승자를 보여 준다.
  const rows = done ? [...players].sort((a, b) => a.score - b.score) : players;
  const won = (result: PlayerResultView) => done && result.outcome === 'WIN';
  return (
    <ul className="space-y-2">
      {rows.map((result, index) => (
        <motion.li key={result.playerId} data-testid="score-row" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 * index }}
          className={`flex justify-between rounded-lg px-3 py-2 text-sm ${won(result) ? 'gold-sparkle bg-mustard-300/60' : 'bg-cream-200/60'}`}>
          <span className="font-medium">{nicknameOf(result.playerId)}</span>
          <span>
            {done ? <><RollingNumber value={result.score} />점 · <strong className={won(result) ? 'text-safari-700' : ''}>{resultLabel(result.outcome)}</strong></> : '…'}
          </span>
        </motion.li>
      ))}
    </ul>
  );
}

/** 단판 게임 결과: 카드 순차 공개 → 점수 → 승자 또는 무승부, 그리고 다음 게임 준비. */
export function GameOverPanel({ game, room, meId, nicknameOf, onReady, onClose }: Props) {
  const players = game.lastRoundResult?.players ?? [];
  const boards = game.round.boards;
  // 기권으로 끝나 점수가 없으면 공개할 카드도 없으므로 바로 결과를 보여 준다. 점수 배지·합계도 셀 수 없어 그리지 않는다.
  const forfeited = players.length === 0;
  const total = forfeited ? 0 : boards.reduce((sum, board) => sum + board.slots.length, 0);
  const { revealed, done } = useStagedReveal(total);
  useResultSound(done, players.find((player) => player.playerId === meId)?.outcome);
  const me = room.members.find((member) => member.id === meId);
  const guest = me !== undefined && !me.host;
  const offsets = boards.map((_, index) => boards.slice(0, index).reduce((sum, board) => sum + board.slots.length, 0));
  const staged = (board: BoardView, boardIndex: number): BoardView => ({
    ...board,
    slots: board.slots.map((slot, slotIndex) => (offsets[boardIndex] + slotIndex < revealed || total === 0 ? slot : { ...slot, faceUp: false })),
  });
  const labelOf = (id: number) => `${nicknameOf(id)}${id === meId ? ' (나)' : ''}`;
  const headline = game.winnerId !== null ? `${nicknameOf(game.winnerId)}님 승리!` : '무승부예요';
  const outcomeOf = (id: number) => players.find((player) => player.playerId === id)?.outcome;

  return (
    <>
      <Confetti active={done && game.winnerId !== null} />
      <Modal open title="게임 결과" onClose={onClose} wide padding="roomy" initialFocus="dialog">
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-1">
            {done ? <HeadlineIcon won={game.winnerId !== null} /> : null}
            <h2 className="text-center text-2xl font-black">{done ? headline : '카드를 공개하는 중…'}</h2>
          </div>
          {forfeited ? <p className="text-center text-sm font-bold text-wood-700">상대가 나가서 게임이 끝났어요</p> : null}
          {players.length > 0 ? <ScoreRows players={players} done={done} nicknameOf={labelOf} /> : null}
          <div data-testid="result-boards" className={`${FELT_GRID} ${forfeited ? 'justify-center' : 'sm:grid-cols-2'}`}>
            {boards.map((board, boardIndex) => (
              <Felt key={board.playerId} className="p-3">
                <PlayerBoard board={staged(board, boardIndex)} nickname={labelOf(board.playerId)} active={false} size="sm"
                  result={forfeited ? undefined : resultFor(board, done, game.winnerId, labelOf, outcomeOf(board.playerId))} />
              </Felt>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ReadyChips members={room.members} />
            <div className="ml-auto">
              <FooterButton guest={guest} onReady={onReady} onClose={onClose} />
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
