import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Room } from '../api/types';
import { WaitingActionBar } from './WaitingActionBar';

const room: Room = {
  code: 'ABC234', name: '방', gameType: 'PAPER_SAFARI', gameTypeName: '페이퍼 사파리', status: 'WAITING', hostId: 1, maxPlayers: 4, locked: false, spectators: [], theme: 'WOOD',
  members: [
    { id: 1, nickname: '앨리스', host: true, connected: true, offlineSeconds: 0, ready: false },
    { id: 2, nickname: '밥', host: false, connected: true, offlineSeconds: 0, ready: true },
  ],
};

const notReadyRoom: Room = { ...room, members: [room.members[0], { ...room.members[1], ready: false }] };

function renderBar(meId: number, shown: Room = room) {
  return render(<WaitingActionBar room={shown} meId={meId} spectating={false} onStart={vi.fn()} onReady={vi.fn()} onSeat={vi.fn()} />);
}

describe('WaitingActionBar', () => {
  it('준비 현황 문구 없이 버튼만 가운데에 둔다', () => {
    renderBar(2);

    expect(screen.queryByText(/준비 \d\/\d/)).not.toBeInTheDocument();
    expect(screen.queryByText(/방장이/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '준비 취소' }).closest('[data-testid="waiting-action-bar"]')).toHaveClass('justify-center');
  });

  it('준비 취소는 회색 버튼이다', () => {
    renderBar(2);

    expect(screen.getByRole('button', { name: '준비 취소' })).toHaveClass('bg-stone-200');
  });

  it('준비 취소 상태에는 체크 아이콘이 있고, 준비하기에는 없다', () => {
    const view = renderBar(2);
    const cancel = screen.getByRole('button', { name: '준비 취소' });
    expect(cancel.querySelector('[data-testid="ready-check"]')).not.toBeNull();
    expect(cancel).toHaveClass('transition-colors');

    view.rerender(<WaitingActionBar room={notReadyRoom} meId={2} spectating={false} onStart={vi.fn()} onReady={vi.fn()} onSeat={vi.fn()} />);
    expect(screen.getByRole('button', { name: '준비하기' }).querySelector('[data-testid="ready-check"]')).toBeNull();
  });

  it('준비 상태가 바뀌어도 같은 버튼 요소라 키보드 포커스를 잃지 않는다', () => {
    const view = renderBar(2, notReadyRoom);
    const button = screen.getByRole('button', { name: '준비하기' });
    button.focus();

    view.rerender(<WaitingActionBar room={room} meId={2} spectating={false} onStart={vi.fn()} onReady={vi.fn()} onSeat={vi.fn()} />);

    const after = screen.getByRole('button', { name: '준비 취소' });
    expect(after).toBe(button);
    expect(document.activeElement).toBe(after);
  });

  it('시작할 수 없으면 버튼이 꺼지고 이유는 title과 숨김 문구에 담긴다', () => {
    renderBar(1, { ...room, members: [room.members[0]] });
    const start = screen.getByRole('button', { name: '게임 시작' });

    expect(start).toBeDisabled();
    expect(start).toHaveAttribute('title', '2명 이상 모여야 해요');
    const reason = document.getElementById(start.getAttribute('aria-describedby') ?? '');
    expect(reason).toHaveClass('sr-only');
    expect(reason).toHaveTextContent('2명 이상 모여야 해요');
  });

  it('시작할 수 있으면 title이 없다', () => {
    renderBar(1);
    const start = screen.getByRole('button', { name: '게임 시작' });
    expect(start).toBeEnabled();
    expect(start).not.toHaveAttribute('title');
    expect(start).not.toHaveAttribute('aria-describedby');
  });
});
