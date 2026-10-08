import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Room, UnoSessionView, UnoView } from '../../api/types';
import { LANDSCAPE_PHONE_QUERY } from '../../lib/useTableLayout';
import { setMediaMatches } from '../../test/media';
import { UNO_SIZES } from './layout';
import { RING_SCALE } from './UnoCenter';
import { UnoTable } from './UnoTable';
import { num, unoSession } from './unoFixtures';

const toast = vi.hoisted(() => ({ show: vi.fn() }));
vi.mock('../../components/Toast', () => ({ useToast: () => toast }));

const room: Room = {
  code: 'UNO123', name: '우노 방', gameType: 'UNO', gameTypeName: '우노', status: 'PLAYING', hostId: 1, maxPlayers: 5,
  locked: false, spectators: [], theme: 'WOOD',
  members: [
    { id: 1, nickname: '앨리스', host: true, connected: true, offlineSeconds: 0, ready: false },
    { id: 2, nickname: '밥', host: false, connected: true, offlineSeconds: 0, ready: false },
    { id: 3, nickname: '캐롤', host: false, connected: false, offlineSeconds: 12, ready: false },
  ],
};
const nicknameOf = (id: number) => room.members.find((member) => member.id === id)?.nickname ?? '떠난 플레이어';

function renderTable(overrides: Partial<UnoView> = {}, send = vi.fn()) {
  const view: UnoSessionView = unoSession(overrides);
  render(<UnoTable view={view} room={room} meId={1} log={[]} receivedAt={0} now={0} errorSeq={0} nicknameOf={nicknameOf}
    send={send} onCloseGameOver={vi.fn()} onReadyNext={vi.fn()} />);
  return send;
}

