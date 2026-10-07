import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameSignal, OldMaidView, Room } from '../../api/types';
import { SILENT_SOUND, SoundContext, type SoundName } from '../../lib/sound';
import { setMediaMatches } from '../../test/media';
import { OldMaidTable } from './OldMaidTable';
import { oldMaidSession, peekSignal } from './oldMaidFixtures';

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
});
