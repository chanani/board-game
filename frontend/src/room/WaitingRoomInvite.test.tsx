import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Friend } from '../api/friends';
import { ApiError } from '../api/http';
import { invitesApi } from '../api/invites';
import type { Room } from '../api/types';
import type { FriendsState } from '../friends/FriendsContext';
import { setMediaMatches } from '../test/media';
import { WaitingRoom } from './WaitingRoom';

const friendsState = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('../friends/FriendsContext', async (original) => ({
  ...(await original<typeof import('../friends/FriendsContext')>()),
  useFriends: () => friendsState.value,
}));
const toast = vi.hoisted(() => ({ show: vi.fn() }));
vi.mock('../components/Toast', () => ({ useToast: () => toast }));
vi.mock('../api/records', () => ({ recordsApi: { member: vi.fn() } }));
vi.mock('../api/invites', () => ({ invitesApi: { send: vi.fn(), accept: vi.fn(), decline: vi.fn() } }));

const human = { connected: true, offlineSeconds: 0, ready: false, host: false, bot: false };
const room: Room = {
  code: 'ABC234', name: '모여라', gameType: 'PAPER_SAFARI', gameTypeName: '페이퍼 사파리', status: 'WAITING', hostId: 1, maxPlayers: 4, locked: false, spectators: [], theme: 'WOOD',
  members: [{ ...human, id: 1, nickname: '앨리스', host: true }, { ...human, id: 2, nickname: '밥' }],
};

const carol: Friend = { memberId: 3, nickname: '캐럴', avatar: 'CAT', online: true };
const dave: Friend = { memberId: 4, nickname: '데이브', avatar: 'DOG', online: false };
const bobFriend: Friend = { memberId: 2, nickname: '밥', avatar: 'FOX', online: true };

function friendsOf(friends: Friend[], meId = 1): FriendsState {
  return {
    meId, friends, incoming: [], outgoing: [], refresh: vi.fn(() => Promise.resolve()),
    requestById: vi.fn(), accept: vi.fn(), decline: vi.fn(), cancel: vi.fn(), remove: vi.fn(),
  };
}

type Overrides = { room?: Room; meId?: number; host?: boolean };

function renderRoom({ room: shown = room, meId = 1, host = true }: Overrides = {}) {
  return render(
    <WaitingRoom room={shown} meId={meId} receivedAt={0} now={0} onStart={vi.fn()} onReady={vi.fn()} onForfeit={vi.fn()} onKick={vi.fn()} onSeat={vi.fn()}
      onAddBot={host ? vi.fn() : undefined} onChangeBot={vi.fn()} chat={{ messages: [], onSend: vi.fn(() => true) }} />,
  );
}

const seats = () => screen.getAllByRole('button', { name: '빈자리 채우기' });

async function openInviteList() {
  if (screen.queryAllByTestId('chair').length === 0) {
    renderRoom();
  }
  await userEvent.click(seats()[0]);
  await userEvent.click(screen.getByRole('menuitem', { name: '친구 초대' }));
  return screen.findByRole('dialog', { name: '친구 초대' });
}

beforeEach(() => {
  setMediaMatches(true);
  toast.show.mockReset();
  friendsState.value = friendsOf([carol, dave]);
  vi.mocked(invitesApi.send).mockReset().mockResolvedValue({ cooldownSeconds: 10 });
});

afterEach(() => vi.useRealTimers());

