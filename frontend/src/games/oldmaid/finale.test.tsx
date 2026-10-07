import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OldMaidView, Room } from '../../api/types';
import { SILENT_SOUND, SoundContext } from '../../lib/sound';
import { setMediaMatches } from '../../test/media';
import { BANNER_MS, FINALE_DELAY_MS } from '../../table/useFinalePhase';
import { OldMaidTable } from './OldMaidTable';
import { oldMaidEvent, oldMaidView } from './oldMaidFixtures';

const room: Room = {
  code: 'OLDMAD', name: '방', gameType: 'OLD_MAID', gameTypeName: '도둑잡기', status: 'PLAYING', hostId: 1, maxPlayers: 6,
  locked: false, spectators: [], theme: 'WOOD',
  members: [
    { id: 1, nickname: '앨리스', host: true, connected: true, offlineSeconds: 0, ready: false },
    { id: 2, nickname: '밥', host: false, connected: true, offlineSeconds: 0, ready: false },
  ],
};
const nicknameOf = (id: number) => room.members.find((member) => member.id === id)?.nickname ?? '떠난 플레이어';
const playing = oldMaidView({ participantIds: [1, 2], players: [
  { playerId: 1, cardCount: 1, rank: null, forfeited: false },
  { playerId: 2, cardCount: 2, rank: null, forfeited: false },
], events: [oldMaidEvent(5, 'SHUFFLE', { actorId: 2 })] });

function ended(reason: 'NORMAL' | 'FORFEIT'): OldMaidView {
  return oldMaidView({
    status: 'GAME_OVER', currentPlayerId: null, targetId: null, peek: null, winnerId: 1, hand: [],
    players: [{ playerId: 1, cardCount: 0, rank: 1, forfeited: false }, { playerId: 2, cardCount: 1, rank: 2, forfeited: reason === 'FORFEIT' }],
    result: { reason, thiefId: reason === 'NORMAL' ? 2 : null, ranking: [
      { playerId: 1, rank: 1, placement: reason === 'NORMAL' ? 'FINISHED' : 'LAST_STANDING' },
      { playerId: 2, rank: 2, placement: reason === 'NORMAL' ? 'THIEF' : 'FORFEITED' },
    ] },
    events: [oldMaidEvent(6, 'DRAW', { actorId: 1, targetId: 2 }), oldMaidEvent(7, 'GAME_END', { actorId: 2, count: 2, reason })],
  });
}

function table(game: OldMaidView, play = vi.fn()) {
  return (
    <SoundContext.Provider value={{ ...SILENT_SOUND, play }}>
      <OldMaidTable view={{ gameType: 'OLD_MAID', game }} room={room} meId={1} log={[]} receivedAt={0} now={0} errorSeq={0}
        nicknameOf={nicknameOf} send={vi.fn()} sendSignal={vi.fn()} signal={null} onCloseGameOver={vi.fn()} onReadyNext={vi.fn()}
        transition={{ seq: 2, from: playing, to: game, animate: true }} />
    </SoundContext.Provider>
  );
}

beforeEach(() => setMediaMatches(true));
afterEach(() => vi.useRealTimers());

describe('도둑잡기 게임 끝 연출', () => {
  it('마지막 카드가 날아간 뒤 "게임 끝!" 배너와 게임 끝 소리, 그다음 결과 창', () => {
    vi.useFakeTimers();
    const play = vi.fn();
    render(table(ended('NORMAL'), play));
    expect(screen.queryByTestId('game-end-banner')).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(FINALE_DELAY_MS));
    expect(screen.getByTestId('game-end-banner')).toBeInTheDocument();
    expect(play).toHaveBeenCalledWith('gameOverWin');

    act(() => vi.advanceTimersByTime(BANNER_MS));
    expect(screen.getByText('내가 1등이에요!')).toBeInTheDocument();
    expect(play.mock.calls.filter(([name]) => name === 'gameOverWin')).toHaveLength(1);
  });

  it('기권으로 끝나면 연출 없이 바로 결과 창', () => {
    render(table(ended('FORFEIT')));

    expect(screen.getByText('모두 나가서 게임이 끝났어요')).toBeInTheDocument();
  });
  it('이미 끝난 게임을 불러오면(다시 들어옴) 게임 끝 소리 없이 결과 창만', () => {
    const play = vi.fn();
    render(
      <SoundContext.Provider value={{ ...SILENT_SOUND, play }}>
        <OldMaidTable view={{ gameType: 'OLD_MAID', game: ended('NORMAL') }} room={room} meId={1} log={[]} receivedAt={0} now={0} errorSeq={0}
          nicknameOf={nicknameOf} send={vi.fn()} sendSignal={vi.fn()} signal={null} onCloseGameOver={vi.fn()} onReadyNext={vi.fn()} transition={null} />
      </SoundContext.Provider>,
    );

    expect(screen.getByText('내가 1등이에요!')).toBeInTheDocument();
    expect(play).not.toHaveBeenCalledWith('gameOverWin');
    expect(play).not.toHaveBeenCalledWith('gameOverEnd');
  });
});
