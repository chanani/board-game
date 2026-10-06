import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/http';
import { ToastProvider } from '../components/Toast';
import { GameLobbyPage } from './GameLobbyPage';

const api = vi.hoisted(() => ({ list: vi.fn(), mine: vi.fn(), create: vi.fn(), join: vi.fn(), watch: vi.fn() }));
vi.mock('../api/rooms', () => ({ roomsApi: api }));
vi.mock('../api/records', () => ({
  recordsApi: { me: () => Promise.resolve({ memberId: 1, nickname: '앨리스', stats: [] }), rankings: () => Promise.resolve([]) },
}));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ member: { id: 1, loginId: 'alice01', nickname: '앨리스' } }) }));

const base = { gameType: 'PAPER_SAFARI', gameTypeName: '페이퍼 사파리', playerCount: 2, maxPlayers: 4, hostNickname: '밥', locked: false, roundNumber: null, spectatorCount: 0, theme: 'WOOD' };
const rooms = [
  { ...base, code: 'WAIT01', name: '열린방', status: 'WAITING' },
  { ...base, code: 'LOCK01', name: '잠긴방', status: 'WAITING', locked: true, theme: 'SUNSET' },
  { ...base, code: 'PLAY01', name: '공개판', status: 'PLAYING', roundNumber: 3, spectatorCount: 2, theme: 'BEACH' },
  { ...base, code: 'PLAY02', name: '비밀판', status: 'PLAYING', locked: true, roundNumber: 1 },
];

function renderLobby() {
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/games/paper-safari']}>
        <Routes>
          <Route path="/games/:slug" element={<GameLobbyPage />} />
          <Route path="/rooms/:code" element={<p>방 화면</p>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.list.mockResolvedValue(rooms);
  api.mine.mockResolvedValue(undefined);
  api.create.mockResolvedValue({ code: 'NEW001' });
  api.watch.mockResolvedValue({ code: 'PLAY01' });
});
afterEach(() => vi.useRealTimers());

