import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { BoardView, CardView, HeldView, PaperSafariSessionView, Room, SlotView, TurnPhase } from '../../api/types';
import { setMediaMatches } from '../../test/media';
import { SILENT_SOUND, SoundContext } from '../../lib/sound';
import { PaperSafariTable } from './PaperSafariTable';

const ME = 1;
const OPPONENT = 2;

const room: Room = {
  code: 'ABC123', name: '테스트 방', gameType: 'PAPER_SAFARI', gameTypeName: '페이퍼 사파리', status: 'PLAYING',
  hostId: ME, maxPlayers: 4, locked: false, spectators: [], theme: 'WOOD',
  members: [
    { id: ME, nickname: '앨리스', host: true, connected: true, offlineSeconds: 0, ready: false },
    { id: OPPONENT, nickname: '밥', host: false, connected: true, offlineSeconds: 0, ready: false },
  ],
};

function slots(card: (column: number, row: number) => CardView | null, faceUp: boolean): SlotView[] {
  return [0, 1, 2].flatMap((column) => [0, 1].map((row) => {
    const value = card(column, row);
    return { column, row, faceUp: faceUp && value !== null, known: false, card: faceUp ? value : null };
  }));
}

const faceDown = (): BoardView['slots'] => slots(() => null, false);
const faceUpNumbers = (): BoardView['slots'] => slots((column, row) => ({ kind: 'NUMBER', value: column + row * 3 + 1 }), true);

type Setup = { phase: TurnPhase; current: number; held?: HeldView | null; mine?: SlotView[] };

function build({ phase, current, held = null, mine = faceDown() }: Setup): PaperSafariSessionView {
  return {
    game: {
      viewerId: ME, status: 'IN_ROUND', roundNumber: 1, lastRoundResult: null, winnerId: null,
      round: {
        phase, currentPlayerId: current, deckSize: 40, discardTop: { kind: 'NUMBER', value: 4 }, held,
        boards: [{ playerId: ME, slots: mine }, { playerId: OPPONENT, slots: faceDown() }],
      },
    },
  };
}

function withOpponents(count: number): PaperSafariSessionView {
  const view = build({ phase: 'DRAW', current: ME });
  const others = Array.from({ length: count }, (_, index) => ({ playerId: OPPONENT + index, slots: faceDown() }));
  return { game: { ...view.game, round: { ...view.game.round, boards: [view.game.round.boards[0], ...others] } } };
}

const nicknameOf = (memberId: number) => room.members.find((member) => member.id === memberId)?.nickname ?? '떠난 플레이어';

function baseProps(view: PaperSafariSessionView, send: () => void = vi.fn(), targetRoom: Room = room, now = 0, errorSeq = 0) {
  return {
    view, room: targetRoom, meId: ME, log: [], send, nicknameOf,
    receivedAt: 0, now, errorSeq, onCloseGameOver: vi.fn(), onReadyNext: vi.fn(),
  };
}

function tableFor(view: PaperSafariSessionView, send: () => void, targetRoom: Room = room, now = 0, errorSeq = 0) {
  return <PaperSafariTable {...baseProps(view, send, targetRoom, now, errorSeq)} />;
}

function renderTable(setup: Setup) {
  const send = vi.fn();
  render(tableFor(build(setup), send));
  return send;
}

function mySlotButtons(): HTMLElement[] {
  const mine = screen.getAllByTestId('slot').slice(-6);
  return mine.map((slot) => within(slot).getByRole('button'));
}

