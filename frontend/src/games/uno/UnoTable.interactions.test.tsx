import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Room, UnoView } from '../../api/types';
import { SILENT_SOUND, SoundContext, type SoundName } from '../../lib/sound';
import { setMediaMatches } from '../../test/media';
import { UnoTable } from './UnoTable';
import { num, unoEvent, unoSession, wild, wildFour } from './unoFixtures';

const toast = vi.hoisted(() => ({ show: vi.fn() }));
vi.mock('../../components/Toast', () => ({ useToast: () => toast }));

const room: Room = {
  code: 'UNO123', name: '우노 방', gameType: 'UNO', gameTypeName: '우노', status: 'PLAYING', hostId: 1, maxPlayers: 5,
  locked: false, spectators: [], theme: 'WOOD',
  members: [
    { id: 1, nickname: '앨리스', host: true, connected: true, offlineSeconds: 0, ready: false },
    { id: 2, nickname: '밥', host: false, connected: true, offlineSeconds: 0, ready: false },
    { id: 3, nickname: '캐롤', host: false, connected: true, offlineSeconds: 0, ready: false },
  ],
};
const nicknameOf = (id: number) => room.members.find((member) => member.id === id)?.nickname ?? '떠난 플레이어';

function table(overrides: Partial<UnoView>, send: (action: unknown) => void, play: (name: SoundName) => void = vi.fn(), errorSeq = 0) {
  return (
    <SoundContext.Provider value={{ ...SILENT_SOUND, play }}>
      <UnoTable view={unoSession(overrides)} room={room} meId={1} log={[]} receivedAt={0} now={0} errorSeq={errorSeq}
        nicknameOf={nicknameOf} send={send} onCloseGameOver={vi.fn()} onReadyNext={vi.fn()} />
    </SoundContext.Provider>
  );
}

beforeEach(() => {
  setMediaMatches(true);
  toast.show.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('UnoTable 와일드와 색 고르기', () => {
  it('와일드를 누르면 색 고르기 창이 뜨고 색을 누르면 색과 함께 낸다', async () => {
    const send = vi.fn();
    render(table({}, send));

    await userEvent.click(screen.getByRole('button', { name: '와일드, 낼 수 있어요' }));
    const dialog = await screen.findByRole('dialog', { name: '색을 골라 주세요' });
    expect(within(dialog).getByRole('button', { name: '빨강, 내 카드 1장' })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: /^초록/ }));

    expect(send).toHaveBeenCalledWith({ type: 'PLAY', cardId: 100, color: 'GREEN' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '색을 골라 주세요' })).not.toBeInTheDocument());
  });

  it('취소하면 아무것도 보내지 않는다', async () => {
    const send = vi.fn();
    render(table({}, send));
    await userEvent.click(screen.getByRole('button', { name: '와일드, 낼 수 있어요' }));

    await userEvent.click(await screen.findByRole('button', { name: '취소' }));

    expect(send).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('지금 색 카드가 있는데 와일드 +4를 내려 하면 경고한다', async () => {
    render(table({ hand: [num('RED', 2, 3), wildFour(104)], playableCardIds: [3, 104], wildDrawFourRisky: true }, vi.fn()));

    await userEvent.click(screen.getByRole('button', { name: '와일드 +4, 낼 수 있어요' }));

    expect(await screen.findByText('지금 색 카드가 있어서, 도전받으면 내가 4장을 뽑아요.')).toBeInTheDocument();
  });

  it('첫 카드가 와일드면 취소 없이 색을 골라 CHOOSE_COLOR를 보낸다', async () => {
    const send = vi.fn();
    render(table({ stage: 'CHOOSE_COLOR', currentColor: null, discardTop: wild(101), playableCardIds: [] }, send));

    const dialog = await screen.findByRole('dialog', { name: '첫 카드가 와일드예요. 색을 골라 주세요' });
    expect(within(dialog).queryByRole('button', { name: '취소' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: '닫기' })).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: /^파랑/ }));

    expect(send).toHaveBeenCalledWith({ type: 'CHOOSE_COLOR', color: 'BLUE' });
  });
});

