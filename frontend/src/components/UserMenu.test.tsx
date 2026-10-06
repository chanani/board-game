import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundContext } from '../lib/sound';
import { ChatSheet } from '../room/ChatSheet';
import { UserMenu } from './UserMenu';

const auth = vi.hoisted(() => ({ logout: vi.fn(() => Promise.resolve()) }));
const rooms = vi.hoisted(() => ({ mine: vi.fn() }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ member: { id: 1, loginId: 'alice01', nickname: '앨리스' }, logout: auth.logout }) }));
vi.mock('../api/rooms', () => ({ roomsApi: { mine: rooms.mine } }));
vi.mock('./Toast', () => ({ useToast: () => ({ show: vi.fn() }) }));

const sound = { play: vi.fn(), muted: false, toggleMuted: vi.fn(), volume: 70, setVolume: vi.fn() };

function ui(overrides: Partial<typeof sound> = {}) {
  return (
    <SoundContext.Provider value={{ ...sound, ...overrides }}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<><UserMenu /><Link to="/records">전적</Link><p>바깥</p></>} />
          <Route path="/records" element={<><UserMenu /><p>전적 화면</p></>} />
          <Route path="/login" element={<p>로그인 화면</p>} />
        </Routes>
      </MemoryRouter>
    </SoundContext.Provider>
  );
}

const trigger = () => screen.getByRole('button', { name: /앨리스/ });

async function openMenu() {
  await userEvent.click(trigger());
  return screen.getByTestId('user-menu');
}

async function clickLogout() {
  const panel = await openMenu();
  await userEvent.click(within(panel).getByRole('button', { name: '로그아웃' }));
}

const playingRoom = {
  code: 'ABC234', name: '방', gameType: 'PAPER_SAFARI', gameTypeName: '페이퍼 사파리', status: 'PLAYING', hostId: 1, maxPlayers: 4,
  locked: false, theme: 'WOOD', spectators: [], members: [{ id: 1, nickname: '앨리스', host: true, connected: true, offlineSeconds: 0, ready: false }],
};

