import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameSignal, OldMaidView, Room } from '../../api/types';
import { SILENT_SOUND, SoundContext, type SoundName } from '../../lib/sound';
import { setMediaMatches } from '../../test/media';
import { OldMaidTable } from './OldMaidTable';
import { card, oldMaidEvent, oldMaidSession, peekSignal } from './oldMaidFixtures';

const room: Room = {
  code: 'OLDMAD', name: '도둑잡기 방', gameType: 'OLD_MAID', gameTypeName: '도둑잡기', status: 'PLAYING', hostId: 1, maxPlayers: 6,
  locked: false, spectators: [], theme: 'WOOD',
  members: [
    { id: 1, nickname: '앨리스', host: true, connected: true, offlineSeconds: 0, ready: false },
    { id: 2, nickname: '밥', host: false, connected: true, offlineSeconds: 0, ready: false },
    { id: 3, nickname: '캐롤', host: false, connected: true, offlineSeconds: 0, ready: false },
  ],
};
const nicknameOf = (id: number) => room.members.find((member) => member.id === id)?.nickname ?? '떠난 플레이어';

type Options = { send?: (action: unknown) => void; sendSignal?: (action: unknown) => void; signal?: GameSignal | null; play?: (name: SoundName) => void };

function table(overrides: Partial<OldMaidView> = {}, { send = vi.fn(), sendSignal = vi.fn(), signal = null, play = vi.fn() }: Options = {}) {
  return (
    <SoundContext.Provider value={{ ...SILENT_SOUND, play }}>
      <OldMaidTable view={oldMaidSession(overrides)} room={room} meId={1} log={[]} receivedAt={0} now={0} errorSeq={0}
        nicknameOf={nicknameOf} send={send} sendSignal={sendSignal} signal={signal} onCloseGameOver={vi.fn()} onReadyNext={vi.fn()} />
    </SoundContext.Provider>
  );
}

beforeEach(() => setMediaMatches(true));

