import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { friendsApi, type Friend, type FriendRequest, type FriendSearchResult } from '../api/friends';
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
    list: vi.fn(), requests: vi.fn(), search: vi.fn(), requestById: vi.fn(),
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
});

describe('닉네임 검색', () => {
  const grace: FriendSearchResult = { memberId: 7, nickname: '그레이스', avatar: 'OWL', relation: 'NONE' };
  const nicknameInput = (panel: HTMLElement) => within(panel).getByRole('textbox', { name: '친구로 추가할 닉네임' });
  const card = (panel: HTMLElement) => within(panel).getByTestId('friend-search-card');

  async function searchFor(found: FriendSearchResult) {
    vi.mocked(friendsApi.search).mockResolvedValue(found);
    renderMenu();
    const panel = await openAddTab();
    await userEvent.type(nicknameInput(panel), `${found.nickname}{Enter}`);
    await within(panel).findByTestId('friend-search-card');
    return panel;
  }

  it('검색을 누르면 찾은 사람의 그림·닉네임·전적을 카드로 보여 주고 요청은 보내지 않는다', async () => {
    vi.mocked(friendsApi.search).mockResolvedValue(grace);
    vi.mocked(recordsApi.member).mockResolvedValue({
      memberId: 7, nickname: '그레이스', avatar: 'OWL',
      stats: [
        { gameType: 'PAPER_SAFARI', gameTypeName: '페이퍼 사파리', matches: 6, wins: 3, draws: 0, losses: 3 },
        { gameType: 'UNO', gameTypeName: '우노', matches: 4, wins: 2, draws: 0, losses: 2 },
      ] as never,
    });
    renderMenu();
    const panel = await openAddTab();
    expect(within(panel).getByRole('button', { name: '검색' })).toBeDisabled();
    expect(within(panel).queryByTestId('friend-search-card')).not.toBeInTheDocument();

    await userEvent.type(nicknameInput(panel), ' 그레이스 ');
    await userEvent.click(within(panel).getByRole('button', { name: '검색' }));

    expect(friendsApi.search).toHaveBeenCalledWith('그레이스');
    const found = await within(panel).findByTestId('friend-search-card');
    expect(within(found).getByText('그레이스')).toBeInTheDocument();
    expect(found.querySelector('[data-avatar], img, svg')).not.toBeNull();
    expect(recordsApi.member).toHaveBeenCalledWith(7);
    expect(await within(found).findByText('10판 5승 · 승률 50.0%')).toBeInTheDocument();
    expect(within(found).getByRole('button', { name: '친구 요청' })).toBeEnabled();
    expect(friendsApi.requestById).not.toHaveBeenCalled();
  });

  it('기록이 없는 사람은 아직 기록이 없다고 보여 주고, 전적을 못 불러와도 카드는 그대로 보인다', async () => {
    const panel = await searchFor(grace);
    expect(await within(card(panel)).findByText('아직 기록이 없어요')).toBeInTheDocument();

    vi.mocked(recordsApi.member).mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.'));
    vi.mocked(friendsApi.search).mockResolvedValue({ memberId: 8, nickname: '헨리', relation: 'NONE' });
    await userEvent.clear(nicknameInput(panel));
    await userEvent.type(nicknameInput(panel), '헨리{Enter}');

    expect(await within(panel).findByRole('group', { name: '헨리님 검색 결과' })).toBeInTheDocument();
    expect(within(card(panel)).getByTestId('friend-search-stats')).toBeEmptyDOMElement();
    expect(within(card(panel)).getByRole('button', { name: '친구 요청' })).toBeEnabled();
  });

  it('카드의 친구 요청을 누르면 회원 번호로 요청을 보내고, 카드는 "요청 보냄"으로 바뀌며 보낸 요청에 보인다', async () => {
    const toGrace: FriendRequest = { requestId: 22, memberId: 7, nickname: '그레이스' };
    vi.mocked(friendsApi.requestById).mockImplementation(() => {
      server.outgoing = [toGrace, toFrank];
      return Promise.resolve({ status: 'REQUESTED', memberId: 7, nickname: '그레이스' });
    });
    const panel = await searchFor(grace);

    await userEvent.click(within(card(panel)).getByRole('button', { name: '친구 요청' }));

    expect(friendsApi.requestById).toHaveBeenCalledWith(7);
    const sent = await within(card(panel)).findByRole('button', { name: '요청 보냄' });
    expect(sent).toBeDisabled();
    expect(sent.className).not.toMatch(/opacity/);
    expect(within(card(panel)).queryByRole('button', { name: '친구 요청' })).not.toBeInTheDocument();
    expect(toast.show).toHaveBeenCalledWith('그레이스님에게 친구 요청을 보냈어요.', 'info');
    expect(within(within(panel).getByRole('region', { name: '보낸 요청' })).getByText('그레이스')).toBeInTheDocument();
    expect(nicknameInput(panel)).toHaveValue('그레이스');
  });

  it('보낸 요청을 아래 목록에서 취소하면 카드가 다시 "친구 요청"으로 돌아온다', async () => {
    const panel = await searchFor({ memberId: 6, nickname: '프랭크', avatar: 'BEAR', relation: 'REQUEST_SENT' });
    expect(within(card(panel)).getByRole('button', { name: '요청 보냄' })).toBeDisabled();
    vi.mocked(friendsApi.cancel).mockImplementation(() => {
      server.outgoing = [];
      return Promise.resolve();
    });

    await userEvent.click(within(panel).getByRole('button', { name: '프랭크님에게 보낸 요청 취소' }));

    expect(await within(card(panel)).findByRole('button', { name: '친구 요청' })).toBeEnabled();
  });

  it('나에게 요청을 보낸 사람이면 "요청 수락"을 보여 주고, 누르면 친구가 된다', async () => {
    vi.mocked(friendsApi.requestById).mockImplementation(() => {
      server.friends = [bob, carol, { memberId: 4, nickname: '데이브', avatar: 'DOG', online: false }];
      server.incoming = [fromErin];
      return Promise.resolve({ status: 'ACCEPTED', memberId: 4, nickname: '데이브' });
    });
    const panel = await searchFor({ memberId: 4, nickname: '데이브', avatar: 'DOG', relation: 'REQUEST_RECEIVED' });

    await userEvent.click(within(card(panel)).getByRole('button', { name: '요청 수락' }));

    expect(friendsApi.requestById).toHaveBeenCalledWith(4);
    expect(await within(card(panel)).findByText('이미 친구예요')).toBeInTheDocument();
    expect(toast.show).toHaveBeenCalledWith('데이브님과 친구가 됐어요.', 'info');
    expect(within(card(panel)).queryByRole('button')).not.toBeInTheDocument();
  });

  it.each([
    ['FRIEND', '이미 친구예요'],
    ['SELF', '내 닉네임이에요'],
  ] as const)('%s이면 버튼 없이 "%s"라고 알려 준다', async (relation, text) => {
    const panel = await searchFor({ memberId: 9, nickname: '누군가', relation });

    expect(within(card(panel)).getByText(text)).toBeInTheDocument();
    expect(within(card(panel)).queryByRole('button')).not.toBeInTheDocument();
  });

  it('요청에 실패하면 서버 안내를 토스트로 보여 주고 카드는 그대로 둔다', async () => {
    vi.mocked(friendsApi.requestById).mockImplementation(() => Promise.reject(new ApiError(409, 'FRIEND_LIMIT_REACHED', '친구 목록이 가득 찼어요. 친구는 100명까지 만들 수 있어요.')));
    const panel = await searchFor(grace);

    await userEvent.click(within(card(panel)).getByRole('button', { name: '친구 요청' }));

    await waitFor(() => expect(toast.show).toHaveBeenCalledWith('친구 목록이 가득 찼어요. 친구는 100명까지 만들 수 있어요.'));
    expect(within(card(panel)).getByRole('button', { name: '친구 요청' })).toBeEnabled();
  });

  it('다시 검색하면 카드가 바뀌고, 입력을 지우면 카드가 사라진다', async () => {
    const panel = await searchFor(grace);
    vi.mocked(friendsApi.search).mockResolvedValue({ memberId: 8, nickname: '헨리', relation: 'FRIEND' });

    await userEvent.clear(nicknameInput(panel));
    expect(within(panel).queryByTestId('friend-search-card')).not.toBeInTheDocument();
    await userEvent.type(nicknameInput(panel), '헨리{Enter}');

    expect(await within(panel).findByRole('group', { name: '헨리님 검색 결과' })).toBeInTheDocument();
    expect(within(panel).getAllByTestId('friend-search-card')).toHaveLength(1);
    expect(within(panel).queryByText('그레이스')).not.toBeInTheDocument();
  });

  it('찾지 못하면 닉네임을 다시 확인하라고 알려 주고, 앞서 찾은 카드는 치운다', async () => {
    const panel = await searchFor(grace);
    vi.mocked(friendsApi.search).mockImplementation(() => Promise.reject(new ApiError(404, 'MEMBER_NOT_FOUND', '회원을 찾을 수 없습니다.')));
    const input = nicknameInput(panel);

    await userEvent.clear(input);
    await userEvent.type(input, '없는사람{Enter}');

    expect(await within(panel).findByRole('alert')).toHaveTextContent(/^닉네임을 다시 확인해주세요\.$/);
    expect(within(panel).queryByTestId('friend-search-card')).not.toBeInTheDocument();
    expect(input).toHaveValue('없는사람');
    expect(friendsApi.requestById).not.toHaveBeenCalled();
    await userEvent.type(input, '요');
    expect(within(panel).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('그 밖의 검색 실패는 서버 안내를 그대로 보여 준다', async () => {
    vi.mocked(friendsApi.search).mockImplementation(() => Promise.reject(new ApiError(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')));
    renderMenu();
    const panel = await openAddTab();

    await userEvent.type(nicknameInput(panel), '누군가{Enter}');

    expect(await within(panel).findByRole('alert')).toHaveTextContent('일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
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
