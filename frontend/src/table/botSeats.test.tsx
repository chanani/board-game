import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BoardView, OldMaidPlayerView, Room, UnoSessionView } from '../api/types';
import { OldMaidSeat } from '../games/oldmaid/OldMaidSeat';
import { PlayerBoard } from '../games/papersafari/PlayerBoard';
import { UnoSeat } from '../games/uno/UnoSeat';
import { UnoTable } from '../games/uno/UnoTable';
import { unoSession } from '../games/uno/unoFixtures';
import { setMediaMatches } from '../test/media';

vi.mock('../components/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }));

const unoPlayer = { playerId: 2, cardCount: 3, unoDeclared: false };
const oldPlayer: OldMaidPlayerView = { playerId: 2, cardCount: 3, rank: null, forfeited: false, openingDone: true };
const board: BoardView = {
  playerId: 2,
  slots: [0, 1, 2].flatMap((column) => [0, 1].map((row) => ({ column, row, faceUp: false, known: false, card: null }))),
};

describe('컴퓨터 자리', () => {
  it('우노·도둑잡기 자리와 페이퍼 사파리 판에서 컴퓨터는 로봇 칩(이름 "컴퓨터 · 상")을 달고 연결 점·연결 끊김 문구가 없다', () => {
    const { unmount: a } = render(<UnoSeat player={unoPlayer} nickname="컴퓨터 1" active={false} backWidth={22} maxBacks={4} catchable={false} connected={false} offlineSeconds={80} bot="HARD" />);
    expect(screen.getByRole('img', { name: '컴퓨터 · 상' })).toBeInTheDocument();
    expect(screen.queryByTestId('presence-dot')).toBeNull();
    expect(screen.queryByText(/연결 끊김/)).toBeNull();
    a();

    const { unmount: b } = render(<OldMaidSeat player={oldPlayer} nickname="컴퓨터 1" active={false} targeted={false} backWidth={30} maxBacks={7} liftIndex={null} connected={false} offlineSeconds={80} bot="HARD" />);
    expect(screen.getByRole('img', { name: '컴퓨터 · 상' })).toBeInTheDocument();
    expect(screen.queryByTestId('presence-dot')).toBeNull();
    expect(screen.queryByText(/연결 끊김/)).toBeNull();
    b();

    render(<PlayerBoard board={board} nickname="컴퓨터 1" active={false} connected={false} offlineSeconds={80} bot="HARD" />);
    expect(screen.getByRole('img', { name: '컴퓨터 · 상' })).toBeInTheDocument();
    expect(screen.queryByTestId('presence-dot')).toBeNull();
    expect(screen.queryByText(/연결 끊김/)).toBeNull();
  });

  it('사람 자리는 예전처럼 연결 점과 끊김 문구가 있다', () => {
    render(<UnoSeat player={unoPlayer} nickname="밥" active={false} backWidth={22} maxBacks={4} catchable={false} connected={false} offlineSeconds={80} />);

    expect(screen.getByTestId('presence-dot')).toBeInTheDocument();
    expect(screen.getByText('연결 끊김 80초')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /컴퓨터/ })).toBeNull();
  });

  it('우노 테이블은 방의 컴퓨터 참가자 자리에 칩을 단다', () => {
    setMediaMatches(true);
    const room: Room = {
      code: 'UNO123', name: '우노 방', gameType: 'UNO', gameTypeName: '우노', status: 'PLAYING', hostId: 1, maxPlayers: 5, locked: false, spectators: [], theme: 'WOOD', practice: true,
      members: [
        { id: 1, nickname: '앨리스', host: true, connected: true, offlineSeconds: 0, ready: false },
        { id: 2, nickname: '컴퓨터 1', host: false, connected: false, offlineSeconds: 0, ready: true, bot: true, difficulty: 'EASY' },
      ],
    };
    const view: UnoSessionView = unoSession({ players: [{ playerId: 1, cardCount: 3, unoDeclared: false }, { playerId: 2, cardCount: 3, unoDeclared: false }] });
    render(<UnoTable view={view} room={room} meId={1} log={[]} receivedAt={0} now={0} errorSeq={0} nicknameOf={(id) => (id === 1 ? '앨리스' : '컴퓨터 1')}
      send={vi.fn()} onCloseGameOver={vi.fn()} onReadyNext={vi.fn()} />);

    const seat = screen.getByRole('group', { name: /컴퓨터 1/ });
    expect(within(seat).getByRole('img', { name: '컴퓨터 · 하' })).toBeInTheDocument();
    expect(screen.queryByText(/연결 끊김/)).toBeNull();
  });

  it('칩은 이름표 줄 안에 있어 자리 높이를 늘리지 않는다', () => {
    render(<UnoSeat player={unoPlayer} nickname="컴퓨터 1" active={false} backWidth={22} maxBacks={4} catchable={false} connected bot="MEDIUM" />);

    const chip = screen.getByRole('img', { name: '컴퓨터 · 중' });
    expect(chip.parentElement).toBe(screen.getByTestId('seat-tag').parentElement);
  });
});