describe('PaperSafariTable 단계별 행동 제한', () => {
  it('SETUP_FLIP: 내 뒷면 카드만 눌러 뒤집을 수 있다', async () => {
    const send = renderTable({ phase: 'SETUP_FLIP', current: ME });
    const opponentSlots = screen.getAllByTestId('slot').slice(0, 6);

    expect(mySlotButtons().filter((button) => !(button as HTMLButtonElement).disabled)).toHaveLength(6);
    opponentSlots.forEach((slot) => expect(within(slot).getByRole('button')).toBeDisabled());
    await userEvent.click(mySlotButtons()[3]);

    expect(send).toHaveBeenCalledWith({ type: 'FLIP', column: 0, row: 1 });
  });

  it('DRAW: 상대 차례에는 덱에서 뽑을 수 없다', () => {
    renderTable({ phase: 'DRAW', current: OPPONENT });

    expect(screen.getByRole('button', { name: '덱에서 뽑기' })).toBeDisabled();
    mySlotButtons().forEach((button) => expect(button).toBeDisabled());
  });

  it('DRAW: 내 차례에 덱에서 뽑으면 DRAW_DECK을 보낸다', async () => {
    const send = renderTable({ phase: 'DRAW', current: ME });

    await userEvent.click(screen.getByRole('button', { name: '덱에서 뽑기' }));

    expect(send).toHaveBeenCalledWith({ type: 'DRAW_DECK' });
  });

  it('PLACE: 버린 카드 더미에서 가져온 카드는 버릴 수 없다', () => {
    renderTable({ phase: 'PLACE', current: ME, held: { playerId: ME, source: 'DISCARD', card: { kind: 'NUMBER', value: 4 } }, mine: faceUpNumbers() });

    expect(screen.getByRole('button', { name: '버리기' })).toBeDisabled();
    expect(screen.getByText('교체할 내 카드를 눌러 주세요. (이 카드는 버릴 수 없어요)')).toBeInTheDocument();
  });

  it('PLACE: 덱에서 뽑은 타잔은 버릴 수 없다', () => {
    renderTable({ phase: 'PLACE', current: ME, held: { playerId: ME, source: 'DECK', card: { kind: 'TARZAN', value: 0 } }, mine: faceUpNumbers() });

    expect(screen.getByRole('button', { name: '버리기' })).toBeDisabled();
  });

  it('PLACE: 덱에서 뽑은 숫자 카드는 버리거나 내 카드와 교체할 수 있다', async () => {
    const send = renderTable({ phase: 'PLACE', current: ME, held: { playerId: ME, source: 'DECK', card: { kind: 'NUMBER', value: 7 } }, mine: faceUpNumbers() });

    expect(screen.getByText('교체할 내 카드를 누르거나, 버리기를 누르세요.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '버리기' }));
    expect(send).toHaveBeenCalledWith({ type: 'DISCARD' });
  });

  it('PLACE: 덱에서 뽑은 숫자 카드로 내 카드와 교체할 수 있다', async () => {
    const send = renderTable({ phase: 'PLACE', current: ME, held: { playerId: ME, source: 'DECK', card: { kind: 'NUMBER', value: 7 } }, mine: faceUpNumbers() });

    await userEvent.click(mySlotButtons()[2]);

    expect(send).toHaveBeenCalledWith({ type: 'SWAP', column: 2, row: 0 });
  });

  it('PEEK: 내 뒷면 카드만 눌러 엿볼 수 있다', async () => {
    const mine = faceUpNumbers().map((slot) => (slot.column === 2 ? { ...slot, faceUp: false, card: null } : slot));
    const send = renderTable({ phase: 'PEEK', current: ME, mine });
    const buttons = mySlotButtons();
    expect(screen.getAllByLabelText('뒷면 카드').filter((button) => !(button as HTMLButtonElement).disabled)).toHaveLength(2);

    buttons.filter((button) => button.getAttribute('aria-label') !== '뒷면 카드').forEach((button) => expect(button).toBeDisabled());
    await userEvent.click(screen.getAllByLabelText('뒷면 카드').filter((button) => !(button as HTMLButtonElement).disabled)[0]);

    expect(send).toHaveBeenCalledWith({ type: 'PEEK', column: 2, row: 0 });
  });
});

describe('PaperSafariTable 접속 상태', () => {
  const offlineRoom = (seconds: number): Room => ({
    ...room,
    members: [room.members[0], { ...room.members[1], connected: false, offlineSeconds: seconds }],
  });

  it('60초 넘게 끊긴 상대가 있어도 게임 화면에는 내보내기 버튼이 없다', () => {
    render(tableFor(build({ phase: 'DRAW', current: ME }), vi.fn(), offlineRoom(70)));

    expect(screen.getByText('연결 끊김 70초')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /내보내기/ })).not.toBeInTheDocument();
  });

  it('60초 미만이면 끊긴 시간만 보이고 버튼은 없다', () => {
    render(tableFor(build({ phase: 'DRAW', current: ME }), vi.fn(), offlineRoom(30)));

    expect(screen.getByText('연결 끊김 30초')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '내보내기' })).not.toBeInTheDocument();
  });
});

describe('PaperSafariTable 중복 행동 방지', () => {
  it('덱을 빠르게 두 번 눌러도 DRAW_DECK은 한 번만 보낸다', async () => {
    const send = renderTable({ phase: 'DRAW', current: ME });

    await userEvent.click(screen.getByRole('button', { name: '덱에서 뽑기' }));
    await userEvent.click(screen.getByRole('button', { name: '덱에서 뽑기' }));

    expect(send).toHaveBeenCalledTimes(1);
  });

  it('새 화면 정보가 오면 다시 행동할 수 있다', async () => {
    const send = vi.fn();
    const { rerender } = render(tableFor(build({ phase: 'DRAW', current: ME }), send));
    await userEvent.click(screen.getByRole('button', { name: '덱에서 뽑기' }));

    rerender(tableFor(build({ phase: 'DRAW', current: ME }), send));
    await userEvent.click(screen.getByRole('button', { name: '덱에서 뽑기' }));

    expect(send).toHaveBeenCalledTimes(2);
  });

  it('서버 오류가 오면 바로 다시 행동할 수 있다', async () => {
    const send = vi.fn();
    const view = build({ phase: 'DRAW', current: ME });
    const { rerender } = render(tableFor(view, send));
    await userEvent.click(screen.getByRole('button', { name: '덱에서 뽑기' }));

    rerender(tableFor(view, send, room, 0, 1));
    await userEvent.click(screen.getByRole('button', { name: '덱에서 뽑기' }));

    expect(send).toHaveBeenCalledTimes(2);
  });
});