describe('GameLobbyPage', () => {
  it('방 만들기 모달에서 최대 인원과 비밀번호를 정해 방을 만든다', async () => {
    renderLobby();
    await screen.findByText('열린방');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '방 만들기' }));

    const dialog = await screen.findByRole('dialog', { name: '새 방 만들기' });
    expect(within(within(dialog).getByRole('radiogroup', { name: '최대 인원' })).getAllByRole('radio')).toHaveLength(4);
    expect(within(dialog).queryByLabelText('비밀번호')).not.toBeInTheDocument();
    await userEvent.clear(within(dialog).getByLabelText('방 이름'));
    await userEvent.type(within(dialog).getByLabelText('방 이름'), '우리방');
    await userEvent.click(within(dialog).getByRole('radio', { name: '3' }));
    await userEvent.click(within(dialog).getByRole('switch', { name: '비공개방' }));
    await userEvent.type(within(dialog).getByLabelText('비밀번호'), '1234');
    await userEvent.click(within(dialog).getByRole('button', { name: '방 만들기' }));

    expect(api.create).toHaveBeenCalledWith('우리방', 'PAPER_SAFARI', 3, 'WOOD', '1234');
    expect(await screen.findByText('방 화면')).toBeInTheDocument();
  });

  it('방 만들기에서 고른 테마로 방을 만든다', async () => {
    renderLobby();
    await screen.findByText('열린방');
    await userEvent.click(screen.getByRole('button', { name: '방 만들기' }));
    const dialog = await screen.findByRole('dialog', { name: '새 방 만들기' });
    await userEvent.click(within(dialog).getByRole('radio', { name: '설원 오로라' }));
    await userEvent.click(within(dialog).getByRole('button', { name: '방 만들기' }));

    expect(api.create).toHaveBeenCalledWith('앨리스의 방', 'PAPER_SAFARI', 5, 'AURORA', undefined);
  });

  it('방 목록 항목에 테마 색 점과 테마 이름을 보여준다', async () => {
    renderLobby();
    const waitingItem = (await screen.findByText('잠긴방')).closest('li') as HTMLElement;
    const playingItem = screen.getByText('공개판').closest('li') as HTMLElement;

    expect(within(waitingItem).getByText('사바나 노을')).toBeInTheDocument();
    expect(waitingItem.querySelector('[data-testid="theme-dot"]')).toHaveStyle({ backgroundColor: '#ea580c' });
    expect(within(playingItem).getByText('열대 해변')).toBeInTheDocument();
    expect(within(screen.getByText('열린방').closest('li') as HTMLElement).getByText('원목 라운지')).toBeInTheDocument();
  });

  it('기본은 5명 공개방이다', async () => {
    renderLobby();
    await screen.findByText('열린방');
    await userEvent.click(screen.getByRole('button', { name: '방 만들기' }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: '새 방 만들기' })).getByRole('button', { name: '방 만들기' }));

    expect(api.create).toHaveBeenCalledWith('앨리스의 방', 'PAPER_SAFARI', 5, 'WOOD', undefined);
  });

  it('코드 입력칸과 입장 버튼은 한 줄에 있다', async () => {
    renderLobby();
    await screen.findByText('열린방');

    const row = screen.getByRole('button', { name: '입장' }).parentElement;

    expect(row).toHaveClass('flex');
    expect(row).toContainElement(screen.getByLabelText('방 코드로 들어가기'));
  });

  it('기다리는 방과 게임 중인 방을 나눠 보여준다', async () => {
    renderLobby();

    expect(await screen.findByRole('heading', { name: '기다리는 방' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '게임 중인 방' })).toBeInTheDocument();
    expect(screen.getAllByText('게임 진행 중')).toHaveLength(2);
    expect(screen.getAllByText('2명')).toHaveLength(2);
  });

  it('기다리는 방과 게임 중인 방은 각각 종이 패널 안의 2열 격자이고 개수 배지가 있다', async () => {
    renderLobby();
    const waitingHeading = await screen.findByRole('heading', { name: '기다리는 방' });
    await screen.findByText('열린방');

    for (const [name, count] of [['기다리는 방', '2'], ['게임 중인 방', '2']] as const) {
      const panel = screen.getByRole('heading', { name }).closest('section') as HTMLElement;
      expect(panel).toHaveClass('paper');
      expect(within(panel).getByTestId('room-count')).toHaveTextContent(count);
      const list = within(panel).getByRole('list');
      expect(list).toHaveClass('grid', 'sm:grid-cols-2');
    }
    expect(waitingHeading.closest('section')).toContainElement(screen.getByRole('button', { name: '방 만들기' }));
  });

  it('빈 목록 안내도 같은 패널 안에 있다', async () => {
    api.list.mockResolvedValue([]);
    renderLobby();
    const empty = await screen.findByText('지금 진행 중인 게임이 없어요.');

    expect(empty.closest('section')).toBe(screen.getByRole('heading', { name: '게임 중인 방' }).closest('section'));
    expect(screen.getByRole('heading', { name: '게임 중인 방' }).closest('section')).toHaveClass('paper');
  });

  it('공개 방은 관전하고 비공개 방은 막혀 있다', async () => {
    renderLobby();
    await userEvent.click(await screen.findByRole('button', { name: '관전하기' }));

    expect(api.watch).toHaveBeenCalledWith('PLAY01');
    expect(await screen.findByText('방 화면')).toBeInTheDocument();
  });

  it('비공개 게임 중인 방은 비활성 버튼이다', async () => {
    renderLobby();

    expect(await screen.findByRole('button', { name: '비공개' })).toBeDisabled();
  });

  it('잠긴 방은 비밀번호를 묻고 틀리면 모달에 알려준다', async () => {
    api.join.mockRejectedValueOnce(new ApiError(403, 'ROOM_PASSWORD_MISMATCH', '비밀번호가 맞지 않아요.'));
    renderLobby();
    const row = (await screen.findByText('잠긴방')).closest('li') as HTMLElement;
    await userEvent.click(within(row).getByRole('button', { name: '참가' }));

    const dialog = await screen.findByRole('dialog', { name: '잠긴방 비밀번호' });
    await userEvent.type(within(dialog).getByLabelText('비밀번호'), '0000');
    await userEvent.click(within(dialog).getByRole('button', { name: '들어가기' }));
    expect(await within(dialog).findByText('비밀번호가 맞지 않아요.')).toBeInTheDocument();

    api.join.mockResolvedValueOnce({ code: 'LOCK01' });
    await userEvent.clear(within(dialog).getByLabelText('비밀번호'));
    await userEvent.type(within(dialog).getByLabelText('비밀번호'), '1234');
    await userEvent.click(within(dialog).getByRole('button', { name: '들어가기' }));

    expect(api.join).toHaveBeenLastCalledWith('LOCK01', '1234');
    expect(await screen.findByText('방 화면')).toBeInTheDocument();
  });

  it('코드로 들어가다 게임 중이면 안내한다', async () => {
    api.join.mockRejectedValueOnce(new ApiError(409, 'ROOM_ALREADY_PLAYING', '이미 시작했어요.'));
    renderLobby();
    await screen.findByText('열린방');
    await userEvent.type(screen.getByLabelText('방 코드로 들어가기'), 'PLAY01');
    await userEvent.click(screen.getByRole('button', { name: '입장' }));

    expect(await screen.findByText('게임 중인 방이에요. 목록에서 관전할 수 있어요.')).toBeInTheDocument();
  });

  it('코드로 들어가다 게임 중인 비공개방이면 관전 안내 대신 비공개라고 알린다', async () => {
    api.join.mockRejectedValueOnce(new ApiError(409, 'ROOM_ALREADY_PLAYING', '이미 시작했어요.'));
    renderLobby();
    await screen.findByText('비밀판');
    await userEvent.type(screen.getByLabelText('방 코드로 들어가기'), 'PLAY02');
    await userEvent.click(screen.getByRole('button', { name: '입장' }));

    expect(await screen.findByText('게임 중인 비공개방이에요.')).toBeInTheDocument();
    expect(screen.queryByText('게임 중인 방이에요. 목록에서 관전할 수 있어요.')).not.toBeInTheDocument();
  });

  it('이미 방에 있어도 로비에 머문다', async () => {
    api.mine.mockResolvedValue({ code: 'ABC234' });
    renderLobby();
    await screen.findByText('열린방');
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(screen.queryByText('방 화면')).not.toBeInTheDocument();
    expect(screen.getByText('열린방')).toBeInTheDocument();
  });

  it('1초마다 방 목록을 새로 불러온다', async () => {
    vi.useFakeTimers();
    renderLobby();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    const before = api.list.mock.calls.length;

    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });

    expect(api.list.mock.calls.length).toBeGreaterThanOrEqual(before + 2);
  });
});