describe('대기실 빈자리 메뉴', () => {
  it('빈자리는 더하기 표시가 있는 "빈자리" 버튼이고, 누르기 전에는 메뉴가 없다', () => {
    renderRoom();

    expect(seats()).toHaveLength(2);
    expect(screen.getAllByText('빈자리')).toHaveLength(2);
    expect(screen.queryByText('컴퓨터 추가')).toBeNull();
    expect(seats()[0]).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('방장이 빈자리를 누르면 "친구 초대"와 "컴퓨터와 하기"가 아이콘과 함께 뜬다', async () => {
    renderRoom();

    await userEvent.click(seats()[0]);

    const menu = screen.getByRole('menu', { name: '빈자리 채우기' });
    const items = within(menu).getAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual(['친구 초대', '컴퓨터와 하기']);
    items.forEach((item) => expect(item.querySelector('svg')).not.toBeNull());
    expect(seats()[0]).toHaveAttribute('aria-expanded', 'true');
  });

  it('방장이 아닌 참가자에게는 "친구 초대"만 뜬다', async () => {
    renderRoom({ meId: 2, host: false });

    await userEvent.click(seats()[0]);

    const menu = screen.getByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: '친구 초대' })).toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { name: '컴퓨터와 하기' })).toBeNull();
  });

  it('방장이 아니어도 onAddBot이 넘어오면 컴퓨터는 못 앉히고 친구만 부른다', async () => {
    render(
      <WaitingRoom room={room} meId={2} receivedAt={0} now={0} onStart={vi.fn()} onReady={vi.fn()} onForfeit={vi.fn()} onKick={vi.fn()} onSeat={vi.fn()}
        onAddBot={vi.fn()} chat={{ messages: [], onSend: vi.fn(() => true) }} />,
    );

    await userEvent.click(seats()[0]);

    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['친구 초대']);
  });

  it('관전자에게는 빈자리가 버튼이 아니다', () => {
    const watching: Room = { ...room, spectators: [{ id: 9, nickname: '구경꾼' }] };
    renderRoom({ room: watching, meId: 9, host: false });

    expect(screen.queryByRole('button', { name: '빈자리 채우기' })).toBeNull();
    expect(screen.getAllByLabelText('빈자리')).toHaveLength(2);
  });

  it('Esc나 바깥을 누르면 메뉴가 닫힌다', async () => {
    renderRoom();

    await userEvent.click(seats()[0]);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();

    await userEvent.click(seats()[0]);
    await userEvent.click(screen.getByRole('heading', { name: '채팅' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('"컴퓨터와 하기"는 원래의 난이도 고르는 창을 연다', async () => {
    renderRoom();

    await userEvent.click(seats()[0]);
    await userEvent.click(screen.getByRole('menuitem', { name: '컴퓨터와 하기' }));

    expect(await screen.findByRole('dialog', { name: '빈자리에 컴퓨터 추가' })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

describe('친구 초대 창', () => {
  it('접속 중인 친구에게만 초대 버튼이 있고, 오프라인 친구는 흐리게 버튼 없이 보인다', async () => {
    const dialog = await openInviteList();

    const rows = within(dialog).getAllByRole('listitem');
    expect(rows.map((row) => row.dataset.state)).toEqual(['ready', 'offline']);
    expect(within(rows[0]).getByText('온라인')).toBeInTheDocument();
    expect(within(rows[0]).getByRole('button', { name: '캐럴님 초대' })).toBeEnabled();
    expect(within(rows[1]).getByText('오프라인')).toBeInTheDocument();
    expect(within(rows[1]).queryByRole('button')).toBeNull();
    expect(within(rows[1]).getByText('데이브')).toHaveClass('text-stone-500');
    expect((friendsState.value as FriendsState).refresh).toHaveBeenCalled();
  });

  it('이미 방에 앉아 있는 친구는 "이미 방에 있어요"로 적고 버튼이 없다', async () => {
    friendsState.value = friendsOf([bobFriend, carol]);

    const dialog = await openInviteList();

    const row = within(dialog).getByTestId('invite-row-2');
    expect(within(row).getByText('이미 방에 있어요')).toBeInTheDocument();
    expect(within(row).queryByRole('button')).toBeNull();
    expect(within(dialog).getByRole('button', { name: '캐럴님 초대' })).toBeInTheDocument();
  });

  it('초대를 누르면 그 방으로 보내고 "초대 보냄"이 되며, 10초 뒤 다시 초대할 수 있다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderRoom();
    await user.click(seats()[0]);
    await user.click(screen.getByRole('menuitem', { name: '친구 초대' }));
    const dialog = await screen.findByRole('dialog', { name: '친구 초대' });

    await user.click(within(dialog).getByRole('button', { name: '캐럴님 초대' }));

    expect(invitesApi.send).toHaveBeenCalledWith('ABC234', 3);
    const row = within(dialog).getByTestId('invite-row-3');
    expect(await within(row).findByText('초대 보냄')).toBeInTheDocument();
    expect(within(row).queryByRole('button')).toBeNull();

    act(() => { vi.advanceTimersByTime(9000); });
    expect(within(row).getByText('초대 보냄')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(within(row).getByRole('button', { name: '캐럴님 초대' })).toBeEnabled();
  });

  it('창을 닫았다 다시 열어도 "초대 보냄"이 남아 있다', async () => {
    const dialog = await openInviteList();
    await userEvent.click(within(dialog).getByRole('button', { name: '캐럴님 초대' }));
    await within(dialog).findByText('초대 보냄');

    await userEvent.click(within(dialog).getByRole('button', { name: '닫기' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '친구 초대' })).toBeNull());
    const reopened = await openInviteList();

    expect(within(reopened).getByText('초대 보냄')).toBeInTheDocument();
  });

  it('초대하지 못하면 서버가 알려 준 까닭을 보여 주고 버튼은 그대로 둔다', async () => {
    vi.mocked(invitesApi.send).mockRejectedValue(new ApiError(409, 'INVITE_FRIEND_OFFLINE', '지금 접속해 있지 않은 친구예요.'));
    const dialog = await openInviteList();

    await userEvent.click(within(dialog).getByRole('button', { name: '캐럴님 초대' }));

    await waitFor(() => expect(toast.show).toHaveBeenCalledWith('지금 접속해 있지 않은 친구예요.'));
    expect(within(dialog).queryByText('초대 보냄')).toBeNull();
    expect(within(dialog).getByRole('button', { name: '캐럴님 초대' })).toBeEnabled();
  });

  it('친구가 없으면 헤더의 친구 메뉴에서 추가하라고 알려 준다', async () => {
    friendsState.value = friendsOf([]);

    const dialog = await openInviteList();

    expect(within(dialog).getByTestId('invite-no-friends')).toHaveTextContent('아직 친구가 없어요.화면 위쪽 친구 아이콘에서 닉네임으로 친구를 추가해 보세요.');
    expect(within(dialog).queryByRole('list')).toBeNull();
  });

  it('창이 열린 사이 자리가 다 차면 초대 버튼을 잠그고 알려 준다', async () => {
    const { rerender } = renderRoom();
    const dialog = await openInviteList();
    const full: Room = { ...room, maxPlayers: 2 };

    rerender(
      <WaitingRoom room={full} meId={1} receivedAt={0} now={0} onStart={vi.fn()} onReady={vi.fn()} onForfeit={vi.fn()} onKick={vi.fn()} onSeat={vi.fn()}
        onAddBot={vi.fn()} onChangeBot={vi.fn()} chat={{ messages: [], onSend: vi.fn(() => true) }} />,
    );

    expect(within(dialog).getByRole('note')).toHaveTextContent('자리가 다 찼어요.');
    expect(within(dialog).getByRole('button', { name: '캐럴님 초대' })).toBeDisabled();
  });
});