describe.each([
  ['PC', true],
  ['모바일', false],
])('%s 배치에서도 행동 규칙이 같다', (_, wide) => {
  it('DRAW: 내 차례에 덱에서 뽑으면 DRAW_DECK을 보낸다', async () => {
    setMediaMatches(wide);
    const send = renderTable({ phase: 'DRAW', current: ME });

    await userEvent.click(screen.getByRole('button', { name: '덱에서 뽑기' }));

    expect(send).toHaveBeenCalledWith({ type: 'DRAW_DECK' });
  });

  it('PLACE: 내 카드를 누르면 SWAP을 보낸다', async () => {
    setMediaMatches(wide);
    const send = renderTable({ phase: 'PLACE', current: ME, held: { playerId: ME, source: 'DECK', card: { kind: 'NUMBER', value: 3 } } });

    await userEvent.click(mySlotButtons()[0]);

    expect(send).toHaveBeenCalledWith({ type: 'SWAP', column: 0, row: 0 });
  });
});

it('게임 중 화면 폭이 바뀌어도 내 판이 마지막 슬롯 6개다', () => {
  renderTable({ phase: 'DRAW', current: ME });
  expect(screen.getAllByTestId('slot')).toHaveLength(12);

  act(() => setMediaMatches(false));

  expect(screen.getAllByTestId('slot')).toHaveLength(12);
  expect(mySlotButtons()).toHaveLength(6);
});

it('들고 있는 카드와 모든 자리의 손 자리표가 있다', () => {
  renderTable({ phase: 'PLACE', current: ME, held: { playerId: ME, source: 'DECK', card: { kind: 'NUMBER', value: 3 } } });

  expect(screen.getByLabelText('들고 있는 카드')).toBeInTheDocument();
  ['hand:1', 'hand:2', 'deck', 'discard', 'slot:1:0:0'].forEach((zone) => {
    expect(document.querySelector(`[data-zone="${zone}"]`)).not.toBeNull();
  });
});

it('재동기화로 받은 화면(animate=false)은 날아다니는 카드를 만들지 않는다', () => {
  const from = build({ phase: 'DRAW', current: OPPONENT });
  const to = build({ phase: 'PLACE', current: OPPONENT, held: { playerId: OPPONENT, source: 'DECK', card: null } });
  render(<PaperSafariTable {...baseProps(to)} transition={{ seq: 1, from: from.game, to: to.game, animate: false }} />);

  expect(screen.queryByTestId('ghost-layer')).not.toBeInTheDocument();
});

it('상대가 덱에서 뽑으면 유령 카드가 날아간다', () => {
  const card = { x: 0, y: 0, left: 0, top: 0, right: 64, bottom: 90, width: 64, height: 90, toJSON: () => ({}) } as DOMRect;
  const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(card);
  const from = build({ phase: 'DRAW', current: OPPONENT });
  const to = build({ phase: 'PLACE', current: OPPONENT, held: { playerId: OPPONENT, source: 'DECK', card: null } });
  render(<PaperSafariTable {...baseProps(to)} transition={{ seq: 1, from: from.game, to: to.game, animate: true }} />);

  expect(screen.getByTestId('ghost-layer')).toBeInTheDocument();
  rect.mockRestore();
});

describe('관전자 화면', () => {
  const SPECTATOR = 99;
  const watching = (): PaperSafariSessionView => {
    const view = build({ phase: 'DRAW', current: OPPONENT });
    return { ...view, game: { ...view.game, viewerId: SPECTATOR } };
  };

  it.each([true, false])('모든 판을 상대 자리로 보여주고 행동 버튼은 모두 막는다 (PC 배치 %s)', (wide) => {
    setMediaMatches(wide);
    const send = vi.fn();
    render(<PaperSafariTable {...baseProps(watching(), send)} meId={SPECTATOR} />);

    const slotButtons = screen.getAllByTestId('slot').map((slot) => within(slot).getByRole('button'));
    expect(slotButtons).toHaveLength(12);
    slotButtons.forEach((button) => expect(button).toBeDisabled());
    expect(screen.getByText(/관전 중이에요/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '덱에서 뽑기' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '버리기' })).not.toBeInTheDocument();
    expect(screen.getByText('밥님의 차례예요.')).toBeInTheDocument();
    expect(screen.queryByText(/\(나\)/)).not.toBeInTheDocument();
  });
});

