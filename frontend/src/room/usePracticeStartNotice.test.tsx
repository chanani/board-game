import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Room, RoomMember } from '../api/types';
import { ToastProvider } from '../components/Toast';
import { PRACTICE_START_MESSAGE, usePracticeStartNotice } from './usePracticeStartNotice';

const human: RoomMember = { id: 1, nickname: '나', host: true, connected: true, ready: false } as RoomMember;
const bot: RoomMember = { id: -1, nickname: '컴퓨터 1', host: false, connected: true, ready: true, bot: true, difficulty: 'EASY' } as RoomMember;

function roomOf(status: Room['status'], members: RoomMember[], code = 'ABC234'): Room {
  return { code, name: '방', gameType: 'UNO', gameTypeName: '우노', status, hostId: 1, maxPlayers: 4, locked: false, members, spectators: [], theme: 'TABLE' } as unknown as Room;
}

function Probe({ room }: { room: Room | null }) {
  usePracticeStartNotice(room);
  return null;
}

function renderWith(room: Room | null) {
  return render(<ToastProvider><Probe room={room} /></ToastProvider>);
}

describe('usePracticeStartNotice', () => {
  it('컴퓨터가 있는 방이 대기에서 게임 중으로 바뀌면 전적에 들어가지 않는다고 알린다', () => {
    const view = renderWith(roomOf('WAITING', [human, bot]));
    expect(screen.queryByText(PRACTICE_START_MESSAGE)).toBeNull();

    view.rerender(<ToastProvider><Probe room={roomOf('PLAYING', [human, bot])} /></ToastProvider>);

    expect(screen.getByText(PRACTICE_START_MESSAGE)).toBeTruthy();
  });

  it('시작 카운트다운 중에는 알리지 않고, 카운트다운이 끝나 게임이 시작될 때 알린다', () => {
    const counting = { ...roomOf('WAITING', [human, bot]), startsAt: 3000, serverNow: 0 };
    const view = renderWith(roomOf('WAITING', [human, bot]));

    view.rerender(<ToastProvider><Probe room={counting} /></ToastProvider>);
    expect(screen.queryByText(PRACTICE_START_MESSAGE)).toBeNull();

    view.rerender(<ToastProvider><Probe room={roomOf('PLAYING', [human, bot])} /></ToastProvider>);
    expect(screen.getByText(PRACTICE_START_MESSAGE)).toBeTruthy();
  });

  it('사람끼리 시작한 게임에는 알리지 않는다', () => {
    const other: RoomMember = { ...human, id: 2, host: false };
    const view = renderWith(roomOf('WAITING', [human, other]));

    view.rerender(<ToastProvider><Probe room={roomOf('PLAYING', [human, other])} /></ToastProvider>);

    expect(screen.queryByText(PRACTICE_START_MESSAGE)).toBeNull();
  });

  it('이미 게임 중인 방에 들어오면 알리지 않는다', () => {
    renderWith(roomOf('PLAYING', [human, bot]));

    expect(screen.queryByText(PRACTICE_START_MESSAGE)).toBeNull();
  });
});
