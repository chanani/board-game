import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Room } from '../api/types';
import { RoomSettingsModal } from './RoomSettingsModal';

const member = (id: number, host = false) => ({ id, nickname: `플레이어${id}`, host, connected: true, offlineSeconds: 0, ready: false });
const room: Room = {
  code: 'ABC234', name: '앨리스의 방', gameType: 'PAPER_SAFARI', gameTypeName: '페이퍼 사파리', status: 'WAITING',
  hostId: 1, maxPlayers: 4, locked: false, members: [member(1, true), member(2), member(3)], spectators: [], theme: 'WOOD',
};

describe('RoomSettingsModal', () => {
  it('지금 인원보다 적은 칸은 비활성이고 안내를 보여 준다', async () => {
    render(<RoomSettingsModal open room={room} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(await screen.findByRole('radio', { name: '2' })).toBeDisabled();
    expect(screen.getByText('지금 3명이 있어서 2명 이하로는 줄일 수 없어요.')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '4' })).toHaveAttribute('aria-checked', 'true');
  });

  it('고른 인원과 테마로 저장하고 창을 닫는다', async () => {
    const onSave = vi.fn(() => Promise.resolve());
    const onClose = vi.fn();
    render(<RoomSettingsModal open room={room} onClose={onClose} onSave={onSave} />);
    await userEvent.click(await screen.findByRole('radio', { name: '5' }));
    await userEvent.click(screen.getByRole('radio', { name: /벚꽃 언덕/ }));
    await userEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(onSave).toHaveBeenCalledWith(5, 'BLOSSOM');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('예전 테마 값(열대 해변)을 가진 방은 벚꽃 언덕이 골라진 채로 열리고, 모르는 값이면 원목 라운지다', async () => {
    const stale = (theme: string) => ({ ...room, theme } as unknown as typeof room);
    const { unmount } = render(<RoomSettingsModal open room={stale('BEACH')} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(await screen.findByRole('radio', { name: /벚꽃 언덕/ })).toHaveAttribute('aria-checked', 'true');
    unmount();

    render(<RoomSettingsModal open room={stale('NEON')} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(await screen.findByRole('radio', { name: /원목 라운지/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('저장이 실패하면 창을 닫지 않고 다시 누를 수 있다', async () => {
    const onSave = vi.fn(() => Promise.reject(new Error('x')));
    const onClose = vi.fn();
    render(<RoomSettingsModal open room={room} onClose={onClose} onSave={onSave} />);
    await userEvent.click(await screen.findByRole('button', { name: '저장' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled());
    expect(onClose).not.toHaveBeenCalled();
  });
});
