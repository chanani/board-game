import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Room, UnoView } from '../../api/types';
import { SILENT_SOUND, SoundContext, type SoundName } from '../../lib/sound';
import { setMediaMatches } from '../../test/media';
import { UnoTable } from './UnoTable';
import { num, unoEvent, unoSession, wild } from './unoFixtures';

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

    await userEvent.click(screen.getByRole('button', { name: '우노 안 외쳤어요! (밥님 잡기)' }));

    expect(send).toHaveBeenCalledWith({ type: 'CATCH_UNO', targetId: 2 });
  });

  it('잡을 수 없으면 잡기 버튼이 없다', () => {
    render(table({ unoCatch: { playerId: 1 }, canCatch: false }, vi.fn()));

    expect(screen.queryByRole('button', { name: /우노 안 외쳤어요!/ })).not.toBeInTheDocument();
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
