import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/http';
import { invitesApi, type InviteSignal } from '../api/invites';
import type { Room } from '../api/types';
import { InviteCards } from './InviteCards';

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
vi.mock('../friends/FriendsContext', () => ({ useFriends: () => ({ friends: [{ memberId: 2, nickname: '밥', avatar: 'FOX', online: true }] }) }));
vi.mock('../api/invites', () => ({ invitesApi: { send: vi.fn(), accept: vi.fn(), decline: vi.fn() } }));

const invited: InviteSignal = {
  type: 'INVITED', inviteId: 'inv-1', memberId: 2, nickname: '밥', roomCode: 'ABC234', roomName: '모여라',
  gameType: 'UNO', gameTypeName: '우노', expiresInSeconds: 30,
};
const joined = { code: 'ABC234' } as Room;

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderCards(path = '/games/uno') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Where />
      <InviteCards />
    </MemoryRouter>,
  );
}

function push(signal: InviteSignal) {
  act(() => state.handlers.get('/user/queue/invites')?.(signal));
}

beforeEach(() => {
  toast.show.mockReset();
  vi.mocked(invitesApi.accept).mockReset().mockResolvedValue(joined);
  vi.mocked(invitesApi.decline).mockReset().mockResolvedValue(undefined);
});

afterEach(() => vi.useRealTimers());

