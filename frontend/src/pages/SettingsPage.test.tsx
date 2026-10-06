import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundContext } from '../lib/sound';
import { SettingsPage } from './SettingsPage';

const auth = vi.hoisted(() => ({ logout: vi.fn(() => Promise.resolve()) }));
const rooms = vi.hoisted(() => ({ mine: vi.fn() }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ member: { id: 1, loginId: 'alice01', nickname: '앨리스' }, logout: auth.logout }) }));
vi.mock('../api/rooms', () => ({ roomsApi: { mine: rooms.mine } }));
vi.mock('../components/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }));

const sound = { play: vi.fn(), muted: false, toggleMuted: vi.fn(), volume: 70, setVolume: vi.fn() };

function ui(overrides: Partial<typeof sound> = {}) {
  return (
    <SoundContext.Provider value={{ ...sound, ...overrides }}>
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/login" element={<p>로그인 화면</p>} />
        </Routes>
      </MemoryRouter>
    </SoundContext.Provider>
  );
}

const playingRoom = {
  code: 'ABC234', name: '방', gameType: 'PAPER_SAFARI', gameTypeName: '페이퍼 사파리', status: 'PLAYING', hostId: 1, maxPlayers: 4,
  locked: false, theme: 'WOOD', spectators: [], members: [{ id: 1, nickname: '앨리스', host: true, connected: true, offlineSeconds: 0, ready: false }],
};

describe('설정 페이지', () => {
  beforeEach(() => {
    auth.logout.mockClear();
    rooms.mine.mockReset();
    Object.values(sound).forEach((value) => typeof value === 'function' && value.mockClear());
  });

  it('효과음 토글, 음량 막대(숫자), 소리 들어보기가 있다', async () => {
    render(ui());
    await userEvent.click(screen.getByRole('switch', { name: '효과음' }));
    expect(sound.toggleMuted).toHaveBeenCalled();
    const slider = screen.getByRole('slider', { name: '음량' });
    expect(slider).toHaveValue('70');
    expect(screen.getByText('70')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '소리 들어보기' }));
    expect(sound.play).toHaveBeenCalledWith('myTurn');
  });

  it('음량 막대를 움직이면 setVolume을 부른다', () => {
    render(ui());
    fireEvent.change(screen.getByRole('slider', { name: '음량' }), { target: { value: '30' } });
    expect(sound.setVolume).toHaveBeenCalledWith(30);
  });

  it('효과음이 꺼져 있으면 음량 막대는 비활성이다', () => {
    render(ui({ muted: true }));
    expect(screen.getByRole('slider', { name: '음량' })).toBeDisabled();
  });

  it('계정 정보와 로그아웃 버튼이 있다', () => {
    render(ui());
    expect(screen.getByText('앨리스')).toBeInTheDocument();
    expect(screen.getByText('alice01')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument();
  });

  it('게임 중이 아니면 "로그아웃할까요?" 확인 뒤 로그아웃하고 로그인 화면으로 간다', async () => {
    rooms.mine.mockResolvedValue(null);
    render(ui());
    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    const dialog = await screen.findByRole('dialog', { name: '로그아웃할까요?' });
    expect(auth.logout).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: '로그아웃' }));
    await waitFor(() => expect(auth.logout).toHaveBeenCalled());
    expect(await screen.findByText('로그인 화면')).toBeInTheDocument();
  });

  it('게임에 참가 중이면 기권 안내 창을 띄우고, 계속 게임하기는 로그아웃하지 않는다', async () => {
    rooms.mine.mockResolvedValue(playingRoom);
    render(ui());
    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    const dialog = await screen.findByRole('dialog', { name: '게임 중이에요' });
    expect(dialog).toHaveTextContent('진행 중인 게임은 기권 처리되고 방에서 나가요');
    await userEvent.click(within(dialog).getByRole('button', { name: '계속 게임하기' }));
    expect(auth.logout).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: '게임 중이에요' })).getByRole('button', { name: '기권하고 로그아웃' }));
    await waitFor(() => expect(auth.logout).toHaveBeenCalled());
  });

  it('게임 중인 방의 관전자는 일반 확인 창을 본다', async () => {
    rooms.mine.mockResolvedValue({ ...playingRoom, members: [{ ...playingRoom.members[0], id: 2 }], spectators: [{ id: 1, nickname: '앨리스' }] });
    render(ui());
    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(await screen.findByRole('dialog', { name: '로그아웃할까요?' })).toBeInTheDocument();
  });

  it('계속 게임하기를 눌러도 닫히는 동안 일반 확인 문구로 바뀌지 않는다', async () => {
    rooms.mine.mockResolvedValue(playingRoom);
    render(ui());
    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    const dialog = await screen.findByRole('dialog', { name: '게임 중이에요' });
    await userEvent.click(within(dialog).getByRole('button', { name: '계속 게임하기' }));
    expect(screen.queryByText('로그아웃할까요?')).not.toBeInTheDocument();
  });

  it('내 방을 확인하지 못하면 보수적으로 기권 안내 창을 띄운다', async () => {
    rooms.mine.mockRejectedValue(new Error('network'));
    render(ui());
    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(await screen.findByRole('dialog', { name: '게임 중이에요' })).toBeInTheDocument();
  });
});