describe('게임 화면 다듬기', () => {
  it('모바일 배치에서는 짧은 안내 문구를, PC 배치에서는 긴 문구를 쓴다', () => {
    setMediaMatches(false);
    const { unmount } = render(<PaperSafariTable {...baseProps(build({ phase: 'DRAW', current: ME }))} />);
    expect(screen.getByTestId('instruction')).toHaveTextContent('덱이나 버린 카드에서 가져오세요');
    unmount();
    setMediaMatches(true);
    render(<PaperSafariTable {...baseProps(build({ phase: 'DRAW', current: ME }))} />);
    expect(screen.getByTestId('instruction')).toHaveTextContent('덱 또는 버린 카드 더미에서 카드를 가져오세요.');
  });

  it.each([true, false])('차례 안내 바는 한 줄 높이로 고정되고 문구는 말줄임한다 (PC 배치 %s)', (wide) => {
    setMediaMatches(wide);
    render(<PaperSafariTable {...baseProps(build({ phase: 'DRAW', current: OPPONENT }))} />);
    const bar = screen.getByTestId('turn-bar');
    expect(bar).toHaveClass('flex-nowrap');
    expect(bar.className).toMatch(/(^|\s)h-\d/);
    expect(screen.getByTestId('instruction').querySelector('.truncate')).not.toBeNull();
  });

  it('모바일 차례 안내 바는 작은 글씨(text-xs)와 줄인 패딩으로 한 줄에 둔다', () => {
    setMediaMatches(false);
    render(<PaperSafariTable {...baseProps(build({ phase: 'DRAW', current: OPPONENT }))} />);
    const bar = screen.getByTestId('turn-bar');
    expect(bar).toHaveClass('text-xs', 'px-2', 'whitespace-nowrap');
    expect(bar).not.toHaveClass('text-sm');
  });

  it('PC 차례 안내 바는 테이블과 16px 넘게(나무 테두리 13px 포함 mb-8) 띄우고, 덱 묶음은 내 판 옆(같은 줄)에 둔다', () => {
    setMediaMatches(true);
    render(<PaperSafariTable {...baseProps(build({ phase: 'DRAW', current: ME }))} />);
    expect(screen.getByTestId('turn-bar')).toHaveClass('mb-8');
    expect(within(screen.getByTestId('my-row')).getByRole('button', { name: '덱에서 뽑기' })).toBeInTheDocument();
  });

  it('PC에서 상대 4명(5인)은 맞은편 한 줄에 작은 판(xs)으로 앉고, 양 끝 자리는 아래로 내려 앉는다', () => {
    setMediaMatches(true);
    render(<PaperSafariTable {...baseProps(withOpponents(4))} />);
    const row = screen.getByTestId('opponent-row');
    const seats = within(row).getAllByTestId('opponent-seat');
    expect(seats).toHaveLength(4);
    within(seats[1]).getAllByRole('button', { name: '뒷면 카드' }).forEach((card) => expect(card).toHaveClass('w-10'));
    expect(seats[0].parentElement).toHaveClass('pt-12');
    expect(seats[3].parentElement).toHaveClass('pt-12');
    mySlotButtons().forEach((button) => expect(button).toHaveClass('w-20'));
  });

  it('PC 관전자는 내 판이 없어 위 줄 · 가운데 줄(양옆 상대와 덱) 둥근 배치를 그대로 쓴다', () => {
    setMediaMatches(true);
    const view = withOpponents(4);
    render(<PaperSafariTable {...baseProps(view)} meId={999} />);
    expect(screen.queryByTestId('opponent-row')).not.toBeInTheDocument();
    const piles = screen.getByRole('button', { name: '덱에서 뽑기' }).closest('.grid') as HTMLElement;
    expect(within(piles).getAllByTestId('opponent-seat')).toHaveLength(2);
  });

  it('차례 안내 바는 마감 5초 전부터 카운트다운을 보이고 내 차례면 경고음을 한 번 낸다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const play = vi.fn();
    const view = build({ phase: 'DRAW', current: ME });
    const timed = { game: { ...view.game, deadline: 1_000_000 + 7000, serverNow: 1_000_000 } };
    render(
      <SoundContext.Provider value={{ ...SILENT_SOUND, play }}>
        <PaperSafariTable {...baseProps(timed)} />
      </SoundContext.Provider>,
    );
    try {
      const bar = screen.getByTestId('turn-bar');
      expect(within(bar).queryByTestId('countdown')).not.toBeInTheDocument();
      act(() => { vi.advanceTimersByTime(2500); });
      expect(within(bar).getByTestId('countdown')).toHaveTextContent('5');
      act(() => { vi.advanceTimersByTime(2000); });
      expect(play.mock.calls.filter(([name]) => name === 'tick')).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('모바일 배치에서는 내 판 옆 세로 칸에 버리기와 예상 점수를 둔다', () => {
    setMediaMatches(false);
    render(<PaperSafariTable {...baseProps(build({ phase: 'PLACE', current: ME, held: { playerId: ME, source: 'DECK', card: { kind: 'NUMBER', value: 5 } } }))} />);
    const side = screen.getByTestId('my-side');
    expect(within(side).getByRole('button', { name: '버리기' })).toBeEnabled();
    expect(within(side).getByText(/현재 예상 점수/)).toBeInTheDocument();
  });

  it('내 칸이 좁아질 때만 가려진 장수를 숨기고 점수 글자를 줄이는 컨테이너 규칙을 가진다', () => {
    setMediaMatches(false);
    render(<PaperSafariTable {...baseProps(build({ phase: 'DRAW', current: ME }))} />);
    const side = screen.getByTestId('my-side');
    expect(side).toHaveClass('@container', 'flex-1');
    expect(side.className).not.toMatch(/(^|\s)w-\d/);
    expect(side.querySelector('.estimate-hidden-note')).toHaveClass('@max-[110px]:hidden');
    expect(side.querySelector('strong')).toHaveClass('text-lg', '@max-[110px]:text-base');
  });

  it.each([true, false])('5초 이하가 되면 행동할 사람의 이름표에도 남은 시간을 보인다 (PC 배치 %s)', (wide) => {
    setMediaMatches(wide);
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const play = vi.fn();
    const view = build({ phase: 'DRAW', current: OPPONENT });
    const timed = { game: { ...view.game, deadline: 1_000_000 + 4000, serverNow: 1_000_000 } };
    try {
      render(
        <SoundContext.Provider value={{ ...SILENT_SOUND, play }}>
          <PaperSafariTable {...baseProps(timed)} />
        </SoundContext.Provider>,
      );
      expect(within(screen.getByTestId(`board-${OPPONENT}`)).getByTestId('countdown')).toHaveTextContent('4');
      expect(within(screen.getByTestId(`board-${ME}`)).queryByTestId('countdown')).not.toBeInTheDocument();
      act(() => { vi.advanceTimersByTime(1000); });
      // 상대 차례이고 이름표 타이머는 경고음을 내지 않는다.
      expect(play.mock.calls.filter(([name]) => name === 'tick')).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('시작 뒤집기에서는 아직 안 뒤집은 모든 사람의 이름표에 남은 시간을 보인다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const view = build({ phase: 'SETUP_FLIP', current: ME });
    const flippedMine = view.game.round.boards[0].slots.map((slot, index) => (index === 0 ? { ...slot, faceUp: true, card: { kind: 'NUMBER' as const, value: 3 } } : slot));
    const boards = [{ playerId: ME, slots: flippedMine }, view.game.round.boards[1], { playerId: 3, slots: view.game.round.boards[1].slots }];
    const timed = { game: { ...view.game, round: { ...view.game.round, boards }, deadline: 1_000_000 + 3000, serverNow: 1_000_000 } };
    try {
      render(<PaperSafariTable {...baseProps(timed)} />);
      expect(within(screen.getByTestId(`board-${OPPONENT}`)).getByTestId('countdown')).toBeInTheDocument();
      expect(within(screen.getByTestId('board-3')).getByTestId('countdown')).toBeInTheDocument();
      expect(within(screen.getByTestId(`board-${ME}`)).queryByTestId('countdown')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('모바일 배치의 차례 안내 바는 기록이 없어도 마지막 기록 칸을 말줄임 칸으로 잡아 둔다', () => {
    setMediaMatches(false);
    render(<PaperSafariTable {...baseProps(build({ phase: 'DRAW', current: ME }))} />);
    expect(screen.getByTestId('turn-bar')).not.toHaveTextContent('라운드');
    const lastLog = screen.getByTestId('last-log');
    expect(lastLog).toBeEmptyDOMElement();
    expect(lastLog).toHaveClass('min-w-0', 'truncate');
  });

  it('세로 휴대폰은 가장 작은 둥근 테이블: 상대 카드 폭 28px, 덱도 작게, 가로 스크롤 줄은 없다', () => {
    setMediaMatches(false);
    render(<PaperSafariTable {...baseProps(build({ phase: 'DRAW', current: ME }))} />);
    expect(screen.getByTestId('table-round')).toHaveAttribute('data-density', 'mini');
    expect(screen.queryByTestId('opponent-rail')).not.toBeInTheDocument();
    const seat = screen.getByTestId('opponent-seat');
    within(seat).getAllByRole('button', { name: '뒷면 카드' }).forEach((card) => expect(card).toHaveClass('w-7'));
    expect(screen.getByRole('button', { name: '덱에서 뽑기' })).toHaveClass('w-10');
  });

  it('세로 휴대폰에서도 상대 4명이 PC처럼 위 두 명, 양옆 두 명으로 앉는다', () => {
    setMediaMatches(false);
    render(<PaperSafariTable {...baseProps(withOpponents(4))} />);
    expect(screen.getAllByTestId('opponent-seat')).toHaveLength(4);
    const piles = screen.getByRole('button', { name: '덱에서 뽑기' }).closest('.grid') as HTMLElement;
    expect(within(piles).getAllByTestId('opponent-seat')).toHaveLength(2);
  });

  it('휴대폰을 눕히면 줄인 둥근 테이블과, 방 정보·차례 안내를 쌓은 왼쪽 칸을 둔다', () => {
    setMediaMatches((query) => query.includes('orientation: landscape'));
    render(<PaperSafariTable {...baseProps(build({ phase: 'DRAW', current: ME }))} aside={<div data-testid="aside-slot" />} />);
    const aside = screen.getByTestId('table-aside');
    expect(within(aside).getByTestId('aside-slot')).toBeInTheDocument();
    expect(within(aside).getByTestId('turn-bar')).toHaveClass('flex-col');
    expect(screen.getByTestId('table-round')).toHaveAttribute('data-density', 'landscape');
    within(screen.getByTestId('opponent-seat')).getAllByRole('button', { name: '뒷면 카드' }).forEach((card) => expect(card).toHaveClass('w-7'));
    expect(within(screen.getByTestId('my-row')).getByRole('button', { name: '덱에서 뽑기' })).toBeInTheDocument();
  });

  it('휴대폰을 눕히면 상대 4명은 맞은편 한 줄에 모두 앉는다', () => {
    setMediaMatches((query) => query.includes('orientation: landscape'));
    render(<PaperSafariTable {...baseProps(withOpponents(4))} />);
    expect(within(screen.getByTestId('opponent-row')).getAllByTestId('opponent-seat')).toHaveLength(4);
  });

  it('작은 상대 판은 카드 격자 폭에 맞춰, 연결 끊김 같은 글씨가 판을 넓히지 않는다', () => {
    setMediaMatches(false);
    render(<PaperSafariTable {...baseProps(build({ phase: 'DRAW', current: ME }))} />);
    expect(screen.getByTestId('board-2')).toHaveClass('w-min');
    expect(within(screen.getByTestId('board-2')).getByTestId('board-grid')).toHaveClass('grid-cols-[repeat(3,auto)]');
    expect(screen.getByTestId('board-1')).not.toHaveClass('w-min');
  });

  it('태블릿(폭 768 이상)은 PC와 같은 큰 둥근 테이블을 쓴다', () => {
    setMediaMatches((query) => query === '(min-width: 768px) and (min-height: 541px)');
    render(<PaperSafariTable {...baseProps(build({ phase: 'DRAW', current: ME }))} aside={<div data-testid="aside-slot" />} />);
    expect(screen.queryByTestId('table-aside')).not.toBeInTheDocument();
    expect(screen.getByTestId('table-round')).toHaveAttribute('data-density', 'pc');
    expect(screen.getByTestId('turn-bar')).toHaveClass('h-10');
  });

  it('좁은 휴대폰에서는 내 판 카드를 한 단계 작게 그려 버리기 칸과 한 줄에 들어가게 한다', () => {
    setMediaMatches(false);
    render(<PaperSafariTable {...baseProps(build({ phase: 'DRAW', current: ME }))} />);
    mySlotButtons().forEach((button) => expect(button).toHaveClass('w-12'));
    expect(within(screen.getByTestId('my-side')).getByRole('button', { name: '버리기' })).toHaveClass('px-2!');
  });

  describe('상대 판 확대', () => {
    const withOpponentCards = (): PaperSafariSessionView => {
      const view = build({ phase: 'DRAW', current: ME });
      const opponentSlots = faceDown().map((slot) => {
        if (slot.column !== 0 || slot.row > 1) {
          return slot;
        }
        return { ...slot, faceUp: true, card: { kind: 'NUMBER', value: slot.row === 0 ? 3 : 4 } as CardView };
      });
      return { ...view, game: { ...view.game, round: { ...view.game.round, boards: [view.game.round.boards[0], { playerId: OPPONENT, slots: opponentSlots }] } } };
    };

    it.each([true, false])('상대 판을 누르면 큰 판과 예상 점수를 보여 준다 (PC 배치 %s)', async (wide) => {
      setMediaMatches(wide);
      render(<PaperSafariTable {...baseProps(withOpponentCards())} />);
      if (wide) {
        expect(screen.getByTestId('opponent-estimate')).toHaveTextContent('예상 7점');
      } else {
        expect(screen.queryByTestId('opponent-estimate')).not.toBeInTheDocument();
      }

      await userEvent.click(screen.getByRole('button', { name: '밥님의 판 크게 보기' }));

      const dialog = screen.getByRole('dialog', { name: '밥님의 판' });
      expect(within(dialog).getByText(/예상 점수/)).toHaveTextContent('예상 점수 7');
      expect(within(dialog).getByText(/가려진 4장/)).toBeInTheDocument();
    });

    it('내 자리는 확대 버튼이 없다', () => {
      render(<PaperSafariTable {...baseProps(withOpponentCards())} />);
      expect(screen.queryByRole('button', { name: /앨리스.*크게 보기/ })).not.toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /크게 보기/ })).toHaveLength(1);
    });
  });
});

describe('버린 카드 되돌리기', () => {
  const fromDiscard: HeldView = { playerId: ME, source: 'DISCARD', card: { kind: 'NUMBER', value: 4 } };

  it.each([true, false])('내 차례에 버린 카드 더미에서 가져온 카드를 들고 있으면 되돌리기로 CANCEL_DRAW를 보낸다 (PC 배치 %s)', async (wide) => {
    setMediaMatches(wide);
    const send = renderTable({ phase: 'PLACE', current: ME, held: fromDiscard });

    await userEvent.click(screen.getByRole('button', { name: '되돌리기' }));

    expect(send).toHaveBeenCalledWith({ type: 'CANCEL_DRAW' });
  });

  it('모바일에서는 오른쪽 칸의 버리기 위에 둔다', () => {
    setMediaMatches(false);
    renderTable({ phase: 'PLACE', current: ME, held: fromDiscard });

    const buttons = within(screen.getByTestId('my-side')).getAllByRole('button');
    expect(buttons.map((button) => button.getAttribute('aria-label') ?? button.textContent)).toEqual(['되돌리기', '버리기', '4 카드']);
  });

  it('PC에서도 오른쪽 칸의 버리기 위에 둔다', () => {
    setMediaMatches(true);
    renderTable({ phase: 'PLACE', current: ME, held: fromDiscard });

    const buttons = within(screen.getByTestId('my-side')).getAllByRole('button');
    expect(buttons.map((button) => button.getAttribute('aria-label') ?? button.textContent)).toEqual(['되돌리기', '버리기', '4 카드']);
  });

  it.each<[string, Setup]>([
    ['덱에서 가져온 카드', { phase: 'PLACE', current: ME, held: { playerId: ME, source: 'DECK', card: { kind: 'NUMBER', value: 4 } } }],
    ['상대가 버린 카드 더미에서 가져온 카드', { phase: 'PLACE', current: OPPONENT, held: { playerId: OPPONENT, source: 'DISCARD', card: { kind: 'NUMBER', value: 4 } } }],
    ['카드를 들기 전', { phase: 'DRAW', current: ME }],
  ])('%s에는 되돌리기가 없다', (_, setup) => {
    for (const wide of [true, false]) {
      setMediaMatches(wide);
      const { unmount } = render(tableFor(build(setup), vi.fn()));
      expect(screen.queryByRole('button', { name: '되돌리기' })).not.toBeInTheDocument();
      unmount();
    }
  });
});

it.each([true, false])('게임 화면 어디에도 토큰 표시가 없다 (PC 배치 %s)', async (wide) => {
  setMediaMatches(wide);
  renderTable({ phase: 'DRAW', current: ME });
  expect(screen.queryAllByLabelText(/토큰/)).toHaveLength(0);

  await userEvent.click(screen.getByRole('button', { name: '밥님의 판 크게 보기' }));
  expect(screen.queryAllByLabelText(/토큰/)).toHaveLength(0);
});

it('게임이 끝나면 게임 결과 창을 띄우고, 방장이 아닌 참가자의 다음 게임 준비는 onReadyNext를 부른다', async () => {
  const view = build({ phase: 'ROUND_OVER', current: ME });
  const over: PaperSafariSessionView = {
    game: { ...view.game, status: 'GAME_OVER', winnerId: OPPONENT, viewerId: OPPONENT,
      lastRoundResult: { players: [{ playerId: ME, score: 20, outcome: 'LOSE' }, { playerId: OPPONENT, score: 3, outcome: 'WIN' }] } },
  };
  const onReadyNext = vi.fn();
  render(<PaperSafariTable {...baseProps(over)} meId={OPPONENT} onReadyNext={onReadyNext} />);

  expect(screen.getByRole('dialog', { name: '게임 결과' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '다음 게임 준비' }));

  expect(onReadyNext).toHaveBeenCalledOnce();
});

describe('모바일 게임 화면 (상대 판·내 차례·손 카드)', () => {
  it('모바일 상대 자리의 손 칸은 판 위에 겹쳐 놓아 자리 너비가 판 너비와 같다', () => {
    setMediaMatches(false);
    render(<PaperSafariTable {...baseProps(build({ phase: 'DRAW', current: OPPONENT }))} />);
    const hand = document.querySelector('[data-zone="hand:2"]') as HTMLElement;
    expect(hand).toHaveClass('absolute');
    expect(document.querySelectorAll('[data-zone="hand:2"]')).toHaveLength(1);
    const seat = hand.parentElement as HTMLElement;
    expect(seat).not.toHaveClass('flex');
    expect(hand).toHaveClass('pointer-events-none');
  });

  it('내 차례면 내 판에 테마 강조색 테두리 링이 생기고, 아니면 없다', () => {
    setMediaMatches(false);
    const { unmount } = render(<PaperSafariTable {...baseProps(build({ phase: 'DRAW', current: ME }))} />);
    expect(screen.getByTestId('board-1')).toHaveClass('turn-ring', 'ring-(--turn-ring)');
    expect(screen.getByTestId('board-1').querySelector('.turn-glow')).toHaveClass('bg-(--turn-tag-bg)', 'text-(--turn-tag-ink)');
    unmount();
    render(<PaperSafariTable {...baseProps(build({ phase: 'DRAW', current: OPPONENT }))} />);
    expect(screen.getByTestId('board-1')).not.toHaveClass('turn-ring');
  });

  it('모바일에서 내 손 칸은 내 옆 칸 안에 하나만 있다', () => {
    setMediaMatches(false);
    render(<PaperSafariTable {...baseProps(build({ phase: 'PLACE', current: ME, held: { playerId: ME, source: 'DECK', card: { kind: 'NUMBER', value: 5 } } }))} />);
    const side = screen.getByTestId('my-side');
    expect(side.querySelector('[data-zone="hand:1"]')).not.toBeNull();
    expect(document.querySelectorAll('[data-zone="hand:1"]')).toHaveLength(1);
  });

  it('PC에서도 내 판 오른쪽 칸에 버리기·손 칸·예상 점수를 두고, 판 아래 옛 줄은 없다', () => {
    setMediaMatches(true);
    render(<PaperSafariTable {...baseProps(build({ phase: 'PLACE', current: ME, held: { playerId: ME, source: 'DECK', card: { kind: 'NUMBER', value: 5 } } }))} />);
    const side = screen.getByTestId('my-side');
    expect(within(side).getByRole('button', { name: '버리기' })).toBeEnabled();
    expect(side.querySelector('[data-zone="hand:1"]')).not.toBeNull();
    expect(within(side).getByText(/현재 예상 점수/)).toBeInTheDocument();
    expect(screen.getAllByText(/현재 예상 점수/)).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: '버리기' })).toHaveLength(1);
    expect(document.querySelectorAll('[data-zone="hand:1"]')).toHaveLength(1);
  });

  it.each([true, false])('뽑은 카드는 위로 밀려 올라가지 않고 자기 칸 안에서만 살짝 기운다 (PC 배치 %s)', (wide) => {
    setMediaMatches(wide);
    render(<PaperSafariTable {...baseProps(build({ phase: 'PLACE', current: ME, held: { playerId: ME, source: 'DECK', card: { kind: 'NUMBER', value: 5 } } }))} />);
    const card = screen.getByLabelText('들고 있는 카드');
    expect(card.className).not.toMatch(/(^|\s)-translate-y/);
    expect(card).toHaveClass('-rotate-6');
    const handBox = (document.querySelector('[data-zone="hand:1"]') as HTMLElement).parentElement as HTMLElement;
    expect(handBox).toHaveClass('py-1.5');
  });

  it('내 차례 테두리는 판 안쪽에 그려 위 정보를 덮지 않는다', () => {
    setMediaMatches(false);
    render(<PaperSafariTable {...baseProps(build({ phase: 'DRAW', current: ME }))} />);
    const board = screen.getByTestId('board-1');
    expect(board).toHaveClass('ring-inset', 'turn-ring');
    expect(board).not.toHaveClass('ring-4');
  });

  it('되돌리기로 PLACE에서 DRAW로 돌아와도 내 차례 소리는 다시 나지 않는다', () => {
    const play = vi.fn();
    const held: HeldView = { playerId: ME, source: 'DISCARD', card: { kind: 'NUMBER', value: 4 } };
    const myTurnPlays = () => play.mock.calls.filter(([name]) => name === 'myTurn');
    const ui = (view: PaperSafariSessionView) => (
      <SoundContext.Provider value={{ ...SILENT_SOUND, play }}>
        <PaperSafariTable {...baseProps(view)} />
      </SoundContext.Provider>
    );
    const { rerender } = render(ui(build({ phase: 'DRAW', current: OPPONENT })));
    rerender(ui(build({ phase: 'DRAW', current: ME })));
    expect(myTurnPlays()).toHaveLength(1);
    rerender(ui(build({ phase: 'PLACE', current: ME, held })));
    rerender(ui(build({ phase: 'DRAW', current: ME })));
    expect(myTurnPlays()).toHaveLength(1);
  });
});