describe('UnoTable 배치', () => {
  it('상대 자리에 이름·장수·우노 배지를 보여 준다', () => {
    renderTable({ players: [
      { playerId: 1, cardCount: 3, unoDeclared: false },
      { playerId: 2, cardCount: 1, unoDeclared: true },
      { playerId: 3, cardCount: 9, unoDeclared: false },
    ] });

    expect(screen.getAllByTestId('uno-seat')).toHaveLength(2);
    const bob = screen.getByRole('group', { name: '밥, 카드 1장, 우노' });
    expect(within(bob).getByTestId('uno-badge')).toHaveTextContent('우노');
    expect(within(screen.getByRole('group', { name: '캐롤, 카드 9장' })).getByTestId('card-count')).toHaveTextContent('9장');
    expect(screen.getByText('연결 끊김 12초')).toBeInTheDocument();
  });

  it('잡기 창 대상의 자리에 느낌표 배지를 단다', () => {
    renderTable({ unoCatch: { playerId: 2 } });

    expect(within(screen.getByRole('group', { name: '밥, 카드 7장' })).getByTestId('catch-badge')).toBeInTheDocument();
  });

  it('가운데에 뽑을 더미·버린 더미·현재 색·방향을 보여 준다', () => {
    renderTable({ currentColor: 'GREEN', direction: 'COUNTER_CLOCKWISE', drawPileCount: 61, discardCount: 3 });

    const center = screen.getByTestId('uno-center');
    expect(within(center).getByRole('button', { name: '카드 뽑기, 남은 61장' })).toHaveTextContent('61장');
    expect(within(center).getByRole('img', { name: '빨강 5' })).toBeInTheDocument();
    expect(within(center).getAllByTestId('discard-under')).toHaveLength(2);
    expect(screen.getByTestId('color-ring')).toHaveAttribute('data-color', 'GREEN');
    expect(screen.getByTestId('current-color')).toHaveTextContent('지금 색: 초록');
    expect(within(center).getByRole('img', { name: '진행 방향: 시계 반대 방향' })).toBeInTheDocument();
  });

  it('내 PLAY 차례에는 뽑을 더미를 누르면 DRAW를 보낸다', async () => {
    const send = renderTable();

    await userEvent.click(within(screen.getByTestId('uno-center')).getByRole('button', { name: /^카드 뽑기/ }));

    expect(send).toHaveBeenCalledWith({ type: 'DRAW' });
  });

  it('행동 바의 카드 뽑기도 DRAW를 보낸다', async () => {
    const send = renderTable();

    await userEvent.click(within(screen.getByTestId('uno-action-bar')).getByRole('button', { name: '카드 뽑기' }));

    expect(send).toHaveBeenCalledWith({ type: 'DRAW' });
  });

  it('뽑을 차례면 버튼 사각 테두리 대신 카드 더미가 떠오르며 빛나고, 키보드 포커스 링은 카드 모서리를 따른다', () => {
    renderTable();

    const button = within(screen.getByTestId('uno-center')).getByRole('button', { name: /^카드 뽑기/ });
    expect(button).not.toHaveClass('turn-glow');
    expect(button).toHaveClass('outline-none');
    const stack = within(button).getByTestId('draw-stack');
    expect(stack).toHaveClass('uno-deck-ready', 'group-focus-visible:outline-2');
    expect(stack.style.borderRadius).not.toBe('');
  });

  it('남의 차례에는 뽑을 더미가 빛나지 않는다', () => {
    renderTable({ currentPlayerId: 2 });

    expect(screen.getByTestId('draw-stack')).not.toHaveClass('uno-deck-ready');
  });

  it('남의 차례에는 뽑을 더미가 막히고 행동 바가 비어 있다', () => {
    renderTable({ currentPlayerId: 2, playableCardIds: [] });

    expect(within(screen.getByTestId('uno-center')).getByRole('button', { name: /^카드 뽑기/ })).toBeDisabled();
    expect(within(screen.getByTestId('uno-action-bar')).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByTestId('instruction')).toHaveTextContent('밥님의 차례예요.');
  });

  it('낼 수 있는 카드를 누르면 PLAY를 보낸다', async () => {
    setMediaMatches(true);
    const send = renderTable();

    await userEvent.click(screen.getByRole('button', { name: '빨강 2, 낼 수 있어요' }));

    expect(send).toHaveBeenCalledWith({ type: 'PLAY', cardId: 3 });
  });

  it('행동 줄은 좁은 화면에서 줄바꿈된다', () => {
    renderTable();

    const bar = screen.getByTestId('uno-action-bar');
    expect(bar.className).toContain('flex-wrap');
    expect(bar.className).toContain('min-h-12');
    expect(bar.className).not.toMatch(/(^|\s)h-12(\s|$)/);
  });

  it('DRAWN이면 뽑은 카드 내기와 갖고 넘기기를 보여 준다', async () => {
    const send = renderTable({ stage: 'DRAWN', drawnCardId: 13, playableCardIds: [13], hand: [num('RED', 2, 3), num('RED', 7, 13)] });
    const bar = screen.getByTestId('uno-action-bar');

    await userEvent.click(within(bar).getByRole('button', { name: '뽑은 카드 내기' }));
    expect(send).toHaveBeenLastCalledWith({ type: 'PLAY', cardId: 13 });
    expect(screen.getByRole('button', { name: '빨강 2' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('와일드 카드를 누르면 색을 고를 때까지 아무것도 보내지 않고 색 고르기 창이 뜬다', async () => {
    setMediaMatches(true);
    const send = renderTable();

    await userEvent.click(screen.getByRole('button', { name: '와일드, 낼 수 있어요' }));

    expect(await screen.findByRole('dialog', { name: '색을 골라 주세요' })).toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();
  });

  it('갖고 넘기기는 KEEP을 보낸다', async () => {
    const send = renderTable({ stage: 'DRAWN', drawnCardId: 13, playableCardIds: [13], hand: [num('RED', 2, 3), num('RED', 7, 13)] });

    await userEvent.click(screen.getByRole('button', { name: '갖고 넘기기' }));

    expect(send).toHaveBeenCalledWith({ type: 'KEEP' });
  });

  it('관전자는 손패 대신 관전 안내를 보고 행동 바가 없다', () => {
    renderTable({ viewerId: 9, hand: null, playableCardIds: [], currentPlayerId: 2 });

    expect(screen.getByText('관전 중이에요')).toBeInTheDocument();
    expect(screen.queryByTestId('uno-action-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('uno-hand')).not.toBeInTheDocument();
  });

  it('PC·세로·눕힌 화면 배치를 고른다', () => {
    setMediaMatches(true);
    const { unmount } = render(<UnoTable view={unoSession()} room={room} meId={1} log={[]} receivedAt={0} now={0} errorSeq={0}
      nicknameOf={nicknameOf} send={vi.fn()} onCloseGameOver={vi.fn()} onReadyNext={vi.fn()} />);
    expect(screen.getByTestId('uno-table')).toHaveAttribute('data-layout', 'pc');
    unmount();

    setMediaMatches(false);
    const portrait = render(<UnoTable view={unoSession()} room={room} meId={1} log={[]} receivedAt={0} now={0} errorSeq={0}
      nicknameOf={nicknameOf} send={vi.fn()} onCloseGameOver={vi.fn()} onReadyNext={vi.fn()} />);
    expect(screen.getByTestId('uno-table')).toHaveAttribute('data-layout', 'portrait');
    portrait.unmount();

    setMediaMatches((query) => query === LANDSCAPE_PHONE_QUERY);
    render(<UnoTable view={unoSession()} room={room} meId={1} log={[]} receivedAt={0} now={0} errorSeq={0}
      nicknameOf={nicknameOf} send={vi.fn()} onCloseGameOver={vi.fn()} onReadyNext={vi.fn()} aside={<p>상태 바</p>} asideFooter={<p>채팅 줄</p>} />);
    const aside = screen.getByTestId('table-aside');
    expect(screen.getByTestId('landscape-table')).toBeInTheDocument();
    expect(within(aside).getByText('상태 바')).toBeInTheDocument();
    expect(within(aside).getByText('채팅 줄')).toBeInTheDocument();
    expect(within(aside).getByTestId('turn-bar')).toBeInTheDocument();
  });

  it('PC 테이블은 화면 높이에 맞춰 펠트 높이를 줄여 손패와 행동 줄까지 한 화면에 들어간다', () => {
    setMediaMatches(true);
    renderTable();

    const felt = screen.getByTestId('uno-table').querySelector('.felt') as HTMLElement;
    expect(felt.className).toContain('min-h-[min(560px,calc(100dvh-34rem))]');
    expect(felt.className).not.toContain('60vh');
  });

  it('눕힌 화면의 펠트는 상대 자리와 가운데 더미를 가로로 나란히 둔다', () => {
    setMediaMatches((query) => query === LANDSCAPE_PHONE_QUERY);
    renderTable();

    const felt = screen.getByTestId('uno-table').querySelector('.felt') as HTMLElement;
    expect(felt.className).toContain('flex-row');
    expect(felt.className).not.toContain('flex-col');
  });

  it('상대 자리는 진행 방향 화살표 위에 그리고, 화살표 고리는 가운데 더미 가까이 작게 둔다', () => {
    setMediaMatches(true);
    renderTable();

    screen.getAllByTestId('opponent-seat').forEach((seat) => expect(seat.className).toContain('z-10'));
    const arrows = screen.getByRole('img', { name: '진행 방향: 시계 방향' });
    expect(Number(arrows.getAttribute('width'))).toBeCloseTo(UNO_SIZES.pc.center * RING_SCALE);
    expect(RING_SCALE).toBeLessThanOrEqual(2.6);
  });

  it('PC에서 상대가 3명 이상이면 왼쪽·위·오른쪽으로 펼쳐 앉힌다', () => {
    setMediaMatches(true);
    renderTable({ players: [1, 2, 3, 4, 5].map((playerId) => ({ playerId, cardCount: 7, unoDeclared: false })), participantIds: [1, 2, 3, 4, 5] });

    const top = screen.getByTestId('seat-row-top');
    expect(top.className).toContain('justify-around');
    expect(within(top).getAllByTestId('opponent-seat')).toHaveLength(2);
    expect(within(screen.getByTestId('seat-left')).getByTestId('opponent-seat')).toBeInTheDocument();
    expect(within(screen.getByTestId('seat-right')).getByTestId('opponent-seat')).toBeInTheDocument();
  });

  it('PC에서는 내 차례 안내를 긴 문구로 보여 준다', () => {
    setMediaMatches(true);
    renderTable();

    expect(screen.getByTestId('instruction')).toHaveTextContent('낼 카드를 고르거나 카드를 뽑으세요.');
  });

  it('내 차례면 안내 바에 "내 차례" 표시가 붙고 손패 위에 남은 초를 담은 리본이 뜬다(손패 칸 테두리는 없다)', () => {
    renderTable({ deadline: 12_000, serverNow: 0 });

    expect(within(screen.getByTestId('turn-bar')).getByTestId('my-turn-badge')).toHaveTextContent('내 차례');
    const mine = screen.getByTestId('my-area');
    expect(mine).toHaveAttribute('data-active', 'true');
    expect(mine).not.toHaveClass('turn-ring');
    expect(mine.className).not.toMatch(/ring-/);
    const ribbon = within(mine).getByTestId('my-turn-ribbon');
    expect(ribbon).toHaveTextContent('내 차례 · 12초');
    expect(ribbon).toHaveClass('whitespace-nowrap');
    expect(ribbon.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(within(ribbon).getByTestId('my-turn-ribbon-dot')).toHaveClass('live-dot');
    expect(screen.queryByTestId('turn-tag')).not.toBeInTheDocument();
  });

  it.each(['DRAWN', 'CHOOSE_COLOR'] as const)('%s 단계에서도 내가 결정할 차례면 리본이 뜬다', (stage) => {
    renderTable({ stage, deadline: 8_000, serverNow: 0 });

    expect(screen.getByTestId('my-turn-ribbon')).toHaveTextContent('내 차례 · 8초');
  });

  it('상대 차례면 그 상대 자리만 강조 테두리와 "차례" 표시로 돋보이고 내 칸은 강조하지 않는다', () => {
    renderTable({ currentPlayerId: 2 });

    const bob = screen.getByRole('group', { name: '밥, 카드 7장, 차례' });
    expect(bob).toHaveAttribute('data-active', 'true');
    expect(bob).toHaveClass('turn-ring');
    expect(within(bob).getByTestId('turn-tag')).toHaveTextContent('차례');
    expect(screen.getByRole('group', { name: '캐롤, 카드 7장' })).not.toHaveAttribute('data-active');
    expect(screen.getByTestId('my-area')).not.toHaveClass('turn-ring');
    expect(screen.queryByTestId('my-turn-badge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('my-turn-ribbon')).not.toBeInTheDocument();
  });
});
