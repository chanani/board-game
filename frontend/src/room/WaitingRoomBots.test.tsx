import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BotDifficulty, Room } from '../api/types';
import { recordsApi } from '../api/records';
import { ToastProvider } from '../components/Toast';
import { setMediaMatches } from '../test/media';
import { WaitingRoom } from './WaitingRoom';

vi.mock('../api/records', () => ({ recordsApi: { member: vi.fn() } }));

const human = { connected: true, offlineSeconds: 0, ready: false, host: false, bot: false };
const room: Room = {
  code: 'ABC234', name: '방', gameType: 'PAPER_SAFARI', gameTypeName: '페이퍼 사파리', status: 'WAITING', hostId: 1, maxPlayers: 4, locked: false, spectators: [], theme: 'WOOD',
  members: [{ ...human, id: 1, nickname: '앨리스', host: true }],
};
const withBot: Room = {
  ...room,
  members: [...room.members, { ...human, id: -1, nickname: '컴퓨터 1', ready: true, bot: true, difficulty: 'EASY' }],
};

type Overrides = { room?: Room; meId?: number; onAddBot?: ((d: BotDifficulty) => unknown) | null; onChangeBot?: (id: number, d: BotDifficulty) => unknown; onKick?: (id: number) => unknown };

function renderRoom({ room: shown = room, meId = 1, onAddBot = vi.fn(), onChangeBot = vi.fn(), onKick = vi.fn() }: Overrides = {}) {
  return render(
    <ToastProvider>
      <WaitingRoom room={shown} meId={meId} receivedAt={0} now={0} onStart={vi.fn()} onReady={vi.fn()} onForfeit={vi.fn()} onKick={onKick} onSeat={vi.fn()}
        onAddBot={onAddBot ?? undefined} onChangeBot={onChangeBot} chat={{ messages: [], onSend: vi.fn(() => true) }} />
    </ToastProvider>,
  );
}

describe('WaitingRoom 컴퓨터', () => {
  beforeEach(() => {
    setMediaMatches(true);
    vi.mocked(recordsApi.member).mockClear();
  });

  it('방장 화면의 빈자리는 "빈자리에 컴퓨터 추가" 버튼이고 손님 화면은 그대로 빈자리다', () => {
    const { unmount } = renderRoom();
    expect(screen.getAllByRole('button', { name: '빈자리에 컴퓨터 추가' })).toHaveLength(3);
    expect(screen.getAllByText('컴퓨터 추가').length).toBeGreaterThan(0);
    unmount();

    const guestRoom: Room = { ...room, members: [{ ...human, id: 2, nickname: '밥' }, { ...room.members[0] }], hostId: 1 };
    renderRoom({ room: guestRoom, meId: 2 });
    expect(screen.queryByRole('button', { name: '빈자리에 컴퓨터 추가' })).toBeNull();
    expect(screen.getAllByLabelText('빈자리')).toHaveLength(2);
  });

  it('추가 버튼을 누르면 하·중·상 선택 창이 뜨고 고르면 그 난이도로 추가한다', async () => {
    const onAddBot = vi.fn();
    renderRoom({ onAddBot });

    await userEvent.click(screen.getAllByRole('button', { name: '빈자리에 컴퓨터 추가' })[0]);
    await userEvent.click(await screen.findByRole('button', { name: '상 · 어려움' }));

    expect(onAddBot).toHaveBeenCalledWith('HARD');
    await waitFor(() => expect(screen.queryByRole('button', { name: '상 · 어려움' })).toBeNull());
  });

  it('Esc로 닫으면 추가하지 않는다', async () => {
    const onAddBot = vi.fn();
    renderRoom({ onAddBot });

    await userEvent.click(screen.getAllByRole('button', { name: '빈자리에 컴퓨터 추가' })[0]);
    await screen.findByRole('button', { name: '중 · 보통' });
    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('button', { name: '중 · 보통' })).toBeNull());
    expect(onAddBot).not.toHaveBeenCalled();
  });

  it('정원이 다 찼어도 게임 최대보다 작으면 의자 끝에 추가 자리가 하나 더 있다', () => {
    const full: Room = { ...withBot, maxPlayers: 2 };
    renderRoom({ room: full });
    expect(screen.getAllByTestId('chair')).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: '빈자리에 컴퓨터 추가' })).toHaveLength(1);
  });

  it('게임 최대 인원이면 추가 자리가 없다', () => {
    const members = Array.from({ length: 5 }, (_, index) => ({ ...human, id: index + 1, nickname: `사람${index}`, host: index === 0 }));
    renderRoom({ room: { ...room, maxPlayers: 5, members } });
    expect(screen.getAllByTestId('chair')).toHaveLength(5);
    expect(screen.queryByRole('button', { name: '빈자리에 컴퓨터 추가' })).toBeNull();
  });

  it('컴퓨터 자리는 "컴퓨터 · 하" 칩이고 연결 점·연결 끊김 문구가 없다', () => {
    renderRoom({ room: { ...withBot, members: [withBot.members[0], { ...withBot.members[1], connected: false, offlineSeconds: 90 }] } });
    expect(screen.getByText('컴퓨터 · 하')).toBeInTheDocument();
    expect(screen.getAllByTestId('presence-dot')).toHaveLength(1);
    expect(screen.queryByText(/연결 끊김/)).toBeNull();
  });

  it('방장이 칩을 누르면 바꾸기 창이 뜨고 고르면 onChangeBot(-1, "MEDIUM")', async () => {
    const onChangeBot = vi.fn();
    renderRoom({ room: withBot, onChangeBot });

    await userEvent.click(screen.getByRole('button', { name: '컴퓨터 · 하, 난이도 바꾸기' }));
    await userEvent.click(await screen.findByRole('button', { name: '중 · 보통' }));

    expect(onChangeBot).toHaveBeenCalledWith(-1, 'MEDIUM');
  });

  it('컴퓨터 자리를 누르면 정보 창이 뜨고 전적을 부르지 않는다', async () => {
    renderRoom({ room: withBot });

    await userEvent.click(screen.getByRole('button', { name: '컴퓨터 1 정보 보기' }));

    expect(await screen.findByRole('heading', { name: '컴퓨터 1' })).toBeInTheDocument();
    expect(recordsApi.member).not.toHaveBeenCalled();
  });

  it('컴퓨터는 확인 창 없이 바로 내보낸다', async () => {
    const onKick = vi.fn();
    renderRoom({ room: withBot, onKick });

    await userEvent.click(screen.getByRole('button', { name: '내보내기' }));

    expect(onKick).toHaveBeenCalledWith(-1);
    expect(screen.queryByText(/내보낼까요/)).toBeNull();
  });

  it('방장과 컴퓨터만 있어도 게임 시작 버튼이 켜진다', () => {
    renderRoom({ room: { ...withBot, members: [withBot.members[0], { ...withBot.members[1], ready: false }] } });
    expect(screen.getByRole('button', { name: '게임 시작' })).toBeEnabled();
  });
});
