import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { friendsApi, type Friend, type FriendRequest } from '../api/friends';
import { ApiError } from '../api/http';
import { recordsApi } from '../api/records';
import { FRIENDS_POLL_MS, FriendsProvider } from './FriendsContext';
import { FriendsMenu } from './FriendsMenu';

type Handler = (body: unknown) => void;
const state = vi.hoisted(() => ({ handlers: new Map<string, (body: unknown) => void>(), realtime: undefined as unknown }));
vi.mock('../realtime/RealtimeContext', () => {
  state.realtime = {
    subscribe: (destination: string, handler: Handler) => {
      state.handlers.set(destination, handler);
      return () => state.handlers.delete(destination);
    },
  };
  return { useRealtime: () => ({ realtime: state.realtime, connected: true }) };
});
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

const bob: Friend = { memberId: 2, nickname: '밥', avatar: 'FOX', online: true };
const carol: Friend = { memberId: 3, nickname: '캐럴', avatar: 'CAT', online: false };
const fromDave: FriendRequest = { requestId: 11, memberId: 4, nickname: '데이브', avatar: 'DOG' };
const fromErin: FriendRequest = { requestId: 12, memberId: 5, nickname: '에린', avatar: 'PIG' };
const toFrank: FriendRequest = { requestId: 21, memberId: 6, nickname: '프랭크', avatar: 'BEAR' };

type Server = { friends: Friend[]; incoming: FriendRequest[]; outgoing: FriendRequest[] };
let server: Server;

// 중괄호로 감싸 아무것도 돌려주지 않는다(beforeEach가 함수를 돌려주면 vitest가 테스트 뒤 정리 함수로 불러 버린다).
beforeEach(() => {
  server = { friends: [bob, carol], incoming: [fromDave, fromErin], outgoing: [toFrank] };
  state.handlers.clear();
  toast.show.mockReset();
  Object.values(friendsApi).forEach((fn) => vi.mocked(fn).mockReset());
  vi.mocked(friendsApi.list).mockImplementation(() => Promise.resolve(server.friends));
  vi.mocked(friendsApi.requests).mockImplementation(() => Promise.resolve({ incoming: server.incoming, outgoing: server.outgoing }));
  vi.mocked(recordsApi.member).mockReset().mockResolvedValue({ memberId: 2, nickname: '밥', avatar: 'FOX', stats: [] });
});

function renderMenu() {
  return render(
    <MemoryRouter>
      <FriendsProvider>
        <FriendsMenu />
        <p>바깥</p>
      </FriendsProvider>
    </MemoryRouter>,
  );
}

const trigger = () => screen.getByRole('button', { name: /^친구(,|$)/ });

async function openMenu() {
  await userEvent.click(trigger());
  return screen.getByTestId('friends-menu');
}

async function openAddTab() {
  const panel = await openMenu();
  await userEvent.click(within(panel).getByRole('tab', { name: /친구 추가/ }));
  return panel;
}

describe('친구 아이콘과 배지', () => {
  it('받은 요청 수를 헤더 아이콘과 "친구 추가" 탭에 숫자 배지로 보여 준다', async () => {
    renderMenu();

    await waitFor(() => expect(within(trigger()).getByTestId('friend-request-badge')).toHaveTextContent('2'));
    expect(trigger()).toHaveAccessibleName('친구, 받은 요청 2개');
    expect(trigger().querySelector('svg')).not.toBeNull();

    const panel = await openMenu();
    const addTab = within(panel).getByRole('tab', { name: '친구 추가, 받은 요청 2개' });
    expect(within(addTab).getByTestId('friend-request-badge')).toHaveTextContent('2');
    expect(within(within(panel).getByRole('tab', { name: '친구 목록' })).queryByTestId('friend-request-badge')).not.toBeInTheDocument();
  });

  it('받은 요청이 없으면 배지가 없다', async () => {
    server.incoming = [];
    renderMenu();

    const panel = await openMenu();

    await within(panel).findByText('밥');
    expect(screen.queryByTestId('friend-request-badge')).not.toBeInTheDocument();
    expect(trigger()).toHaveAccessibleName('친구');
  });

  it('친구 기능을 쓸 수 없는 곳(FriendsProvider 밖)에서는 아이콘을 그리지 않는다', () => {
    render(<MemoryRouter><FriendsMenu /></MemoryRouter>);

    expect(screen.queryByRole('button', { name: /친구/ })).not.toBeInTheDocument();
  });

  it('아이콘 아래에 펼쳐지고 Esc·바깥 누르기·다시 누르기로 닫힌다', async () => {
    renderMenu();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');

    const panel = await openMenu();
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toHaveClass('absolute', 'top-full', 'left-2', 'right-2', 'sm:w-[340px]');

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByTestId('friends-menu')).not.toBeInTheDocument());
    await userEvent.click(trigger());
    await userEvent.click(screen.getByText('바깥'));
    await waitFor(() => expect(screen.queryByTestId('friends-menu')).not.toBeInTheDocument());
    await userEvent.click(trigger());
    await userEvent.click(trigger());
    await waitFor(() => expect(screen.queryByTestId('friends-menu')).not.toBeInTheDocument());
  });
});

