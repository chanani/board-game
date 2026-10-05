import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { BoardView, CardView, HeldView, PaperSafariSessionView, Room, SlotView, TurnPhase } from '../../api/types';
import { PaperSafariTable } from './PaperSafariTable';

const ME = 1;
const OPPONENT = 2;

const room: Room = {
  code: 'ABC123', name: '테스트 방', gameType: 'PAPER_SAFARI', gameTypeName: '페이퍼 사파리', status: 'PLAYING',
  hostId: ME, maxPlayers: 4,
  members: [
    { id: ME, nickname: '앨리스', host: true, connected: true, offlineSeconds: 0 },
    { id: OPPONENT, nickname: '밥', host: false, connected: true, offlineSeconds: 0 },
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
    readyPlayerIds: [],
    game: {
      viewerId: ME, status: 'IN_ROUND', roundNumber: 1, tokens: {}, lastRoundResult: null, winnerId: null,
      round: {
        phase, currentPlayerId: current, deckSize: 40, discardTop: { kind: 'NUMBER', value: 4 }, held,
        boards: [{ playerId: ME, slots: mine }, { playerId: OPPONENT, slots: faceDown() }],
      },
    },
  };
}

const nicknameOf = (memberId: number) => room.members.find((member) => member.id === memberId)?.nickname ?? '떠난 플레이어';

function tableFor(view: PaperSafariSessionView, send: () => void, targetRoom: Room = room, onForfeit: (id: number) => void = vi.fn(), now = 0) {
  return (
    <PaperSafariTable view={view} room={targetRoom} meId={ME} log={[]} send={send} nicknameOf={nicknameOf}
      receivedAt={0} now={now} onForfeit={onForfeit} onCloseGameOver={vi.fn()} />
  );
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

describe('PaperSafariTable 접속 상태와 내보내기', () => {
  const offlineRoom = (seconds: number): Room => ({
    ...room,
    members: [room.members[0], { ...room.members[1], connected: false, offlineSeconds: seconds }],
  });

  it('60초 이상 끊긴 상대는 내보내기 버튼이 보이고 누르면 onForfeit을 부른다', async () => {
    const onForfeit = vi.fn();
    render(tableFor(build({ phase: 'DRAW', current: ME }), vi.fn(), offlineRoom(60), onForfeit));

    await userEvent.click(screen.getByRole('button', { name: '내보내기' }));

    expect(onForfeit).toHaveBeenCalledWith(OPPONENT);
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
});
