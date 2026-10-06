import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { BoardView, PaperSafariView, PlayerResultView, Room, RoomMember } from '../../api/types';
import { Confetti } from '../../components/Confetti';
import { FELT_GRID, Felt } from '../../components/Felt';
import { Modal } from '../../components/Modal';
import { RollingNumber } from '../../components/RollingNumber';
import { useSound } from '../../lib/sound';
import { resultLabel } from '../../lib/format';
import { PlayerBoard } from './PlayerBoard';
import { cardAt, columnScore } from './score';

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

/** 공개가 끝나면 내 결과 효과음을 한 번만 울린다. */
function useResultSound(done: boolean, outcome: PlayerResultView['outcome'] | undefined) {
  const { play } = useSound();
  const playRef = useRef(play);
  playRef.current = play;
  const sounded = useRef(false);
  useEffect(() => {
    if (!done || !outcome || sounded.current) {
      return;
    }
    sounded.current = true;
    playRef.current(outcome === 'WIN' ? 'roundWin' : 'roundLose');
  }, [done, outcome]);
}

function columnScores(board: BoardView): string {
  return [0, 1, 2]
    .map((column) => {
      const top = cardAt(board, column, 0);
      const bottom = cardAt(board, column, 1);
      return top && bottom ? columnScore(top, bottom) : '?';
    })
    .join(' + ');
}

function ScoreRows({ players, done, nicknameOf }: { players: PlayerResultView[]; done: boolean; nicknameOf: Props['nicknameOf'] }) {
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

function ReadyChips({ members }: { members: RoomMember[] }) {
  const guests = members.filter((member) => !member.host);
  if (guests.length === 0) {
    return null;
  }
  return (
    <ul data-testid="ready-chips" aria-label="다음 게임 준비" className="flex flex-wrap gap-2">
      {guests.map((member) => (
        <li key={member.id} data-testid="ready-chip"
          className={`rounded-full border-2 px-3 py-1 text-sm font-bold ${member.ready ? 'border-safari-500 text-safari-700' : 'border-cream-300 text-wood-700'}`}>
          {member.ready ? '✔ ' : ''}{member.nickname}
        </li>
      ))}
    </ul>
  );
}

function FooterButton({ guest, onReady, onClose }: { guest: boolean; onReady: () => void; onClose: () => void }) {
  if (guest) {
    return (
      <button type="button" onClick={onReady}
        className="press-3d rounded-full bg-mustard-400 px-5 py-2 text-sm font-bold text-wood-800 shadow-[0_4px_0_var(--color-mustard-600),0_8px_14px_rgb(0_0_0/0.3)] hover:bg-mustard-300">
        다음 게임 준비
      </button>
    );
  }
  return (
    <button type="button" onClick={onClose}
      className="press-3d rounded-full bg-cream-50 px-5 py-2 text-sm font-bold text-wood-800 shadow-[0_4px_0_var(--color-cream-300),0_8px_14px_rgb(0_0_0/0.25)] hover:bg-white">
      대기실로
    </button>
  );
}

/** 단판 게임 결과: 카드 순차 공개 → 점수 → 승자 또는 무승부, 그리고 다음 게임 준비. */
export function GameOverPanel({ game, room, meId, nicknameOf, onReady, onClose }: Props) {
  const players = game.lastRoundResult?.players ?? [];
  const boards = game.round.boards;
  // 기권으로 끝나 점수가 없으면 공개할 카드도 없으므로 바로 결과를 보여 준다.
  const total = players.length === 0 ? 0 : boards.reduce((sum, board) => sum + board.slots.length, 0);
  const { revealed, done } = useStagedReveal(total);
  useResultSound(done, players.find((player) => player.playerId === meId)?.outcome);
  const me = room.members.find((member) => member.id === meId);
  const guest = me !== undefined && !me.host;
  const offsets = boards.map((_, index) => boards.slice(0, index).reduce((sum, board) => sum + board.slots.length, 0));
  const staged = (board: BoardView, boardIndex: number): BoardView => ({
    ...board,
    slots: board.slots.map((slot, slotIndex) => (offsets[boardIndex] + slotIndex < revealed || total === 0 ? slot : { ...slot, faceUp: false })),
  });
  const headline = game.winnerId !== null ? `🏆 ${nicknameOf(game.winnerId)}님 승리!` : '무승부예요';

  return (
    <>
      <Confetti active={done && game.winnerId !== null} />
      <Modal open title="게임 결과" onClose={onClose} wide padding="roomy">
        <div className="space-y-6">
          <h2 className="text-center text-2xl font-black">{done ? headline : '카드를 공개하는 중…'}</h2>
          {players.length > 0 ? <ScoreRows players={players} done={done} nicknameOf={nicknameOf} /> : null}
          <div data-testid="result-boards" className={`${FELT_GRID} sm:grid-cols-2`}>
            {boards.map((board, boardIndex) => (
              <Felt key={board.playerId} className="p-3">
                <PlayerBoard board={staged(board, boardIndex)} nickname={nicknameOf(board.playerId)} active={false} size="sm" />
                <p className="mt-1 text-center text-xs text-cream-50">열 점수 {done ? columnScores(board) : '…'}</p>
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