describe('친구 목록 탭', () => {
  it('처음에는 친구 목록 탭이 열려 있고 친구마다 온라인·오프라인을 보여 준다', async () => {
    renderMenu();
    const panel = await openMenu();

    expect(within(panel).getByRole('tab', { name: '친구 목록' })).toHaveAttribute('aria-selected', 'true');
    expect(await within(panel).findByTestId('friend-status-2')).toHaveTextContent('온라인');
    expect(within(panel).getByTestId('friend-status-3')).toHaveTextContent('오프라인');
    expect(within(panel).getByText('접속 중 1명 · 전체 2명')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: '밥님 전적 보기, 온라인' })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: '캐럴님 전적 보기, 오프라인' })).toBeInTheDocument();
  });

  it('친구가 없으면 친구 추가로 안내한다', async () => {
    server.friends = [];
    renderMenu();

    const panel = await openMenu();

    expect(within(panel).getByTestId('no-friends')).toHaveTextContent('아직 친구가 없어요.');
  });

  it('열 때마다 목록을 다시 불러오고, 열어 두지 않아도 20초마다 다시 불러온다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderMenu();
      await waitFor(() => expect(friendsApi.list).toHaveBeenCalledTimes(1));

      await act(() => vi.advanceTimersByTimeAsync(FRIENDS_POLL_MS));
      expect(friendsApi.list).toHaveBeenCalledTimes(2);
      expect(friendsApi.requests).toHaveBeenCalledTimes(2);

      await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(trigger());
      await waitFor(() => expect(friendsApi.list).toHaveBeenCalledTimes(3));
    } finally {
      vi.useRealTimers();
    }
  });

  it('친구를 누르면 그 친구의 전적 창이 뜨고 아래에 친구 삭제 버튼이 있다', async () => {
    renderMenu();
    const panel = await openMenu();

    await userEvent.click(await within(panel).findByRole('button', { name: /밥님 전적 보기/ }));

    const dialog = await screen.findByRole('dialog', { name: '밥님 전적' });
    expect(recordsApi.member).toHaveBeenCalledWith(2);
    expect(await within(dialog).findByText('아직 기록이 없어요')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '친구 삭제' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('friends-menu')).not.toBeInTheDocument());
  });
});

describe('친구 삭제', () => {
  async function askRemove() {
    renderMenu();
    const panel = await openMenu();
    await userEvent.click(await within(panel).findByRole('button', { name: /밥님 전적 보기/ }));
    const dialog = await screen.findByRole('dialog', { name: '밥님 전적' });
    await userEvent.click(within(dialog).getByRole('button', { name: '친구 삭제' }));
    return screen.findByRole('dialog', { name: '밥님을 친구에서 삭제할까요?' });
  }

  it('친구 삭제를 누르면 바로 지우지 않고 정말 삭제할지 한 번 묻는다', async () => {
    const confirm = await askRemove();

    expect(within(confirm).getByText(/정말 삭제하시겠어요\?/)).toBeInTheDocument();
    expect(friendsApi.remove).not.toHaveBeenCalled();
  });

  it('취소하면 지우지 않고 전적 창으로 돌아간다', async () => {
    const confirm = await askRemove();

    await userEvent.click(within(confirm).getByRole('button', { name: '취소' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '밥님을 친구에서 삭제할까요?' })).not.toBeInTheDocument());
    expect(screen.getByRole('dialog', { name: '밥님 전적' })).toBeInTheDocument();
    expect(friendsApi.remove).not.toHaveBeenCalled();
  });

  it('묻는 동안 Esc를 눌러도 확인 창만 닫히고 전적 창은 남는다', async () => {
    await askRemove();

    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '밥님을 친구에서 삭제할까요?' })).not.toBeInTheDocument());
    expect(screen.getByRole('dialog', { name: '밥님 전적' })).toBeInTheDocument();
  });

  it('삭제를 누르면 지우고 창을 모두 닫은 뒤 목록에서 사라진다', async () => {
    vi.mocked(friendsApi.remove).mockImplementation(() => {
      server.friends = [carol];
      return Promise.resolve();
    });
    const confirm = await askRemove();

    await userEvent.click(within(confirm).getByRole('button', { name: '삭제' }));

    expect(friendsApi.remove).toHaveBeenCalledWith(2);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(toast.show).toHaveBeenCalledWith('밥님을 친구에서 삭제했어요.', 'info');
    const panel = await openMenu();
    expect(await within(panel).findByText('캐럴')).toBeInTheDocument();
    expect(within(panel).queryByText('밥')).not.toBeInTheDocument();
  });

  it('삭제에 실패하면 서버 안내를 보여 주고 전적 창으로 돌아간다', async () => {
    vi.mocked(friendsApi.remove).mockImplementation(() => Promise.reject(new ApiError(404, 'FRIEND_NOT_FOUND', '친구 목록에 없는 사람이에요.')));
    const confirm = await askRemove();

    await userEvent.click(within(confirm).getByRole('button', { name: '삭제' }));

    await waitFor(() => expect(toast.show).toHaveBeenCalledWith('친구 목록에 없는 사람이에요.'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '밥님을 친구에서 삭제할까요?' })).not.toBeInTheDocument());
  });
});