describe('UnoTable 도전', () => {
  const challenged: Partial<UnoView> = { stage: 'CHALLENGE', currentPlayerId: 1, challenge: { byId: 3, targetId: 1 }, playableCardIds: [], deadline: 15000, serverNow: 1000 };

  it('와일드 +4를 받으면 닫을 수 없는 도전 창이 뜬다', async () => {
    const send = vi.fn();
    render(table(challenged, send));

    const dialog = await screen.findByRole('dialog', { name: '와일드 +4를 받았어요' });
    expect(dialog).toHaveTextContent('캐롤님이 지금 색 카드를 갖고 있었다고 생각하면 도전하세요. 맞으면 캐롤님이 4장, 틀리면 내가 6장을 뽑아요.');
    expect(within(dialog).queryByRole('button', { name: '닫기' })).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: '와일드 +4를 받았어요' })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: '도전하기' }));

    expect(send).toHaveBeenCalledWith({ type: 'CHALLENGE' });
  });

  it('4장 받기는 ACCEPT를 보낸다', async () => {
    const send = vi.fn();
    render(table(challenged, send));

    await userEvent.click(await screen.findByRole('button', { name: '4장 받기' }));

    expect(send).toHaveBeenCalledWith({ type: 'ACCEPT' });
  });

  it('도전 결과 공개는 도전자에게 한 번만 뜨고 확인이나 5초 뒤에 닫힌다', async () => {
    const before: Partial<UnoView> = { stage: 'PLAY', currentPlayerId: 3, currentColor: 'RED', playableCardIds: [] };
    const reveal: Partial<UnoView> = {
      stage: 'PLAY', currentPlayerId: 1, currentColor: 'GREEN', discardTop: wildFour(104),
      reveal: { playerId: 3, cards: [num('RED', 2, 3), num('BLUE', 1, 76)], guilty: true },
      events: [unoEvent(7, 'CHALLENGE', { actorId: 1, targetId: 3, reason: 'GUILTY' }), unoEvent(8, 'PENALTY', { targetId: 3, count: 4, reason: 'CHALLENGE_GUILTY' })],
    };
    const { rerender } = render(table(before, vi.fn()));
    rerender(table(challenged, vi.fn()));
    rerender(table(reveal, vi.fn()));

    const dialog = await screen.findByRole('dialog', { name: '캐롤님의 카드' });
    expect(dialog).toHaveTextContent('지금 색 카드가 있었어요. 도전 성공!');
    expect(within(dialog).getAllByTestId('reveal-card')[0]).toHaveAttribute('data-highlight', 'true');
    await userEvent.click(within(dialog).getByRole('button', { name: '확인' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '캐롤님의 카드' })).not.toBeInTheDocument());

    rerender(table({ ...reveal, serverNow: 5 }, vi.fn()));
    expect(screen.queryByRole('dialog', { name: '캐롤님의 카드' })).not.toBeInTheDocument();
  });

  it('도전자의 공개는 다른 사람의 우노 외침 묶음에도 남아 있다가 reveal이 사라지면 닫힌다', async () => {
    const reveal: Partial<UnoView> = {
      stage: 'PLAY', currentPlayerId: 1, currentColor: 'GREEN',
      reveal: { playerId: 3, cards: [num('BLUE', 1, 76)], guilty: false },
      events: [unoEvent(7, 'CHALLENGE', { actorId: 1, targetId: 3, reason: 'INNOCENT' })],
    };
    const { rerender } = render(table(reveal, vi.fn()));
    expect(await screen.findByRole('dialog', { name: '캐롤님의 카드' })).toBeInTheDocument();

    rerender(table({ ...reveal, events: [unoEvent(8, 'UNO_CALL', { actorId: 2 })] }, vi.fn()));
    expect(screen.getByRole('dialog', { name: '캐롤님의 카드' })).toBeInTheDocument();

    rerender(table({ ...reveal, reveal: null, events: [unoEvent(9, 'UNO_CALL', { actorId: 3 })] }, vi.fn()));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '캐롤님의 카드' })).not.toBeInTheDocument());
  });

  it('도전 실패 공개는 5초 뒤 저절로 닫힌다', () => {
    vi.useFakeTimers();
    render(table({
      reveal: { playerId: 3, cards: [num('BLUE', 1, 76)], guilty: false },
      events: [unoEvent(7, 'CHALLENGE', { actorId: 1, targetId: 3, reason: 'INNOCENT' })],
    }, vi.fn()));

    expect(screen.getByRole('dialog', { name: '캐롤님의 카드' })).toHaveTextContent('지금 색 카드가 없었어요. 도전 실패…');
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByRole('dialog', { name: '캐롤님의 카드' })).not.toBeInTheDocument();
  });

  it('남의 도전 결과는 알림으로만 보여 준다', () => {
    const { rerender } = render(table({ currentPlayerId: 2 }, vi.fn()));

    rerender(table({ currentPlayerId: 3, events: [unoEvent(9, 'CHALLENGE', { actorId: 2, targetId: 3, reason: 'INNOCENT' })] }, vi.fn()));

    expect(toast.show).toHaveBeenCalledWith('밥님이 도전에 실패해 6장을 뽑고 차례를 건너뛰어요', 'info');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('UnoTable 잠금 중 와일드', () => {
  it('보내기 잠금 때문에 못 보낸 와일드는 색 고르기 창을 열어 둔다', async () => {
    const send = vi.fn();
    render(table({}, send));
    await userEvent.click(within(screen.getByTestId('uno-action-bar')).getByRole('button', { name: '카드 뽑기' }));
    await userEvent.click(screen.getByRole('button', { name: '와일드, 낼 수 있어요' }));

    await userEvent.click(within(await screen.findByRole('dialog', { name: '색을 골라 주세요' })).getByRole('button', { name: /^초록/ }));

    expect(send).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog', { name: '색을 골라 주세요' })).toBeInTheDocument();
  });

  it('새 판이 시작되면 이전 판의 도전 알림 순번에 막히지 않는다', () => {
    const { rerender } = render(table({ currentPlayerId: 2, events: [unoEvent(40, 'UNO_CALL', { actorId: 2 })] }, vi.fn()));

    rerender(table({ currentPlayerId: 3, startedAt: 999, events: [unoEvent(2, 'CHALLENGE', { actorId: 2, targetId: 3, reason: 'INNOCENT' })] }, vi.fn()));

    expect(toast.show).toHaveBeenCalledWith('밥님이 도전에 실패해 6장을 뽑고 차례를 건너뛰어요', 'info');
  });
});

describe('UnoTable 우노와 잡기', () => {
  it('외칠 수 있으면 우노! 버튼이 CALL_UNO를 보내고 외친 뒤에는 우노 외침으로 바뀐다', async () => {
    const send = vi.fn();
    const { rerender } = render(table({ canCallUno: true, hand: [num('RED', 2, 3), num('BLUE', 7, 88)], playableCardIds: [3] }, send));

    await userEvent.click(screen.getByRole('button', { name: '우노!' }));
    expect(send).toHaveBeenCalledWith({ type: 'CALL_UNO' });

    rerender(table({ canCallUno: false, hand: [num('RED', 2, 3), num('BLUE', 7, 88)], playableCardIds: [3], events: [unoEvent(5, 'UNO_CALL', { actorId: 1 })] }, send));
    expect(screen.getByRole('button', { name: '우노 외침' })).toBeDisabled();
  });

  it('잡을 수 있으면 대상 이름이 붙은 잡기 버튼이 CATCH_UNO를 보낸다', async () => {
    const send = vi.fn();
    render(table({ currentPlayerId: 3, playableCardIds: [], unoCatch: { playerId: 2 }, canCatch: true }, send));

    await userEvent.click(screen.getByRole('button', { name: '밥님 우노 안 외친 것 잡기' }));

    expect(send).toHaveBeenCalledWith({ type: 'CATCH_UNO', targetId: 2 });
  });

  it('잡을 수 없으면 잡기 버튼이 없다', () => {
    render(table({ unoCatch: { playerId: 1 }, canCatch: false }, vi.fn()));

    expect(screen.queryByRole('button', { name: /우노 안 외친 것 잡기/ })).not.toBeInTheDocument();
  });
});

describe('UnoTable 보내기 잠금과 소리', () => {
  it('보낸 뒤 화면이 바뀌거나 오류가 오기 전에는 다시 보내지 않는다', async () => {
    const send = vi.fn();
    const { rerender } = render(table({}, send));
    const drawButton = () => within(screen.getByTestId('uno-action-bar')).getByRole('button', { name: '카드 뽑기' });

    await userEvent.click(drawButton());
    await userEvent.click(drawButton());
    expect(send).toHaveBeenCalledTimes(1);

    rerender(table({}, send, vi.fn(), 1));
    await userEvent.click(drawButton());
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('내 단계가 새로 시작하면 차례 소리를 내고 뽑은 카드 단계에서는 내지 않는다', () => {
    const play = vi.fn();
    const { rerender } = render(table({ currentPlayerId: 2, deadline: 10000, playableCardIds: [] }, vi.fn(), play));
    expect(play).not.toHaveBeenCalledWith('myTurn');

    rerender(table({ currentPlayerId: 1, deadline: 20000 }, vi.fn(), play));
    expect(play).toHaveBeenCalledWith('myTurn');
    play.mockClear();

    rerender(table({ currentPlayerId: 1, stage: 'DRAWN', drawnCardId: 3, deadline: 25000 }, vi.fn(), play));
    expect(play).not.toHaveBeenCalledWith('myTurn');
  });
});