describe('방 초대 카드', () => {
  it('초대가 오면 누가 어느 방(게임)으로 불렀는지와 참가·거절 버튼을 보여 준다', () => {
    renderCards();
    expect(screen.queryByTestId('invite-card')).toBeNull();

    push(invited);

    const card = screen.getByRole('group', { name: '밥님의 방 초대' });
    expect(card).toHaveTextContent("밥님이 '모여라'(우노) 방에 초대했어요");
    expect(within(card).getByRole('button', { name: '참가' })).toBeEnabled();
    expect(within(card).getByRole('button', { name: '거절' })).toBeEnabled();
    expect(card).not.toHaveAttribute('data-compact');
  });

  it('화면을 막지 않는다: 카드 밖은 눌리고, 대화상자나 배경이 없다', () => {
    renderCards();
    push(invited);

    expect(screen.getByRole('list', { name: '받은 방 초대' })).toHaveClass('pointer-events-none');
    expect(screen.getByTestId('invite-card')).toHaveClass('pointer-events-auto');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByTestId('modal-backdrop')).toBeNull();
  });

  it('참가를 누르면 초대로 들어가고 그 방으로 이동한다', async () => {
    renderCards();
    push(invited);

    await userEvent.click(screen.getByRole('button', { name: '참가' }));

    expect(invitesApi.accept).toHaveBeenCalledWith('ABC234', 'inv-1');
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/rooms/ABC234'));
    await waitFor(() => expect(screen.queryByTestId('invite-card')).toBeNull());
    expect(toast.show).not.toHaveBeenCalled();
  });

  it('거절을 누르면 카드가 바로 사라지고 서버에 거절을 알린다', async () => {
    renderCards();
    push(invited);

    await userEvent.click(screen.getByRole('button', { name: '거절' }));

    expect(invitesApi.decline).toHaveBeenCalledWith('ABC234', 'inv-1');
    await waitFor(() => expect(screen.queryByTestId('invite-card')).toBeNull());
    expect(invitesApi.accept).not.toHaveBeenCalled();
    expect(screen.getByTestId('where')).toHaveTextContent('/games/uno');
  });

  it.each([
    ['ROOM_NOT_FOUND', '방이 사라졌어요.'],
    ['ROOM_FULL', '방이 가득 찼어요.'],
    ['ROOM_ALREADY_PLAYING', '이미 게임이 시작된 방이에요.'],
    ['GAME_STARTING', '곧 게임이 시작돼서 지금은 들어갈 수 없어요.'],
    ['INVITE_EXPIRED', '초대가 만료됐어요.'],
  ])('참가하지 못하면(%s) 까닭을 알리고 카드를 내린다', async (code, message) => {
    vi.mocked(invitesApi.accept).mockRejectedValue(new ApiError(409, code, '서버 문구'));
    renderCards();
    push(invited);

    await userEvent.click(screen.getByRole('button', { name: '참가' }));

    await waitFor(() => expect(toast.show).toHaveBeenCalledWith(message));
    await waitFor(() => expect(screen.queryByTestId('invite-card')).toBeNull());
    expect(screen.getByTestId('where')).toHaveTextContent('/games/uno');
  });

  it('다른 방에 있으면 먼저 나오라고 알리고, 나온 뒤 다시 누를 수 있게 카드를 남긴다', async () => {
    vi.mocked(invitesApi.accept).mockRejectedValueOnce(new ApiError(409, 'ALREADY_IN_ROOM', '이미 다른 방에 참여 중입니다.'));
    renderCards();
    push(invited);

    await userEvent.click(screen.getByRole('button', { name: '참가' }));

    await waitFor(() => expect(toast.show).toHaveBeenCalledWith('다른 방에 있어요. 그 방에서 나온 뒤 다시 참가를 눌러 주세요.'));
    expect(screen.getByTestId('invite-card')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '참가' }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/rooms/ABC234'));
  });

  it('모르는 오류는 서버 문구를 그대로 보여 준다', async () => {
    vi.mocked(invitesApi.accept).mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다.'));
    renderCards();
    push(invited);

    await userEvent.click(screen.getByRole('button', { name: '참가' }));

    await waitFor(() => expect(toast.show).toHaveBeenCalledWith('일시적인 오류가 발생했습니다.'));
  });

  it('가만히 두면 만료되기 조금 전(28초)에 스스로 사라지고 거절로 알리지 않는다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderCards();
    push(invited);

    act(() => { vi.advanceTimersByTime(27_900); });
    expect(screen.getByRole('button', { name: '참가' })).toBeEnabled();
    act(() => { vi.advanceTimersByTime(200); });

    await waitFor(() => expect(screen.queryByTestId('invite-card')).toBeNull());
    expect(invitesApi.decline).not.toHaveBeenCalled();
  });

  it('같은 사람이 같은 방으로 다시 부르면 카드를 새 초대로 바꾸고, 다른 초대는 따로 쌓는다', async () => {
    renderCards();
    push(invited);
    push({ ...invited, inviteId: 'inv-2' });
    push({ ...invited, inviteId: 'inv-3', memberId: 5, nickname: '에린', roomCode: 'ZZZ999', roomName: '다른 방' });

    await waitFor(() => expect(screen.getAllByTestId('invite-card')).toHaveLength(2));
    await userEvent.click(within(screen.getByRole('group', { name: '밥님의 방 초대' })).getByRole('button', { name: '참가' }));

    expect(invitesApi.accept).toHaveBeenCalledWith('ABC234', 'inv-2');
  });

  it('방 화면(대기실·게임 중)에서는 한 줄짜리 작은 카드로 줄인다', () => {
    renderCards('/rooms/QWE123');
    push(invited);

    const card = screen.getByTestId('invite-card');
    expect(card).toHaveAttribute('data-compact', 'true');
    expect(within(card).getByRole('button', { name: '참가' })).toHaveClass('text-xs');
    expect(card).toHaveTextContent("밥님이 '모여라'(우노) 방에 초대했어요");
  });

  it('내 초대를 거절하면 작은 알림으로 알려 주고 카드는 띄우지 않는다', () => {
    renderCards();

    push({ type: 'DECLINED', memberId: 3, nickname: '캐럴' });

    expect(toast.show).toHaveBeenCalledWith('캐럴님이 초대를 거절했어요.', 'info');
    expect(screen.queryByTestId('invite-card')).toBeNull();
  });
});
