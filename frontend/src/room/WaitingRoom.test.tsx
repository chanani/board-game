import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../api/chat';
import type { Room } from '../api/types';
import { ToastProvider } from '../components/Toast';
import { setMediaMatches } from '../test/media';
import { WaitingRoom } from './WaitingRoom';

const room: Room = {
  code: 'ABC234', name: '방', gameType: 'PAPER_SAFARI', gameTypeName: '페이퍼 사파리', status: 'WAITING', hostId: 1, maxPlayers: 4, locked: false, spectators: [], theme: 'WOOD',
  members: [
    { id: 1, nickname: '앨리스', host: true, connected: true, offlineSeconds: 0, ready: false },
    { id: 2, nickname: '밥', host: false, connected: false, offlineSeconds: 70, ready: false },
  ],
};

type Overrides = { room?: Room; meId?: number; onSeat?: () => void; onReady?: (ready: boolean) => unknown; onStart?: () => void; onForfeit?: (memberId: number) => void; onKick?: (memberId: number) => unknown };

function renderRoom({ room: shown = room, meId = 1, onSeat = vi.fn(), onReady = vi.fn(), onStart = vi.fn(), onForfeit = vi.fn(), onKick = vi.fn() }: Overrides = {}) {
  return render(
    <ToastProvider>
      <WaitingRoom room={shown} meId={meId} receivedAt={0} now={0} onStart={onStart} onReady={onReady} onForfeit={onForfeit} onKick={onKick} onSeat={onSeat}
        chat={{ messages: [{ id: 1, memberId: 2, nickname: '밥', text: '준비할게요', sentAt: '2026-10-06T00:00:00Z' }], onSend: vi.fn(() => true) }} />
    </ToastProvider>,
  );
}

const readyRoom: Room = { ...room, members: [room.members[0], { ...room.members[1], ready: true }] };

