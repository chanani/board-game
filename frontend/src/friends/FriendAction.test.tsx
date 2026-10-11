import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { friendsApi, type Friend, type FriendRequest } from '../api/friends';
import { ApiError } from '../api/http';
import { recordsApi } from '../api/records';
import { MemberStatsModal } from '../room/MemberStatsModal';
import { FriendsProvider, relationOf } from './FriendsContext';

vi.mock('../realtime/RealtimeContext', () => ({ useRealtime: () => ({ realtime: { subscribe: () => () => undefined }, connected: true }) }));
const toast = vi.hoisted(() => ({ show: vi.fn() }));
vi.mock('../components/Toast', () => ({ useToast: () => toast }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ member: { id: 1, loginId: 'alice01', nickname: '앨리스' } }) }));
vi.mock('../api/records', () => ({ recordsApi: { member: vi.fn() } }));
vi.mock('../api/friends', () => ({
  friendsApi: {
    list: vi.fn(), requests: vi.fn(), requestByNickname: vi.fn(), requestById: vi.fn(),
    accept: vi.fn(), decline: vi.fn(), cancel: vi.fn(), remove: vi.fn(),
  },
}));

const bob = { id: 2, nickname: '밥', avatar: 'FOX' };
const asFriend: Friend = { memberId: 2, nickname: '밥', avatar: 'FOX', online: true };
const asRequest: FriendRequest = { requestId: 31, memberId: 2, nickname: '밥', avatar: 'FOX' };

type Server = { friends: Friend[]; incoming: FriendRequest[]; outgoing: FriendRequest[] };
let server: Server;

beforeEach(() => {
  server = { friends: [], incoming: [], outgoing: [] };
  toast.show.mockReset();
  Object.values(friendsApi).forEach((fn) => vi.mocked(fn).mockReset());
  vi.mocked(friendsApi.list).mockImplementation(() => Promise.resolve(server.friends));
  vi.mocked(friendsApi.requests).mockImplementation(() => Promise.resolve({ incoming: server.incoming, outgoing: server.outgoing }));
  vi.mocked(recordsApi.member).mockReset().mockResolvedValue({ memberId: 2, nickname: '밥', avatar: 'FOX', stats: [] });
});

// 대기실·게임에서 다른 사람을 눌렀을 때 뜨는 전적 창을 친구 기능이 켜진 채로 띄운다.
async function renderStats(target = bob) {
  render(<FriendsProvider><MemberStatsModal target={target} onClose={vi.fn()} /></FriendsProvider>);
  const dialog = screen.getByRole('dialog', { name: `${target.nickname}님 전적` });
  await waitFor(() => expect(friendsApi.requests).toHaveBeenCalled());
  await within(dialog).findByText('아직 기록이 없어요');
  return dialog;
}

describe('relationOf', () => {
  it('나·친구·받은 요청·보낸 요청·남을 구분한다', () => {
    const lists = { meId: 1, friends: [asFriend], incoming: [{ ...asRequest, memberId: 3 }], outgoing: [{ ...asRequest, memberId: 4 }] };

    expect([1, 2, 3, 4, 5].map((memberId) => relationOf(lists, memberId))).toEqual(['me', 'friend', 'incoming', 'outgoing', 'none']);
  });
});

describe('전적 창의 친구 버튼', () => {
  it('친구가 아닌 사람이면 친구 추가 버튼(SVG 아이콘)이 있고, 누르면 그 사람에게 요청을 보낸다', async () => {
    vi.mocked(friendsApi.requestById).mockImplementation(() => {
      server.outgoing = [asRequest];
      return Promise.resolve({ status: 'REQUESTED', memberId: 2, nickname: '밥' });
    });
    const dialog = await renderStats();
    const add = within(dialog).getByRole('button', { name: '친구 추가' });
    expect(add.querySelector('svg')).not.toBeNull();

    await userEvent.click(add);

    expect(friendsApi.requestById).toHaveBeenCalledWith(2);
    expect(toast.show).toHaveBeenCalledWith('밥님에게 친구 요청을 보냈어요.', 'info');
    expect(await within(dialog).findByRole('button', { name: '요청 보냄' })).toBeDisabled();
    expect(within(dialog).queryByRole('button', { name: '친구 추가' })).not.toBeInTheDocument();
  });

  it('이미 요청을 보낸 사람이면 누를 수 없는 "요청 보냄"으로 보인다', async () => {
    server.outgoing = [asRequest];
    const dialog = await renderStats();

    expect(await within(dialog).findByRole('button', { name: '요청 보냄' })).toBeDisabled();
    expect(within(dialog).queryByRole('button', { name: '친구 추가' })).not.toBeInTheDocument();
  });

  it('이미 친구면 친구 추가 버튼이 없다(대신 친구 삭제)', async () => {
    server.friends = [asFriend];
    const dialog = await renderStats();

    expect(await within(dialog).findByRole('button', { name: '친구 삭제' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: '친구 추가' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: '요청 보냄' })).not.toBeInTheDocument();
  });

  it('나에게 요청을 보낸 사람이면 수락 버튼이 되고, 누르면 바로 친구가 된다', async () => {
    server.incoming = [asRequest];
    vi.mocked(friendsApi.requestById).mockImplementation(() => {
      server.incoming = [];
      server.friends = [asFriend];
      return Promise.resolve({ status: 'ACCEPTED', memberId: 2, nickname: '밥' });
    });
    const dialog = await renderStats();

    await userEvent.click(await within(dialog).findByRole('button', { name: '친구 요청 수락' }));

    expect(toast.show).toHaveBeenCalledWith('밥님과 친구가 됐어요.', 'info');
    expect(await within(dialog).findByRole('button', { name: '친구 삭제' })).toBeInTheDocument();
  });

  it('내 전적 창에는 친구 버튼이 없다', async () => {
    const dialog = await renderStats({ id: 1, nickname: '앨리스', avatar: 'CAT' });

    expect(within(dialog).queryByTestId('friend-action')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /친구/ })).not.toBeInTheDocument();
  });

  it('친구 기능을 쓸 수 없는 곳(FriendsProvider 밖)에서는 친구 버튼이 없다', async () => {
    render(<MemberStatsModal target={bob} onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: '밥님 전적' });
    await within(dialog).findByText('아직 기록이 없어요');
    expect(within(dialog).queryByTestId('friend-action')).not.toBeInTheDocument();
  });

  it('요청에 실패하면 서버 안내를 토스트로 보여 주고 버튼은 그대로 둔다', async () => {
    vi.mocked(friendsApi.requestById).mockImplementation(() => Promise.reject(new ApiError(409, 'FRIEND_LIMIT_REACHED', '친구 목록이 가득 찼어요. 친구는 100명까지 만들 수 있어요.')));
    const dialog = await renderStats();

    await userEvent.click(within(dialog).getByRole('button', { name: '친구 추가' }));

    await waitFor(() => expect(toast.show).toHaveBeenCalledWith('친구 목록이 가득 찼어요. 친구는 100명까지 만들 수 있어요.'));
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '친구 추가' })).toBeEnabled());
  });
});
