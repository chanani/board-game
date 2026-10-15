import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const motionState = vi.hoisted(() => ({ reduce: false }));
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('motion/react')>()),
  useReducedMotion: () => motionState.reduce,
}));
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

  it('시작 카운트다운 중에는 방장의 시작 버튼과 참가자의 준비 버튼을 잠근다', () => {
    const counting: Room = { ...room, startsAt: 3000, serverNow: 0 };
    const host = renderBar(1, counting);
    expect(screen.getByRole('button', { name: '게임 시작' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '게임 시작' })).toHaveAttribute('title', '곧 게임이 시작돼요');
    host.unmount();

    renderBar(2, counting);
    expect(screen.getByRole('button', { name: '준비 취소' })).toBeDisabled();
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

  it('동작 줄이기에서는 체크와 글자가 등장 효과 없이 바로 최종 모습이다', () => {
    motionState.reduce = true;
    try {
      const view = renderBar(2, notReadyRoom);
      view.rerender(<WaitingActionBar room={room} meId={2} spectating={false} onStart={vi.fn()} onReady={vi.fn()} onSeat={vi.fn()} />);
      const cancel = screen.getByRole('button', { name: '준비 취소' });

      expect(cancel.querySelector('path')?.getAttribute('pathLength')).not.toBe('0');
      expect(screen.getByText('준비 취소').style.opacity).not.toBe('0');
    } finally {
      motionState.reduce = false;
    }
  });

  it('처음부터 준비 상태로 열면 등장 효과 없이 바로 보인다', () => {
    renderBar(2);

    expect(screen.getByText('준비 취소').style.opacity).not.toBe('0');
  });

  it('준비 상태가 바뀌면 글자가 투명에서 올라오며 나타난다', () => {
    const view = renderBar(2, notReadyRoom);
    view.rerender(<WaitingActionBar room={room} meId={2} spectating={false} onStart={vi.fn()} onReady={vi.fn()} onSeat={vi.fn()} />);

    expect(screen.getByText('준비 취소').style.opacity).toBe('0');
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

  it('수박게임 방에 방장 혼자면 혼자 시작 버튼이 켜져 있고 친구가 오면 함께 겨룬다고 알려 준다', () => {
    const onStart = vi.fn();
    const fruit: Room = { ...room, gameType: 'FRUIT_STACK', gameTypeName: '수박게임', members: [room.members[0]] };
    render(<WaitingActionBar room={fruit} meId={1} spectating={false} onStart={onStart} onReady={vi.fn()} onSeat={vi.fn()} />);
    const start = screen.getByRole('button', { name: '혼자 시작' });

    expect(start).toBeEnabled();
    expect(start).not.toHaveAttribute('title');
    expect(screen.getByTestId('solo-hint')).toHaveTextContent('혼자 최고 점수에 도전해요. 친구가 들어오면 함께 겨뤄요.');
    expect(screen.queryByText(/2명 이상/)).not.toBeInTheDocument();
    start.click();
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('수박게임 방도 두 명부터는 예전처럼 게임 시작이고 혼자 안내가 없다', () => {
    renderBar(1, { ...room, gameType: 'FRUIT_STACK', gameTypeName: '수박게임' });

    expect(screen.getByRole('button', { name: '게임 시작' })).toBeEnabled();
    expect(screen.queryByTestId('solo-hint')).not.toBeInTheDocument();
  });

  it('혼자 방(정원 1명)의 혼자 시작 안내는 친구 이야기를 하지 않는다', () => {
    const fruit: Room = { ...room, gameType: 'FRUIT_STACK', gameTypeName: '수박게임', maxPlayers: 1, members: [room.members[0]] };
    renderBar(1, fruit);

    expect(screen.getByTestId('solo-hint')).toHaveTextContent(/^혼자 최고 점수에 도전해요\.$/);
  });

  it('시작할 수 있으면 title이 없다', () => {
    renderBar(1);
    const start = screen.getByRole('button', { name: '게임 시작' });
    expect(start).toBeEnabled();
    expect(start).not.toHaveAttribute('title');
    expect(start).not.toHaveAttribute('aria-describedby');
  });

  it('방장의 게임 시작 버튼과 참가자의 준비 버튼은 감싸는 종이 상자 없이 버튼만 있다', () => {
    const host = renderBar(1);
    const bar = screen.getByTestId('waiting-action-bar');
    expect(bar).not.toHaveClass('paper');
    expect(bar.className).not.toMatch(/\b(border|bg-|shadow|px-|py-)/);
    expect(bar).toContainElement(screen.getByRole('button', { name: '게임 시작' }));
    expect(bar).toHaveTextContent(/^게임 시작$/);
    host.unmount();

    renderBar(2);
    expect(screen.getByTestId('waiting-action-bar')).not.toHaveClass('paper');
  });

  it('관전자는 안내 문구가 있어 종이 카드 안에 둔다', () => {
    render(<WaitingActionBar room={room} meId={9} spectating onStart={vi.fn()} onReady={vi.fn()} onSeat={vi.fn()} />);
    expect(screen.getByTestId('waiting-action-bar')).toHaveClass('paper');
    expect(screen.getByText('관전 중')).toBeInTheDocument();
  });
});