describe('OldMaidTable 고르기', () => {
  it('마우스를 올리면 신호를 보내고 누르면 그 자리를 뽑는다', async () => {
    const send = vi.fn();
    const sendSignal = vi.fn();
    render(table({}, { send, sendSignal }));

    await userEvent.click(screen.getByRole('button', { name: '밥님의 2번째 카드' }));

    expect(sendSignal).toHaveBeenCalledWith({ type: 'PEEK', index: 1 });
    expect(send).toHaveBeenCalledWith({ type: 'DRAW', index: 1 });
  });

  it('보낸 뒤 화면이 바뀌기 전에는 다시 뽑지 않는다', async () => {
    const send = vi.fn();
    render(table({}, { send }));

    await userEvent.click(screen.getByRole('button', { name: '밥님의 1번째 카드' }));
    await userEvent.click(screen.getByRole('button', { name: '밥님의 2번째 카드' }));

    expect(send).toHaveBeenCalledTimes(1);
  });

  it('같은 차례에 남의 섞기 같은 다른 화면 갱신이 와도 뽑기 잠금은 풀리지 않는다(차례가 바뀌거나 오류가 오면 풀린다)', async () => {
    const send = vi.fn();
    const at = (overrides: Partial<OldMaidView>, errorSeq = 0) => (
      <OldMaidTable view={oldMaidSession(overrides)} room={room} meId={1} log={[]} receivedAt={0} now={0} errorSeq={errorSeq}
        nicknameOf={nicknameOf} send={send} sendSignal={vi.fn()} signal={null} onCloseGameOver={vi.fn()} onReadyNext={vi.fn()} />
    );
    const { rerender } = render(at({}));
    await userEvent.click(screen.getByRole('button', { name: '밥님의 1번째 카드' }));

    rerender(at({ events: [oldMaidEvent(1, 'SHUFFLE', { actorId: 3 })] }));
    await userEvent.click(screen.getByRole('button', { name: '밥님의 2번째 카드' }));
    expect(send).toHaveBeenCalledTimes(1);

    rerender(at({ events: [oldMaidEvent(1, 'SHUFFLE', { actorId: 3 })] }, 1));
    await userEvent.click(screen.getByRole('button', { name: '밥님의 2번째 카드' }));
    expect(send).toHaveBeenCalledTimes(2);

    rerender(at({ turnSeq: 2, events: [oldMaidEvent(1, 'SHUFFLE', { actorId: 3 })] }, 1));
    await userEvent.click(screen.getByRole('button', { name: '밥님의 3번째 카드' }));
    expect(send).toHaveBeenCalledTimes(3);
  });

  it('받은 신호로 내 손패의 그 자리 카드가 들린다(이전 차례 신호는 무시)', () => {
    const view = { currentPlayerId: 3, targetId: 1, turnSeq: 4, peek: { index: null, seq: 1 } };
    const { rerender } = render(table(view, { signal: peekSignal({ drawerId: 3, targetId: 1, turnSeq: 3, index: 0, seq: 5 }) }));
    expect(screen.getAllByTestId('my-card')[0]).not.toHaveAttribute('data-lifted');

    rerender(table(view, { signal: peekSignal({ drawerId: 3, targetId: 1, turnSeq: 4, index: 0, seq: 5 }) }));
    expect(screen.getAllByTestId('my-card')[0]).toHaveAttribute('data-lifted', 'true');
  });

  it('섞기를 누르면 SHUFFLE을 보내고 1초 동안 잠근다', async () => {
    const send = vi.fn();
    render(table({ currentPlayerId: 2, targetId: 3, canShuffle: true }, { send }));
    const button = screen.getByRole('button', { name: '내 손패 섞기' });

    await userEvent.click(button);

    expect(send).toHaveBeenCalledWith({ type: 'SHUFFLE' });
    expect(button).toBeDisabled();
    await waitFor(() => expect(button).toBeEnabled(), { timeout: 1500 });
  });

  it('내가 뽑는 차례가 새로 오면 차례 소리를 한 번 낸다', () => {
    const play = vi.fn();
    const { rerender } = render(table({ currentPlayerId: 2, targetId: 3, turnSeq: 1 }, { play }));
    expect(play).not.toHaveBeenCalledWith('myTurn');

    rerender(table({ currentPlayerId: 1, targetId: 2, turnSeq: 2 }, { play }));
    rerender(table({ currentPlayerId: 1, targetId: 2, turnSeq: 2, discardCount: 2 }, { play }));

    expect(play.mock.calls.filter(([name]) => name === 'myTurn')).toHaveLength(1);
  });

  it('남의 차례에는 가운데 카드를 누를 수 없다', () => {
    render(table({ currentPlayerId: 2, targetId: 3 }));

    expect(screen.queryByRole('button', { name: /번째 카드$/ })).not.toBeInTheDocument();
  });
  it('상대가 바뀌면(장수가 같아도) 가운데 부채의 고르던 카드가 내려간다', async () => {
    const players = [
      { playerId: 1, cardCount: 2, rank: null, forfeited: false, openingDone: true },
      { playerId: 2, cardCount: 3, rank: null, forfeited: false, openingDone: true },
      { playerId: 3, cardCount: 3, rank: null, forfeited: false, openingDone: true },
    ];
    const { rerender } = render(table({ players, targetId: 2, turnSeq: 1 }));
    await userEvent.hover(screen.getByRole('button', { name: '밥님의 2번째 카드' }));
    expect(screen.getAllByTestId('target-card')[1]).toHaveAttribute('data-lifted', 'true');

    rerender(table({ players, targetId: 3, turnSeq: 2 }));

    expect(screen.getAllByTestId('target-card').some((card) => card.hasAttribute('data-lifted'))).toBe(false);
  });

  describe('짝 버리기', () => {
    const S7 = card('SPADES', 'SEVEN');
    const H7 = card('HEARTS', 'SEVEN');
    const D2 = card('DIAMONDS', 'TWO');
    const opening: Partial<OldMaidView> = {
      stage: 'OPENING_DISCARD', currentPlayerId: null, targetId: null, turnSeq: 0, peek: null, canDiscard: true, canShuffle: true,
      hand: [S7, D2, H7], deadline: 30000, serverNow: 0,
    };

    it('R36 처음 버리기: 같은 숫자 두 장째를 누르면 버튼 없이 바로 DISCARD를 보낸다', async () => {
      const send = vi.fn();
      render(table(opening, { send }));
      expect(screen.getByTestId('my-turn-ribbon')).toHaveTextContent('같은 숫자 두 장을 골라 버리세요');

      await userEvent.click(screen.getByRole('button', { name: '스페이드 7 고르기' }));
      expect(send).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole('button', { name: '하트 7 고르기' }));

      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith({ type: 'DISCARD', cardIds: [S7.id, H7.id] });
      expect(screen.getAllByTestId('my-card').some((one) => one.hasAttribute('data-selected'))).toBe(false);
      expect(screen.queryByTestId('discard-hint')).not.toBeInTheDocument();
    });

    it('R36 두 번째 장이 다른 숫자면 보내지 않고 새로 누른 카드만 고른 채 잠깐 안내한다', async () => {
      const send = vi.fn();
      render(table(opening, { send }));

      await userEvent.click(screen.getByRole('button', { name: '스페이드 7 고르기' }));
      await userEvent.click(screen.getByRole('button', { name: '다이아몬드 2 고르기' }));

      expect(send).not.toHaveBeenCalled();
      expect(screen.getByTestId('discard-hint')).toHaveTextContent('같은 숫자 두 장을 고르세요');
      expect(screen.getAllByTestId('my-card').map((one) => one.getAttribute('data-selected'))).toEqual([null, 'true', null]);
      await waitFor(() => expect(screen.queryByTestId('discard-hint')).not.toBeInTheDocument(), { timeout: 3000 });
    });

    it('R36 키보드(Enter·Space)와 터치로도 두 장을 고르면 바로 버린다', async () => {
      const send = vi.fn();
      const { unmount } = render(table(opening, { send }));
      screen.getByRole('button', { name: '스페이드 7 고르기' }).focus();
      await userEvent.keyboard('{Enter}');
      screen.getByRole('button', { name: '하트 7 고르기' }).focus();
      await userEvent.keyboard(' ');
      expect(send).toHaveBeenLastCalledWith({ type: 'DISCARD', cardIds: [S7.id, H7.id] });
      unmount();

      render(table(opening, { send }));
      await userEvent.pointer({ keys: '[TouchA]', target: screen.getByRole('button', { name: '하트 7 고르기' }) });
      await userEvent.pointer({ keys: '[TouchA]', target: screen.getByRole('button', { name: '스페이드 7 고르기' }) });
      expect(send).toHaveBeenLastCalledWith({ type: 'DISCARD', cardIds: [H7.id, S7.id] });
      expect(send).toHaveBeenCalledTimes(2);
    });

    it('R36 보낸 짝은 손패가 바뀌거나 오류가 오기 전까지 다시 보내지 않는다', async () => {
      const send = vi.fn();
      const at = (overrides: Partial<OldMaidView>, errorSeq = 0) => (
        <OldMaidTable view={oldMaidSession({ ...opening, ...overrides })} room={room} meId={1} log={[]} receivedAt={0} now={0} errorSeq={errorSeq}
          nicknameOf={nicknameOf} send={send} sendSignal={vi.fn()} signal={null} onCloseGameOver={vi.fn()} onReadyNext={vi.fn()} />
      );
      const pickPair = async () => {
        await userEvent.click(screen.getByRole('button', { name: '스페이드 7 고르기' }));
        await userEvent.click(screen.getByRole('button', { name: '하트 7 고르기' }));
      };
      const { rerender } = render(at({}));
      await pickPair();
      expect(screen.getAllByTestId('my-card').map((one) => one.getAttribute('data-lifted'))).toEqual(['true', null, 'true']);
      await pickPair();
      expect(send).toHaveBeenCalledTimes(1);

      rerender(at({}, 1));
      await pickPair();
      expect(send).toHaveBeenCalledTimes(2);
    });

    it('R39 자동으로 버리기를 누르면 DISCARD_ALL을 한 번 보내고 화면이 바뀌기 전까지 잠근다', async () => {
      const send = vi.fn();
      render(table(opening, { send }));
      const button = screen.getByRole('button', { name: '자동으로 버리기' });

      await userEvent.click(button);
      await userEvent.click(button);

      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith({ type: 'DISCARD_ALL' });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('data-no-click-sound');
    });

    it('R36 처음 버리기에 내 짝이 없으면 기다린다는 리본, 상대 자리에는 버리는 중·다 버림', () => {
      const players = [
        { playerId: 1, cardCount: 1, rank: null, forfeited: false, openingDone: true },
        { playerId: 2, cardCount: 9, rank: null, forfeited: false, openingDone: false },
        { playerId: 3, cardCount: 4, rank: null, forfeited: false, openingDone: true },
      ];
      render(table({ ...opening, canDiscard: false, hand: [D2], players }));

      expect(screen.queryByTestId('discard-all-button')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '하트 7 고르기' })).not.toBeInTheDocument();
      expect(screen.getByTestId('my-turn-ribbon')).toHaveTextContent('다 버렸어요 · 다른 사람을 기다리는 중');
      expect(screen.getByTestId('my-turn-ribbon')).not.toHaveTextContent('초');
      expect(screen.getByRole('group', { name: '밥, 카드 9장, 버리는 중' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: '캐롤, 카드 4장, 다 버림' })).toBeInTheDocument();
      expect(screen.queryByTestId('target-fan')).not.toBeInTheDocument();
    });

    it('R36 처음 버리기에 손을 다 비운 사람은 단계가 끝나 등수가 정해지기 전에도 다 버림', () => {
      const players = [
        { playerId: 1, cardCount: 1, rank: null, forfeited: false, openingDone: true },
        { playerId: 2, cardCount: 0, rank: null, forfeited: false, openingDone: false },
        { playerId: 3, cardCount: 4, rank: null, forfeited: true, openingDone: false },
      ];
      render(table({ ...opening, canDiscard: false, hand: [D2], players }));

      expect(screen.getByRole('group', { name: '밥, 카드 0장, 다 버림' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: '캐롤, 카드 4장, 기권' })).toBeInTheDocument();
    });

    it('R37·R39 짝 버리기 단계: 뽑은 짝이 빛나고 자동으로 버리기를 누르면 DISCARD_ALL을 보낸다. 가운데 부채는 누를 수 없다', async () => {
      const send = vi.fn();
      render(table({ stage: 'DISCARD', canDiscard: true, hand: [H7, D2, S7], deadline: 15000, serverNow: 0 }, { send }));

      expect(screen.getByTestId('my-turn-ribbon')).toHaveTextContent('짝을 버리세요');
      expect(screen.getAllByTestId('my-card').map((one) => one.getAttribute('data-glow'))).toEqual(['true', null, 'true']);
      expect(screen.queryByRole('button', { name: /번째 카드$/ })).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: '자동으로 버리기' }));

      expect(send).toHaveBeenCalledWith({ type: 'DISCARD_ALL' });
    });

    it('R37 짝 버리기 단계에 상대의 마지막 카드를 뽑았으면 가운데에 빈 부채를 그리지 않는다', () => {
      const players = [
        { playerId: 1, cardCount: 3, rank: null, forfeited: false, openingDone: true },
        { playerId: 2, cardCount: 0, rank: 1, forfeited: false, openingDone: true },
        { playerId: 3, cardCount: 2, rank: null, forfeited: false, openingDone: true },
      ];
      const { rerender } = render(table({ stage: 'DISCARD', canDiscard: true, hand: [H7, D2, S7], players }));

      expect(screen.queryByTestId('target-fan')).not.toBeInTheDocument();

      rerender(table({ stage: 'DISCARD', canDiscard: true, hand: [H7, D2, S7] }));
      expect(screen.getByTestId('target-fan')).toBeInTheDocument();
    });

    it('R37 남이 짝을 버리는 중이면 그 자리에 짝 버리는 중, 내 카드는 누를 수 없다', () => {
      render(table({ stage: 'DISCARD', currentPlayerId: 2, targetId: 3, canDiscard: false }));

      expect(screen.getByRole('group', { name: '밥, 카드 3장, 차례, 짝 버리는 중' })).toBeInTheDocument();
      expect(screen.queryByTestId('discard-all-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('target-tag')).not.toBeInTheDocument();
    });

    it('단계가 바뀌면 고른 카드를 처음부터', async () => {
      const { rerender } = render(table(opening));
      await userEvent.click(screen.getByRole('button', { name: '스페이드 7 고르기' }));
      expect(screen.getAllByTestId('my-card')[0]).toHaveAttribute('data-selected', 'true');

      rerender(table({ ...opening, stage: 'DISCARD', currentPlayerId: 1, targetId: 2, turnSeq: 1 }));

      expect(screen.getAllByTestId('my-card').some((one) => one.hasAttribute('data-selected'))).toBe(false);
    });
  });
});