describe('WaitingRoom', () => {
  it('최대 인원만큼 의자를 놓고 빈자리를 보여준다', () => {
    renderRoom();

    expect(screen.getAllByTestId('chair')).toHaveLength(4);
    expect(screen.getAllByLabelText('빈자리')).toHaveLength(2);
    // 빈자리 글씨는 투명도 대신 테마별 흐린 글자색을 쓴다(밝은 펠트에서 대비 유지).
    expect(screen.getAllByText('빈자리')[0]).toHaveClass('felt-ink-muted');
    expect(screen.getAllByText('빈자리')[0].className).not.toMatch(/opacity-/);
    expect(screen.getByText('앨리스')).toBeInTheDocument();
  });

  it('의자마다 방장·준비 상태 칩을 단다', () => {
    renderRoom({ room: { ...room, maxPlayers: 3, members: [...room.members, { id: 5, nickname: '에린', host: false, connected: true, offlineSeconds: 0, ready: true }] } });

    expect(screen.getByText('방장')).toBeInTheDocument();
    expect(screen.getByText('준비 전')).toBeInTheDocument();
    expect(screen.getByText('준비 완료')).toBeInTheDocument();
  });

  it('60초 넘게 끊긴 사람은 방장이 아니어도 내보내기 버튼이 있다', async () => {
    const onForfeit = vi.fn();
    const erin = { id: 5, nickname: '에린', host: false, connected: true, offlineSeconds: 0, ready: false };
    renderRoom({ room: { ...room, members: [...room.members, erin] }, meId: 5, onForfeit });

    await userEvent.click(screen.getByRole('button', { name: '내보내기' }));

    expect(onForfeit).toHaveBeenCalledWith(2);
  });

  it('방장은 대기 중에 다른 참가자를 확인 창을 거쳐 내보낼 수 있다', async () => {
    const onKick = vi.fn();
    const erin = { id: 5, nickname: '에린', host: false, connected: true, offlineSeconds: 0, ready: false };
    renderRoom({ room: { ...room, members: [...room.members, erin] }, onKick });

    const chairs = screen.getAllByTestId('chair');
    expect(within(chairs[0]).queryByRole('button', { name: '내보내기' })).not.toBeInTheDocument();
    await userEvent.click(within(chairs[2]).getByRole('button', { name: '내보내기' }));

    const dialog = screen.getByRole('dialog');
    // 모달은 motion으로 첫 프레임에 opacity 0을 그리므로, 애니메이션 프레임이 돈 뒤에 보이는지 확인한다.
    await waitFor(() => expect(within(dialog).getByText('에린님을 내보낼까요?')).toBeVisible());
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));
    expect(onKick).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await userEvent.click(within(chairs[2]).getByRole('button', { name: '내보내기' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '내보내기' }));
    expect(onKick).toHaveBeenCalledWith(5);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('방장이 아니면 연결된 참가자를 내보낼 수 없다', () => {
    renderRoom({ room: { ...room, members: [room.members[0], { ...room.members[1], connected: true, offlineSeconds: 0 }] }, meId: 2 });

    expect(screen.queryByRole('button', { name: '내보내기' })).not.toBeInTheDocument();
  });

  it('방장은 모두 준비하면 시작 버튼을 누를 수 있다', async () => {
    const onStart = vi.fn();
    renderRoom({ room: readyRoom, onStart });

    await userEvent.click(screen.getByRole('button', { name: '게임 시작' }));

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('테이블 위에는 자리만 두고 시작·준비 버튼과 준비 현황은 테이블 아래 행동 바에 둔다', () => {
    const { container } = renderRoom();
    const felt = container.querySelector('.felt') as HTMLElement;
    const bar = screen.getByTestId('waiting-action-bar');

    expect(within(felt).queryByRole('button', { name: '게임 시작' })).not.toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: '게임 시작' })).toBeInTheDocument();
    expect(bar).not.toHaveTextContent('준비 0/1');
    expect(felt.contains(bar)).toBe(false);
    expect(within(felt).queryByText(/코드/)).not.toBeInTheDocument();
    // 행동 바는 펠트 다음(아래)에 온다.
    expect(felt.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('참가자와 관전자의 주 버튼도 행동 바에 있다', () => {
    const view = renderRoom({ meId: 2 });
    expect(within(screen.getByTestId('waiting-action-bar')).getByRole('button', { name: '준비하기' })).toBeInTheDocument();
    view.unmount();
    renderRoom({ room: { ...room, spectators: [{ id: 3, nickname: '캐롤' }] }, meId: 3 });
    const bar = screen.getByTestId('waiting-action-bar');
    expect(within(bar).getByRole('button', { name: '자리에 앉기' })).toBeInTheDocument();
    expect(bar).toHaveTextContent('관전 중');
  });

  it('준비하지 않은 참가자가 있으면 방장의 시작 버튼이 꺼지고 이유를 알려 준다', () => {
    renderRoom();

    expect(screen.getByRole('button', { name: '게임 시작' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '게임 시작' })).toHaveAttribute('title', '모두 준비하면 시작할 수 있어요');
  });

  it('혼자면 2명 이상 모여야 한다고 알려 준다', () => {
    renderRoom({ room: { ...room, members: [room.members[0]] } });

    expect(screen.getByRole('button', { name: '게임 시작' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '게임 시작' })).toHaveAttribute('title', '2명 이상 모여야 해요');
  });

  it('PC에서는 규칙 패널을 펼쳐 둔다', () => {
    setMediaMatches(true);
    renderRoom();

    expect(screen.getByText('페이퍼 사파리 규칙')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '규칙 보기' })).not.toBeInTheDocument();
  });

  it('모바일에서는 규칙 패널 대신 규칙 보기 버튼이 있고 누르면 규칙 창이 열린다', async () => {
    setMediaMatches(false);
    renderRoom();

    expect(screen.queryByText('페이퍼 사파리 규칙')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '규칙 보기' }));
    expect(await screen.findByRole('dialog', { name: '페이퍼 사파리 규칙' })).toBeInTheDocument();
  });

  it('참가자는 준비하기로 준비하고 준비 취소로 되돌린다', async () => {
    const onReady = vi.fn();
    const view = renderRoom({ meId: 2, onReady });

    await userEvent.click(screen.getByRole('button', { name: '준비하기' }));
    expect(onReady).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('button', { name: '게임 시작' })).not.toBeInTheDocument();

    view.unmount();
    renderRoom({ room: readyRoom, meId: 2, onReady });
    await userEvent.click(screen.getByRole('button', { name: '준비 취소' }));
    expect(onReady).toHaveBeenLastCalledWith(false);
  });

  it('옆에 채팅과 규칙이 항상 보인다', () => {
    const { container } = renderRoom();

    expect(screen.getByRole('textbox', { name: '채팅 입력' })).toBeInTheDocument();
    expect(screen.getByText('준비할게요')).toBeInTheDocument();
    expect(container.querySelector('details')).toBeNull();
    expect(screen.getByText(/합이 가장 낮은 사람이 1승/)).toBeVisible();
  });

  it('관전자가 있으면 관전 중인 사람을 보여준다', () => {
    renderRoom({ room: { ...room, spectators: [{ id: 3, nickname: '캐롤' }, { id: 4, nickname: '데이브' }] } });

    expect(screen.getByText('관전 중: 캐롤, 데이브')).toBeInTheDocument();
    // 오로라 눈밭·해변 모래 위에서도 읽히게 테마별 알약 바탕(pill)을 쓴다.
    expect(screen.getByText('관전 중: 캐롤, 데이브').closest('p')).toHaveClass('pill');
    expect(screen.queryByRole('button', { name: '자리에 앉기' })).not.toBeInTheDocument();
  });

  it('대기 중에 내가 관전자면 자리 안내와 자리에 앉기가 있고 시작·준비 버튼은 없다', async () => {
    const onSeat = vi.fn();
    renderRoom({ room: { ...room, spectators: [{ id: 3, nickname: '캐롤' }] }, meId: 3, onSeat });

    await userEvent.click(screen.getByRole('button', { name: '자리에 앉기' }));

    expect(onSeat).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/자리가 나면 앉을 수 있어요/)).toBeInTheDocument();
    expect(screen.queryByText(/게임이 끝나면 자동으로 참가해요/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /게임 시작|준비하기/ })).not.toBeInTheDocument();
  });

  it('정원이 찼으면 관전자도 자리에 앉기 버튼이 없다', () => {
    renderRoom({ room: { ...room, maxPlayers: 2, spectators: [{ id: 3, nickname: '캐롤' }] }, meId: 3 });

    expect(screen.queryByRole('button', { name: '자리에 앉기' })).not.toBeInTheDocument();
    expect(screen.getByText(/자리가 나면 앉을 수 있어요/)).toBeInTheDocument();
    expect(screen.queryByText(/게임이 끝나면 자동으로 참가해요/)).not.toBeInTheDocument();
  });

  it('준비 요청이 끝날 때까지 준비 버튼을 다시 누를 수 없다', async () => {
    let finish: () => void = () => {};
    const onReady = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    renderRoom({ meId: 2, onReady });

    await userEvent.click(screen.getByRole('button', { name: '준비하기' }));
    expect(screen.getByRole('button', { name: '준비하기' })).toBeDisabled();

    await act(async () => finish());
    expect(screen.getByRole('button', { name: '준비하기' })).toBeEnabled();
  });
  describe('채팅 말풍선', () => {
    const live = (id: number, memberId: number, text: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({
      id, memberId, nickname: memberId === 1 ? '앨리스' : '밥', text, sentAt: '2026-10-06T00:00:00Z', ...extra,
    });
    const view = (latest: ChatMessage | null, messages: ChatMessage[] = []) => (
      <ToastProvider>
        <WaitingRoom room={room} meId={1} receivedAt={0} now={0} onStart={vi.fn()} onReady={vi.fn()} onForfeit={vi.fn()} onKick={vi.fn()} onSeat={vi.fn()}
          chat={{ messages, onSend: vi.fn(() => true), latest }} />
      </ToastProvider>
    );

    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('앉은 사람이 지금 말하면 그 자리 위에 작은 말풍선이 뜨고 4초 뒤 사라진다', () => {
      const { rerender } = render(view(null));
      rerender(view(live(5, 2, '안녕하세요')));

      const bubble = screen.getByTestId('seat-bubble-2');
      expect(bubble).toHaveTextContent('안녕하세요');
      expect(bubble).toHaveAttribute('aria-hidden', 'true');
      expect(bubble).toHaveClass('line-clamp-2', 'max-w-[160px]');
      expect(within(screen.getAllByTestId('chair')[1]).getByTestId('seat-bubble-2')).toBe(bubble);

      act(() => { vi.advanceTimersByTime(3999); });
      expect(screen.getByTestId('seat-bubble-2')).toBeInTheDocument();
      act(() => { vi.advanceTimersByTime(1); });
      expect(screen.queryByTestId('seat-bubble-2')).not.toBeInTheDocument();
    });

    it('같은 사람이 다시 말하면 내용을 바꾸고 그때부터 4초를 다시 센다', () => {
      const { rerender } = render(view(null));
      rerender(view(live(5, 2, '안녕하세요')));
      act(() => { vi.advanceTimersByTime(3000); });
      rerender(view(live(6, 2, '준비할게요')));

      expect(screen.getByTestId('seat-bubble-2')).toHaveTextContent('준비할게요');
      act(() => { vi.advanceTimersByTime(3999); });
      expect(screen.getByTestId('seat-bubble-2')).toHaveTextContent('준비할게요');
      act(() => { vi.advanceTimersByTime(1); });
      expect(screen.queryByTestId('seat-bubble-2')).not.toBeInTheDocument();
    });

    it('자기 말도 자기 자리 위에 뜨고, 펠트 가장자리에 가까운 맨 위 자리는 한 줄만 보인다', () => {
      const { rerender } = render(view(null));
      rerender(view(live(5, 1, '시작할게요')));

      const bubble = within(screen.getAllByTestId('chair')[0]).getByTestId('seat-bubble-1');
      expect(bubble).toHaveTextContent('시작할게요');
      expect(bubble).toHaveClass('line-clamp-1');
    });

    it('대기실이 다시 그려질 때 이미 받은 지난 메시지는 띄우지 않고, 그 뒤 새 메시지는 띄운다', () => {
      const { rerender } = render(view(live(5, 2, '게임 중에 한 말')));
      expect(screen.queryByTestId('seat-bubble-2')).not.toBeInTheDocument();

      rerender(view(live(6, 2, '다시 한 판 해요')));
      expect(screen.getByTestId('seat-bubble-2')).toHaveTextContent('다시 한 판 해요');
    });

    it('기록으로만 있는 메시지에는 말풍선이 없다', () => {
      render(view(null, [live(1, 2, '예전 말')]));

      expect(screen.queryByTestId('seat-bubble-2')).not.toBeInTheDocument();
    });

    it('관전자의 말에는 말풍선이 없다', () => {
      const { rerender } = render(view(null));
      rerender(view(live(5, 2, '구경할게요', { spectator: true })));

      expect(screen.queryByTestId('seat-bubble-2')).not.toBeInTheDocument();
    });
  });
});