describe('친구 추가 탭', () => {
  it('받은 요청마다 체크(수락)·X(거절) 버튼을, 보낸 요청에는 취소(X) 버튼을 SVG 아이콘으로 둔다', async () => {
    renderMenu();
    const panel = await openAddTab();

    const incoming = within(panel).getByRole('region', { name: '받은 요청' });
    expect(within(incoming).getByText('데이브')).toBeInTheDocument();
    expect(within(incoming).getByText('에린')).toBeInTheDocument();
    for (const name of ['데이브님 요청 수락', '데이브님 요청 거절', '에린님 요청 수락', '에린님 요청 거절']) {
      expect(within(incoming).getByRole('button', { name }).querySelector('svg')).not.toBeNull();
    }
    const outgoing = within(panel).getByRole('region', { name: '보낸 요청' });
    expect(within(outgoing).getByText('프랭크')).toBeInTheDocument();
    expect(within(outgoing).getByRole('button', { name: '프랭크님에게 보낸 요청 취소' }).querySelector('svg')).not.toBeNull();
  });

  it('체크를 누르면 수락하고 요청이 사라지며 배지가 줄어든다', async () => {
    vi.mocked(friendsApi.accept).mockImplementation(() => {
      server.incoming = [fromErin];
      server.friends = [bob, carol, { memberId: 4, nickname: '데이브', avatar: 'DOG', online: false }];
      return Promise.resolve();
    });
    renderMenu();
    const panel = await openAddTab();

    await userEvent.click(within(panel).getByRole('button', { name: '데이브님 요청 수락' }));

    expect(friendsApi.accept).toHaveBeenCalledWith(11);
    await waitFor(() => expect(within(panel).queryByRole('button', { name: '데이브님 요청 수락' })).not.toBeInTheDocument());
    expect(within(trigger()).getByTestId('friend-request-badge')).toHaveTextContent('1');
    await userEvent.click(within(panel).getByRole('tab', { name: '친구 목록' }));
    expect(within(panel).getByText('데이브')).toBeInTheDocument();
  });

  it('X를 누르면 거절하고 요청이 사라진다', async () => {
    vi.mocked(friendsApi.decline).mockImplementation(() => {
      server.incoming = [fromDave];
      return Promise.resolve();
    });
    renderMenu();
    const panel = await openAddTab();

    await userEvent.click(within(panel).getByRole('button', { name: '에린님 요청 거절' }));

    expect(friendsApi.decline).toHaveBeenCalledWith(12);
    await waitFor(() => expect(within(panel).queryByText('에린')).not.toBeInTheDocument());
    expect(friendsApi.accept).not.toHaveBeenCalled();
  });

  it('보낸 요청의 X를 누르면 취소한다', async () => {
    vi.mocked(friendsApi.cancel).mockImplementation(() => {
      server.outgoing = [];
      return Promise.resolve();
    });
    renderMenu();
    const panel = await openAddTab();

    await userEvent.click(within(panel).getByRole('button', { name: '프랭크님에게 보낸 요청 취소' }));

    expect(friendsApi.cancel).toHaveBeenCalledWith(21);
    expect(await within(panel).findByText('보낸 요청이 없어요.')).toBeInTheDocument();
  });

  it('수락에 실패하면 서버 안내를 토스트로 보여 준다', async () => {
    vi.mocked(friendsApi.accept).mockImplementation(() => Promise.reject(new ApiError(409, 'FRIEND_LIMIT_REACHED', '친구 목록이 가득 찼어요. 친구는 100명까지 만들 수 있어요.')));
    renderMenu();
    const panel = await openAddTab();

    await userEvent.click(within(panel).getByRole('button', { name: '데이브님 요청 수락' }));

    await waitFor(() => expect(toast.show).toHaveBeenCalledWith('친구 목록이 가득 찼어요. 친구는 100명까지 만들 수 있어요.'));
  });

  it('닉네임을 넣고 요청을 누르면 요청을 보내고 보낸 요청에 보인다', async () => {
    const toGrace: FriendRequest = { requestId: 22, memberId: 7, nickname: '그레이스' };
    vi.mocked(friendsApi.requestByNickname).mockImplementation(() => {
      server.outgoing = [toGrace, toFrank];
      return Promise.resolve({ status: 'REQUESTED', memberId: 7, nickname: '그레이스' });
    });
    renderMenu();
    const panel = await openAddTab();
    const input = within(panel).getByRole('textbox', { name: '친구로 추가할 닉네임' });
    expect(within(panel).getByRole('button', { name: '요청' })).toBeDisabled();

    await userEvent.type(input, ' 그레이스 ');
    await userEvent.click(within(panel).getByRole('button', { name: '요청' }));

    expect(friendsApi.requestByNickname).toHaveBeenCalledWith('그레이스');
    expect(await within(panel).findByRole('status')).toHaveTextContent('그레이스님에게 친구 요청을 보냈어요.');
    expect(input).toHaveValue('');
    expect(within(within(panel).getByRole('region', { name: '보낸 요청' })).getByText('그레이스')).toBeInTheDocument();
  });

  it('상대가 먼저 보낸 요청이 있었다면 바로 친구가 됐다고 알려 준다', async () => {
    vi.mocked(friendsApi.requestByNickname).mockResolvedValue({ status: 'ACCEPTED', memberId: 4, nickname: '데이브' });
    renderMenu();
    const panel = await openAddTab();

    await userEvent.type(within(panel).getByRole('textbox', { name: '친구로 추가할 닉네임' }), '데이브{Enter}');

    expect(await within(panel).findByRole('status')).toHaveTextContent('데이브님과 친구가 됐어요.');
  });

  it.each([
    ['MEMBER_NOT_FOUND', 404, '회원을 찾을 수 없습니다.', '닉네임을 다시 확인해주세요.'],
    ['CANNOT_FRIEND_SELF', 400, '나에게는 친구 요청을 보낼 수 없어요.', '나에게는 친구 요청을 보낼 수 없어요.'],
    ['ALREADY_FRIENDS', 409, '이미 친구예요.', '이미 친구예요.'],
    ['FRIEND_REQUEST_ALREADY_SENT', 409, '이미 친구 요청을 보냈어요.', '이미 친구 요청을 보냈어요.'],
  ])('요청할 수 없으면 까닭을 알려 준다(%s)', async (code, status, serverMessage, shown) => {
    vi.mocked(friendsApi.requestByNickname).mockImplementation(() => Promise.reject(new ApiError(status, code, serverMessage)));
    renderMenu();
    const panel = await openAddTab();
    const input = within(panel).getByRole('textbox', { name: '친구로 추가할 닉네임' });

    await userEvent.type(input, '누군가{Enter}');

    expect(await within(panel).findByRole('alert')).toHaveTextContent(shown);
    expect(input).toHaveValue('누군가');
    await userEvent.type(input, '요');
    expect(within(panel).queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('실시간 알림', () => {
  afterEach(() => vi.useRealTimers());

  it('친구 요청이 오면 토스트로 알리고 새로 고치지 않아도 배지가 늘어난다', async () => {
    server.incoming = [];
    renderMenu();
    await waitFor(() => expect(friendsApi.requests).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('friend-request-badge')).not.toBeInTheDocument();

    server.incoming = [fromDave];
    act(() => state.handlers.get('/user/queue/friends')?.({ type: 'REQUEST_RECEIVED', nickname: '데이브' }));

    expect(toast.show).toHaveBeenCalledWith('데이브님이 친구 요청을 보냈어요.', 'info');
    expect(await screen.findByTestId('friend-request-badge')).toHaveTextContent('1');
  });

  it('내 요청이 수락되면 토스트로 알리고 친구 목록을 다시 불러온다', async () => {
    renderMenu();
    await waitFor(() => expect(friendsApi.list).toHaveBeenCalledTimes(1));

    act(() => state.handlers.get('/user/queue/friends')?.({ type: 'REQUEST_ACCEPTED', nickname: '프랭크' }));

    expect(toast.show).toHaveBeenCalledWith('프랭크님과 친구가 됐어요.', 'info');
    await waitFor(() => expect(friendsApi.list).toHaveBeenCalledTimes(2));
  });

  it('거절·취소·삭제 신호(UPDATED)는 알림 없이 목록만 다시 불러온다', async () => {
    renderMenu();
    await waitFor(() => expect(friendsApi.list).toHaveBeenCalledTimes(1));

    act(() => state.handlers.get('/user/queue/friends')?.({ type: 'UPDATED', nickname: null }));

    await waitFor(() => expect(friendsApi.list).toHaveBeenCalledTimes(2));
    expect(toast.show).not.toHaveBeenCalled();
  });
});