describe('닉네임 메뉴', () => {
  beforeEach(() => {
    auth.logout.mockClear();
    rooms.mine.mockReset();
    Object.values(sound).forEach((value) => typeof value === 'function' && value.mockClear());
  });

  it('닉네임을 누르면 아이디·닉네임·소리 조절·로그아웃이 있는 메뉴가 펼쳐진다', async () => {
    render(ui());
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    const panel = screen.getByTestId('user-menu');
    expect(within(panel).getByText('alice01')).toBeInTheDocument();
    expect(within(panel).getByText('앨리스')).toBeInTheDocument();
    expect(within(panel).getByRole('switch', { name: '효과음' })).toBeInTheDocument();
    expect(within(panel).getByRole('slider', { name: '음량' })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: '소리 들어보기' })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: '로그아웃' })).toBeInTheDocument();
  });

  it('Esc, 바깥 클릭, 버튼 다시 누르기로 닫힌다', async () => {
    render(ui());
    await userEvent.click(trigger());
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument());
    await userEvent.click(trigger());
    await userEvent.click(screen.getByText('바깥'));
    await waitFor(() => expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument());
    await userEvent.click(trigger());
    await userEvent.click(trigger());
    await waitFor(() => expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument());
  });

  it('aria-controls는 메뉴가 열려 있을 때만 단다', async () => {
    render(ui());
    expect(trigger()).not.toHaveAttribute('aria-controls');
    await userEvent.click(trigger());
    expect(trigger()).toHaveAttribute('aria-controls', 'user-menu');
  });

  it.each(['메뉴', '채팅'])('채팅 시트와 함께 열려 있으면 Esc 한 번에 하나만 닫힌다(%s를 먼저 엶)', async (first) => {
    const onCloseChat = vi.fn();
    const tree = (chatOpen: boolean) => (
      <SoundContext.Provider value={sound}>
        <MemoryRouter>
          <UserMenu />
          <ChatSheet messages={[]} meId={1} onSend={vi.fn()} open={chatOpen} onClose={onCloseChat} />
        </MemoryRouter>
      </SoundContext.Provider>
    );
    const page = render(tree(first === '채팅'));
    await userEvent.click(trigger());
    page.rerender(tree(true));

    await userEvent.keyboard('{Escape}');

    const menuClosed = screen.queryByTestId('user-menu') === null;
    expect(Number(menuClosed) + onCloseChat.mock.calls.length).toBe(1);
  });

  it('모바일에서도 메뉴가 화면 오른쪽 끝에서 16px 떨어지게(헤더 12px + 4px) 놓인다', async () => {
    render(ui());
    const panel = await openMenu();
    expect(panel).toHaveClass('right-1', 'sm:right-0');
  });

  it('메뉴 안을 눌러도 닫히지 않는다', async () => {
    render(ui());
    const panel = await openMenu();
    await userEvent.click(within(panel).getByText('alice01'));
    expect(screen.getByTestId('user-menu')).toBeInTheDocument();
  });

  it('페이지를 옮기면 닫힌다', async () => {
    render(ui());
    await openMenu();
    await userEvent.click(screen.getByRole('link', { name: '전적' }));
    expect(await screen.findByText('전적 화면')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument());
  });

  it('효과음 토글, 음량 막대(숫자), 소리 들어보기가 있다', async () => {
    render(ui());
    await openMenu();
    await userEvent.click(screen.getByRole('switch', { name: '효과음' }));
    expect(sound.toggleMuted).toHaveBeenCalled();
    expect(screen.getByRole('slider', { name: '음량' })).toHaveValue('70');
    expect(screen.getByText('70')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '소리 들어보기' }));
    expect(sound.play).toHaveBeenCalledWith('myTurn');
  });

  it('음량 막대를 움직이면 setVolume을 부른다', async () => {
    render(ui());
    await openMenu();
    fireEvent.change(screen.getByRole('slider', { name: '음량' }), { target: { value: '30' } });
    expect(sound.setVolume).toHaveBeenCalledWith(30);
  });

  it('효과음이 꺼져 있으면 음량 막대는 비활성이다', async () => {
    render(ui({ muted: true }));
    await openMenu();
    expect(screen.getByRole('slider', { name: '음량' })).toBeDisabled();
  });

  it('게임 중이 아니면 "로그아웃할까요?" 확인 뒤 로그아웃하고 로그인 화면으로 간다', async () => {
    rooms.mine.mockResolvedValue(null);
    render(ui());
    await clickLogout();
    const dialog = await screen.findByRole('dialog', { name: '로그아웃할까요?' });
    expect(auth.logout).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: '로그아웃' }));
    await waitFor(() => expect(auth.logout).toHaveBeenCalled());
    expect(await screen.findByText('로그인 화면')).toBeInTheDocument();
  });

  it('게임에 참가 중이면 기권 안내 창을 띄우고, 계속 게임하기는 로그아웃하지 않는다', async () => {
    rooms.mine.mockResolvedValue(playingRoom);
    render(ui());
    await clickLogout();
    const dialog = await screen.findByRole('dialog', { name: '게임 중이에요' });
    expect(dialog).toHaveTextContent('진행 중인 게임은 기권 처리되고 방에서 나가요');
    await userEvent.click(within(dialog).getByRole('button', { name: '계속 게임하기' }));
    expect(auth.logout).not.toHaveBeenCalled();
    await clickLogout();
    await userEvent.click(within(await screen.findByRole('dialog', { name: '게임 중이에요' })).getByRole('button', { name: '기권하고 로그아웃' }));
    await waitFor(() => expect(auth.logout).toHaveBeenCalled());
  });

  it('게임 중인 방의 관전자는 일반 확인 창을 본다', async () => {
    rooms.mine.mockResolvedValue({ ...playingRoom, members: [{ ...playingRoom.members[0], id: 2 }], spectators: [{ id: 1, nickname: '앨리스' }] });
    render(ui());
    await clickLogout();
    expect(await screen.findByRole('dialog', { name: '로그아웃할까요?' })).toBeInTheDocument();
  });

  it('계속 게임하기를 눌러도 닫히는 동안 일반 확인 문구로 바뀌지 않는다', async () => {
    rooms.mine.mockResolvedValue(playingRoom);
    render(ui());
    await clickLogout();
    const dialog = await screen.findByRole('dialog', { name: '게임 중이에요' });
    await userEvent.click(within(dialog).getByRole('button', { name: '계속 게임하기' }));
    expect(screen.queryByText('로그아웃할까요?')).not.toBeInTheDocument();
  });

  it('내 방을 확인하지 못하면 보수적으로 기권 안내 창을 띄운다', async () => {
    rooms.mine.mockRejectedValue(new Error('network'));
    render(ui());
    await clickLogout();
    expect(await screen.findByRole('dialog', { name: '게임 중이에요' })).toBeInTheDocument();
  });

  it('메뉴가 닫혀도 로그아웃 확인 창은 남는다', async () => {
    rooms.mine.mockResolvedValue(null);
    render(ui());
    await clickLogout();
    await screen.findByRole('dialog', { name: '로그아웃할까요?' });
    await waitFor(() => expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument());
    expect(screen.getByRole('dialog', { name: '로그아웃할까요?' })).toBeInTheDocument();
  });
});
