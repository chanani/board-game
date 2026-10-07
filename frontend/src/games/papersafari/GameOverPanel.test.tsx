import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PaperSafariView, Room } from '../../api/types';
import { SILENT_SOUND, SoundContext, type SoundApi } from '../../lib/sound';
import { GameOverPanel } from './GameOverPanel';

const names: Record<number, string> = { 1: '앨리스', 2: '밥', 3: '캐롤' };
const nicknameOf = (id: number) => names[id];
const slots = [0, 1, 2].flatMap((column) => [0, 1].map((row) => ({ column, row, faceUp: true, known: false, card: { kind: 'NUMBER' as const, value: column + 1 } })));

const pairs = (rows: [number, number][]) => rows.flatMap(([top, bottom], column) => [top, bottom].map((value, row) => ({ column, row, faceUp: true, known: false, card: { kind: 'NUMBER' as const, value } })));
// 앨리스: 5 + 0 + 9 = 14, 밥: 3 + 5 + 7 = 15
const knownBoards = [{ playerId: 1, slots: pairs([[2, 3], [4, 4], [4, 5]]) }, { playerId: 2, slots: pairs([[1, 2], [2, 3], [3, 4]]) }];

const game: PaperSafariView = {
  viewerId: 1, status: 'GAME_OVER', roundNumber: 1, winnerId: 1,
  lastRoundResult: { players: [{ playerId: 2, score: 25, outcome: 'LOSE' }, { playerId: 1, score: 12, outcome: 'WIN' }] },
  round: { phase: 'ROUND_OVER', currentPlayerId: 1, deckSize: 10, discardTop: null, held: null,
    boards: [{ playerId: 1, slots }, { playerId: 2, slots }] },
};
const tie: PaperSafariView = {
  ...game, winnerId: null,
  lastRoundResult: { players: [{ playerId: 1, score: 9, outcome: 'DRAW' }, { playerId: 2, score: 9, outcome: 'DRAW' }] },
};
const room: Room = {
  code: 'ABC234', name: '앨리스의 방', gameType: 'PAPER_SAFARI', gameTypeName: '페이퍼 사파리', status: 'WAITING',
  hostId: 1, maxPlayers: 4, locked: false, spectators: [], theme: 'WOOD',
  members: [
    { id: 1, nickname: '앨리스', host: true, connected: true, offlineSeconds: 0, ready: false },
    { id: 2, nickname: '밥', host: false, connected: true, offlineSeconds: 0, ready: false },
    { id: 3, nickname: '캐롤', host: false, connected: true, offlineSeconds: 0, ready: true },
  ],
};

type Options = { view?: PaperSafariView; meId?: number; onReady?: () => void; onClose?: () => void; targetRoom?: Room };

function renderPanel({ view = game, meId = 1, onReady = vi.fn(), onClose = vi.fn(), targetRoom = room }: Options = {}) {
  return render(<GameOverPanel game={view} room={targetRoom} meId={meId} nicknameOf={nicknameOf} onReady={onReady} onClose={onClose} />);
}

function revealAll() {
  for (let step = 0; step < 12; step += 1) {
    act(() => { vi.advanceTimersByTime(120); });
  }
}

afterEach(() => vi.useRealTimers());

describe('GameOverPanel 단판 결과', () => {
  it('카드를 모두 공개한 뒤에 낮은 점수부터 점수와 승자를 보여준다', () => {
    vi.useFakeTimers();
    renderPanel();
    const dialog = screen.getByRole('dialog', { name: '게임 결과' });

    expect(dialog).not.toHaveTextContent('12점');
    expect(dialog).not.toHaveTextContent('승리!');

    revealAll();

    expect(within(dialog).getByRole('heading', { name: '앨리스님 승리!' })).toBeInTheDocument();
    const rows = within(dialog).getAllByTestId('score-row');
    expect(rows.map((row) => row.textContent)).toEqual([expect.stringContaining('앨리스'), expect.stringContaining('밥')]);
    expect(rows[0]).toHaveTextContent('12점');
    expect(rows[1]).toHaveTextContent('25점');
  });

  it('최저점이 동점이면 무승부예요를 보여준다', () => {
    vi.useFakeTimers();
    renderPanel({ view: tie });
    revealAll();

    const dialog = screen.getByRole('dialog', { name: '게임 결과' });
    expect(within(dialog).getByRole('heading', { name: '무승부예요' })).toBeInTheDocument();
    expect(dialog).not.toHaveTextContent('승리!');
  });

  it('트로피 이모지 대신 메달 아이콘을 쓰고, 내 이름에는 (나)를 붙인다', () => {
    vi.useFakeTimers();
    renderPanel();
    revealAll();

    const dialog = screen.getByRole('dialog', { name: '게임 결과' });
    expect(dialog).not.toHaveTextContent('🏆');
    expect(dialog.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(within(dialog).getAllByTestId('score-row')[0]).toHaveTextContent('앨리스 (나)');
    expect(within(dialog).getAllByTestId('score-row')[1]).not.toHaveTextContent('(나)');
    expect(within(screen.getByTestId('board-1')).getByText(/앨리스 \(나\)/)).toBeInTheDocument();
  });

  it('승자 판만 금색으로 강조하고 열 점수 배지와 합계는 공개 뒤에 보인다', () => {
    vi.useFakeTimers();
    renderPanel();
    const before = within(screen.getByTestId('board-1')).getAllByTestId('column-badge');
    expect(before.map((badge) => badge.textContent)).toEqual(['…', '…', '…']);
    expect(within(screen.getByTestId('board-1')).getByTestId('board-total')).toHaveTextContent('합계 …');
    expect(screen.getByTestId('board-1')).toHaveAttribute('data-winner', 'false');

    revealAll();

    expect(screen.getByTestId('board-1')).toHaveAttribute('data-winner', 'true');
    expect(screen.getByTestId('board-1')).toHaveClass('ring-mustard-400');
    expect(screen.getByTestId('board-2')).toHaveAttribute('data-winner', 'false');
    expect(screen.getByTestId('board-1')).toHaveTextContent('앨리스 (나) · 승');
    expect(within(screen.getByTestId('board-1')).getByTestId('winner-crown').tagName).toBe('svg');
    expect(within(screen.getByTestId('board-2')).queryByTestId('winner-crown')).not.toBeInTheDocument();
    const badges = within(screen.getByTestId('board-1')).getAllByTestId('column-badge');
    expect(badges).toHaveLength(3);
    expect(within(screen.getByTestId('board-1')).getByTestId('board-total')).toHaveTextContent(/^합계 \d+점$/);
  });

  it('열 점수 배지는 정확한 값이고 0점 열만 초록이며 합계는 열 점수의 합이다', () => {
    vi.useFakeTimers();
    const view: PaperSafariView = { ...game, round: { ...game.round, boards: knownBoards } };
    renderPanel({ view });
    revealAll();

    const mine = within(screen.getByTestId('board-1'));
    const badges = mine.getAllByTestId('column-badge');
    expect(badges.map((badge) => badge.textContent)).toEqual(['5', '0', '9']);
    expect(badges[1]).toHaveClass('bg-green-200', 'text-green-800');
    expect(badges[0]).not.toHaveClass('bg-green-200');
    expect(badges[2]).not.toHaveClass('bg-green-200');
    expect(mine.getByTestId('board-total')).toHaveTextContent('합계 14점');
    const others = within(screen.getByTestId('board-2'));
    expect(others.getAllByTestId('column-badge').map((badge) => badge.textContent)).toEqual(['3', '5', '7']);
    expect(others.getByTestId('board-total')).toHaveTextContent('합계 15점');
  });

  it('와일드가 복사한 값을 열 배지 아래 작은 글씨로 보여 주고, 점수는 공식 와일드 규칙을 따른다', () => {
    vi.useFakeTimers();
    const W = { kind: 'WILD' as const, value: 0 };
    const num = (value: number) => ({ kind: 'NUMBER' as const, value });
    // 윗줄 [2, W, 8], 아랫줄 [5, 8, 5] → 와일드는 8을 복사해 짝과 맞춘다: 7, 0, 13 = 20
    const cards = [[num(2), num(5)], [W, num(8)], [num(8), num(5)]];
    const wildBoard = { playerId: 1, slots: cards.flatMap((column, c) => column.map((card, row) => ({ column: c, row, faceUp: true, known: false, card }))) };
    const view: PaperSafariView = { ...game, round: { ...game.round, boards: [wildBoard, knownBoards[1]] } };
    renderPanel({ view });
    expect(screen.queryByText('와일드 → 8')).not.toBeInTheDocument();
    revealAll();

    const mine = within(screen.getByTestId('board-1'));
    expect(mine.getAllByTestId('column-badge').map((badge) => badge.textContent)).toEqual(['7', '0', '13']);
    expect(mine.getByTestId('board-total')).toHaveTextContent('합계 20점');
    const notes = mine.getAllByTestId('wild-note');
    expect(notes.map((note) => note.textContent)).toEqual(['', '와일드 → 8', '']);
    expect(notes[1]).toHaveClass('text-[10px]');
    expect(within(screen.getByTestId('board-2')).queryAllByTestId('wild-note')).toHaveLength(0);
  });

  it('결과 판은 열 배지 사이 간격을 넓게 두고, 좁은 휴대폰에서만 모달 폭에 맞게 줄인다', () => {
    renderPanel();
    expect(within(screen.getByTestId('board-1')).getByTestId('board-grid')).toHaveClass('sm:gap-x-4', 'gap-x-2.5');
  });

  it('승리면 메달 아이콘을, 무승부면 무승부 아이콘만 보여 준다', () => {
    vi.useFakeTimers();
    const won = renderPanel();
    expect(screen.queryByTestId('result-medal')).not.toBeInTheDocument();
    revealAll();
    expect(screen.getByTestId('result-medal')).toBeInTheDocument();
    expect(screen.queryByTestId('result-draw')).not.toBeInTheDocument();
    won.unmount();

    renderPanel({ view: tie });
    revealAll();
    expect(screen.getByTestId('result-draw')).toBeInTheDocument();
    expect(screen.queryByTestId('result-medal')).not.toBeInTheDocument();
  });

  it('무승부면 어느 판도 승자 강조가 없다', () => {
    vi.useFakeTimers();
    renderPanel({ view: tie });
    revealAll();

    expect(screen.getByTestId('board-1')).toHaveAttribute('data-winner', 'false');
    expect(screen.getByTestId('board-2')).toHaveAttribute('data-winner', 'false');
    expect(screen.queryByTestId('winner-crown')).not.toBeInTheDocument();
  });

  it('판 격자는 펠트 테두리(13px)만큼 여백과 간격을 둔다', () => {
    renderPanel();

    expect(screen.getByTestId('result-boards')).toHaveClass('gap-11', 'p-[13px]');
    expect(within(screen.getByTestId('result-boards')).getAllByTestId('slot')).toHaveLength(12);
  });

  it('자리에 앉은 방장이 아닌 사람은 다음 게임 준비를 눌러 onReady를 부른다', async () => {
    const onReady = vi.fn();
    const onClose = vi.fn();
    renderPanel({ meId: 2, onReady, onClose });

    const button = screen.getByRole('button', { name: '다음 게임 준비' });
    expect(button).toHaveClass('rounded-full');
    await userEvent.click(button);

    expect(onReady).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '대기실로' })).not.toBeInTheDocument();
  });

  it('결과 창이 떠도 다음 게임 준비에 포커스를 옮기지 않아, 채팅을 치던 Enter·Space로 준비되지 않는다', async () => {
    const onReady = vi.fn();
    renderPanel({ meId: 2, onReady });

    expect(screen.getByRole('button', { name: '다음 게임 준비' })).not.toHaveFocus();
    expect(screen.getByRole('dialog', { name: '게임 결과' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');

    expect(onReady).not.toHaveBeenCalled();
  });

  it('방장은 다음 게임 준비 대신 대기실로를 누른다', async () => {
    const onClose = vi.fn();
    renderPanel({ meId: 1, onClose });

    expect(screen.queryByRole('button', { name: '다음 게임 준비' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '대기실로' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('관전자도 대기실로를 눌러 닫는다', async () => {
    const onClose = vi.fn();
    renderPanel({ meId: 9, onClose });

    expect(screen.queryByRole('button', { name: '다음 게임 준비' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '대기실로' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('방장을 뺀 사람들의 준비 칩을 보여주고, 준비한 사람은 초록 테두리와 체크 아이콘을 단다', () => {
    renderPanel();

    const chips = within(screen.getByTestId('ready-chips')).getAllByTestId('ready-chip');
    expect(chips).toHaveLength(2);
    expect(chips[0]).toHaveTextContent('밥');
    expect(within(chips[0]).queryByTestId('ready-check')).not.toBeInTheDocument();
    expect(chips[0]).toHaveClass('rounded-full', 'border-2', 'px-3', 'py-1', 'border-cream-300');
    expect(within(chips[1]).getByTestId('ready-check').tagName).toBe('svg');
    expect(chips[1]).toHaveTextContent('캐롤');
    expect(chips[1]).toHaveClass('border-safari-500');
  });

  it('토큰 표시는 없다', () => {
    vi.useFakeTimers();
    renderPanel();
    revealAll();

    expect(screen.queryByLabelText(/토큰/)).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '게임 결과' })).not.toHaveTextContent('토큰');
  });

  it('효과음은 모든 카드가 공개된 뒤에 한 번만 울리고, play가 바뀌어도 다시 울리지 않는다', () => {
    vi.useFakeTimers();
    const ui = (fn: SoundApi['play']) => (
      <SoundContext.Provider value={{ ...SILENT_SOUND, play: fn }}>
        <GameOverPanel game={game} room={room} meId={1} nicknameOf={nicknameOf} onReady={vi.fn()} onClose={vi.fn()} />
      </SoundContext.Provider>
    );
    const play = vi.fn();
    const utils = render(ui(play));

    for (let step = 0; step < 11; step += 1) {
      act(() => { vi.advanceTimersByTime(120); });
    }
    expect(play).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(120); });
    expect(play).toHaveBeenCalledOnce();
    expect(play).toHaveBeenCalledWith('roundWin');

    const next = vi.fn();
    utils.rerender(ui(next));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(next).not.toHaveBeenCalled();
  });
  it('무승부면 효과음을 울리지 않고, 진 사람에게는 진 소리를 울린다', () => {
    vi.useFakeTimers();
    const ui = (view: PaperSafariView, meId: number, fn: SoundApi['play']) => (
      <SoundContext.Provider value={{ ...SILENT_SOUND, play: fn }}>
        <GameOverPanel game={view} room={room} meId={meId} nicknameOf={nicknameOf} onReady={vi.fn()} onClose={vi.fn()} />
      </SoundContext.Provider>
    );
    const drawPlay = vi.fn();
    const drawn = render(ui(tie, 1, drawPlay));
    revealAll();
    expect(drawPlay).not.toHaveBeenCalled();
    drawn.unmount();

    const losePlay = vi.fn();
    render(ui(game, 2, losePlay));
    revealAll();
    expect(losePlay).toHaveBeenCalledWith('roundLose');
  });

  it('기권으로 끝나 점수가 없으면 바로 남은 사람의 승리를 보여 주고 점수 줄은 없다', () => {
    vi.useFakeTimers();
    renderPanel({ view: { ...game, winnerId: 2, lastRoundResult: null } });

    const dialog = screen.getByRole('dialog', { name: '게임 결과' });
    expect(within(dialog).getByRole('heading', { name: '밥님 승리!' })).toBeInTheDocument();
    expect(within(dialog).queryAllByTestId('score-row')).toHaveLength(0);
  });

  it('상대가 나가서 끝나면 결과 배지·합계 없이 남은 사람 판 하나만 가운데 두고 안내 문구를 보여 준다', () => {
    const hiddenBoard = { playerId: 2, slots: slots.map((slot, index) => ({ ...slot, faceUp: index < 2 })) };
    renderPanel({ view: { ...game, winnerId: 2, lastRoundResult: null, round: { ...game.round, boards: [hiddenBoard] } } });

    const dialog = screen.getByRole('dialog', { name: '게임 결과' });
    expect(within(dialog).getByRole('heading', { name: '밥님 승리!' })).toBeInTheDocument();
    expect(dialog).toHaveTextContent('상대가 나가서 게임이 끝났어요');
    expect(within(dialog).queryAllByTestId('board-total')).toHaveLength(0);
    expect(within(dialog).queryAllByTestId('column-badge')).toHaveLength(0);
    expect(dialog).not.toHaveTextContent('합계 ?점');
    const boards = within(dialog).getByTestId('result-boards');
    expect(boards).not.toHaveClass('sm:grid-cols-2');
    expect(boards).toHaveClass('justify-center');
    expect(within(boards).getAllByTestId(/^board-\d+$/)).toHaveLength(1);
  });

  it('긴 닉네임이면 닉네임만 말줄임되고 합계 라벨·점수·결과 글은 잘리지 않는다', () => {
    vi.useFakeTimers();
    const longName = '아주아주긴닉네임열자';
    render(<GameOverPanel game={game} room={room} meId={2} nicknameOf={(id) => (id === 1 ? longName : names[id])} onReady={vi.fn()} onClose={vi.fn()} />);
    revealAll();

    const board = within(screen.getByTestId('board-1'));
    const total = board.getByTestId('board-total');
    expect(total).toHaveTextContent(/^합계 \d+점$/);
    expect(total).toHaveClass('shrink-0', 'whitespace-nowrap');
    expect(total).not.toHaveClass('truncate');
    const name = board.getByTestId('board-tag-name');
    expect(name).toHaveTextContent(longName);
    expect(name).toHaveClass('min-w-0', 'truncate');
    const tag = board.getByTestId('board-tag');
    expect(tag.getAttribute('title')).toMatch(new RegExp(`^${longName} · \\S+$`));
    expect(name.nextElementSibling).toHaveTextContent(/^· \S+$/);
    // 앞 공백이 접히지 않게 whitespace-pre(줄바꿈도 하지 않는다)
    expect(name.nextElementSibling).toHaveClass('shrink-0', 'whitespace-pre');

    // 좁은 휴대폰에서는 이름표 줄이 판 폭을 넓혀 오른쪽 합계가 모달 밖으로 잘려 나가지 않게, 줄 폭을 카드 격자에 맞춘다.
    expect(board.getByTestId('board-header')).toHaveClass('max-sm:[contain:inline-size]');
    expect(board.getByTestId('board-grid')).toHaveClass('gap-x-2.5', 'sm:gap-x-4');

    const row = screen.getAllByTestId('score-row')[0];
    expect(within(row).getByTestId('score-name')).toHaveClass('min-w-0', 'truncate');
    expect(within(row).getByTestId('score-value')).toHaveClass('shrink-0', 'whitespace-nowrap');
  });
});
