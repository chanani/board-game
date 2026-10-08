import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LogEntry } from '../../lib/eventLog';
import type { BoardView, PaperSafariSessionView, PaperSafariView, Room, SlotView } from '../../api/types';
import { SILENT_SOUND, SoundContext } from '../../lib/sound';
import type { ViewTransition } from '../../room/useRoomChannel';
import { BANNER_MS } from '../../table/useFinalePhase';
import { PaperSafariTable } from './PaperSafariTable';

const motionState = vi.hoisted(() => ({ reduced: false }));
vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>();
  return { ...actual, useReducedMotion: () => motionState.reduced };
});

const ME = 1;
const OPPONENT = 2;

const room: Room = {
  code: 'ABC123', name: '테스트 방', gameType: 'PAPER_SAFARI', gameTypeName: '페이퍼 사파리', status: 'PLAYING',
  hostId: ME, maxPlayers: 4, locked: false, spectators: [], theme: 'WOOD',
  members: [
    { id: ME, nickname: '앨리스', host: true, connected: true, offlineSeconds: 0, ready: false },
    { id: OPPONENT, nickname: '밥', host: false, connected: true, offlineSeconds: 0, ready: false },
  ],
};

function slots(faceUp: boolean): SlotView[] {
  return [0, 1, 2].flatMap((column) => [0, 1].map((row) => ({
    column, row, faceUp, known: false, card: faceUp ? { kind: 'NUMBER' as const, value: column + row * 3 + 1 } : null,
  })));
}

function boards(faceUp: boolean): BoardView[] {
  return [{ playerId: ME, slots: slots(faceUp) }, { playerId: OPPONENT, slots: slots(faceUp) }];
}

const playing: PaperSafariView = {
  viewerId: ME, status: 'IN_ROUND', roundNumber: 1, lastRoundResult: null, winnerId: null,
  round: { phase: 'DRAW', currentPlayerId: OPPONENT, deckSize: 40, discardTop: { kind: 'NUMBER', value: 4 }, held: null, boards: boards(false) },
};

const result = { players: [{ playerId: ME, score: 21, outcome: 'LOSE' as const }, { playerId: OPPONENT, score: 3, outcome: 'WIN' as const }] };

function over(lastRoundResult: PaperSafariView['lastRoundResult'] = result): PaperSafariView {
  return {
    ...playing, status: 'GAME_OVER', winnerId: OPPONENT, lastRoundResult,
    round: { ...playing.round, phase: 'ROUND_OVER', boards: boards(true) },
  };
}

const nicknameOf = (memberId: number) => room.members.find((member) => member.id === memberId)?.nickname ?? '떠난 플레이어';
const play = vi.fn();

function ui(game: PaperSafariView, transition: ViewTransition | null = null, log: LogEntry[] = []) {
  const view: PaperSafariSessionView = { game };
  return (
    <SoundContext.Provider value={{ ...SILENT_SOUND, play }}>
      <PaperSafariTable view={view} room={room} meId={ME} log={log} receivedAt={0} now={0} errorSeq={0} nicknameOf={nicknameOf}
        send={vi.fn()} onCloseGameOver={vi.fn()} onReadyNext={vi.fn()} transition={transition} />
    </SoundContext.Provider>
  );
}

const banner = () => screen.queryByText('게임 끝!');
const resultDialog = () => screen.queryByRole('dialog', { name: '게임 결과' });
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

describe('게임 종료 연출', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    motionState.reduced = false;
    play.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('게임 중에 끝나면 뒷면 카드를 차례로 뒤집고, "게임 끝!" 배너를 보인 뒤 결과 창을 연다', () => {
    const { rerender } = render(ui(playing));
    const ended = over();
    rerender(ui(ended));

    expect(resultDialog()).not.toBeInTheDocument();
    expect(banner()).not.toBeInTheDocument();
    expect(screen.getByTestId('turn-bar').closest('[inert]')).not.toBeNull();
    expect(document.querySelectorAll('[data-testid="slot"] [data-side="front"]').length).toBeLessThan(12);

    advance(1200);
    expect(document.querySelectorAll('[data-testid="slot"] [data-side="front"]')).toHaveLength(12);
    expect(banner()?.closest('[role="status"]')).not.toBeNull();
    expect(screen.getByText('점수를 계산하고 있어요')).toBeInTheDocument();
    expect(resultDialog()).not.toBeInTheDocument();
    expect(play.mock.calls.filter(([name]) => name === 'flip').length).toBeGreaterThan(0);

    advance(BANNER_MS);
    expect(banner()).not.toBeInTheDocument();
    expect(resultDialog()).toBeInTheDocument();
  });

  it('처음부터 끝난 게임으로 열면(새로고침·늦은 입장) 연출 없이 결과 창을 바로 연다', () => {
    render(ui(over()));

    expect(banner()).not.toBeInTheDocument();
    expect(resultDialog()).toBeInTheDocument();
  });

  it('게임 중 상태에서 끝난 상태로 넘어오는 전환과 함께 새로 열려도 연출한다', () => {
    const ended = over();
    render(ui(ended, { seq: 3, from: playing, to: ended, animate: true }));

    expect(resultDialog()).not.toBeInTheDocument();
    advance(1200);
    expect(banner()).toBeInTheDocument();
    advance(BANNER_MS);
    expect(resultDialog()).toBeInTheDocument();
  });

  it('동작 줄이기면 연출 없이 결과 창을 바로 연다', () => {
    motionState.reduced = true;
    const { rerender } = render(ui(playing));
    rerender(ui(over()));

    expect(banner()).not.toBeInTheDocument();
    expect(resultDialog()).toBeInTheDocument();
  });

  it('상대가 나가서(라운드 결과 없음) 끝나면 결과 창을 바로 연다', () => {
    const { rerender } = render(ui(playing));
    rerender(ui(over(null)));

    expect(banner()).not.toBeInTheDocument();
    expect(resultDialog()).toBeInTheDocument();
  });

  it('같은 게임에서 여러 번 다시 그려도 배너는 한 번만 나온다', () => {
    const { rerender } = render(ui(playing));
    rerender(ui(over()));
    advance(1200 + BANNER_MS);
    expect(resultDialog()).toBeInTheDocument();

    rerender(ui(over()));
    rerender(ui(over()));
    expect(banner()).not.toBeInTheDocument();
    expect(resultDialog()).toBeInTheDocument();
  });
  it('뒷면 카드가 많아도 뒤집는 소리는 0.1초에 한 번까지만 낸다', () => {
    const many = [1, 2, 3, 4, 5].map((playerId) => ({ playerId, slots: slots(false) }));
    const crowded: PaperSafariView = { ...playing, round: { ...playing.round, boards: many } };
    const { rerender } = render(ui(crowded));
    const ended = over();
    rerender(ui({ ...ended, round: { ...ended.round, boards: many.map((board) => ({ ...board, slots: slots(true) })) } }));

    advance(1200);
    const flips = play.mock.calls.filter(([name]) => name === 'flip').length;
    expect(flips).toBeGreaterThan(0);
    expect(flips).toBeLessThanOrEqual(13);
  });

  it('마지막으로 뒷면 칸에 내려놓은 카드는 다시 뒤집지 않는다', () => {
    const mine = slots(true).map((slot) => (slot.column === 0 && slot.row === 0 ? { ...slot, faceUp: false, card: null } : slot));
    const placing: PaperSafariView = {
      ...playing,
      round: {
        ...playing.round, phase: 'PLACE', currentPlayerId: ME, held: { playerId: ME, source: 'DECK', card: { kind: 'NUMBER', value: 9 } },
        boards: [{ playerId: ME, slots: mine }, { playerId: OPPONENT, slots: slots(true) }],
      },
    };
    const ended = over();
    const placed = slots(true).map((slot) => (slot.column === 0 && slot.row === 0 ? { ...slot, card: { kind: 'NUMBER' as const, value: 9 } } : slot));
    const { rerender } = render(ui(placing));
    rerender(ui({ ...ended, round: { ...ended.round, boards: [{ playerId: ME, slots: placed }, { playerId: OPPONENT, slots: slots(true) }] } }));

    expect(document.querySelectorAll('[data-testid="slot"] [data-side="front"]')).toHaveLength(12);
    advance(1200);
    expect(play.mock.calls.filter(([name]) => name === 'flip')).toHaveLength(0);
  });

  it('진행 기록 창을 열어 둔 채 게임이 끝나면 창을 닫는다', async () => {
    vi.useRealTimers();
    const log: LogEntry[] = [{ id: 1, at: 0, kind: 'place', actorId: OPPONENT, text: '밥이 카드를 놓았어요' }];
    const { rerender } = render(ui(playing, null, log));
    fireEvent.click(screen.getByRole('button', { name: '진행 기록 보기' }));
    expect(screen.getByRole('dialog', { name: '진행 기록' })).toBeInTheDocument();

    rerender(ui(over(), null, log));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '진행 기록' })).not.toBeInTheDocument());
  });
});

describe('게임 끝 소리', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    motionState.reduced = false;
    play.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const cues = () => play.mock.calls.filter(([name]) => name === 'gameOverWin' || name === 'gameOverEnd');

  it('게임 중 → 끝 전환이면 결과 창에서 카드 공개가 끝날 때 한 번만 울리고, 라운드 소리는 내지 않는다', () => {
    const { rerender } = render(ui(playing));
    const ended = over();
    const transition = { seq: 2, from: playing, to: ended, animate: true };
    rerender(ui(ended, transition));

    advance(1200 + BANNER_MS);
    expect(resultDialog()).toBeInTheDocument();
    expect(cues()).toHaveLength(0);
    for (let step = 0; step < 12; step += 1) {
      advance(120);
    }
    // 나(앨리스)는 졌으므로 부드러운 소리.
    expect(cues()).toEqual([['gameOverEnd']]);

    rerender(ui(ended, transition));
    advance(3000);
    expect(cues()).toHaveLength(1);
    expect(play).not.toHaveBeenCalledWith('roundWin');
    expect(play).not.toHaveBeenCalledWith('roundLose');
  });

  it('이미 끝난 게임을 불러오거나(직전 화면 없음) 동기화로 받으면 울리지 않는다', () => {
    const ended = over();
    const revealAll = () => {
      for (let step = 0; step < 20; step += 1) {
        advance(120);
      }
    };
    const loaded = render(ui(ended, { seq: 1, from: null, to: ended, animate: true }));
    revealAll();
    expect(screen.getAllByTestId('score-value')[0]).toHaveTextContent('점');
    loaded.unmount();
    render(ui(ended, { seq: 1, from: playing, to: ended, animate: false }));
    revealAll();

    expect(resultDialog()).toBeInTheDocument();
    expect(cues()).toHaveLength(0);
  });

  it('상대가 나가 기권으로 끝나도 결과 창이 열리면 바로 한 번 울린다', () => {
    const { rerender } = render(ui(playing));
    const forfeited = { ...over(null), winnerId: ME };
    rerender(ui(forfeited, { seq: 2, from: playing, to: forfeited, animate: true }));

    expect(resultDialog()).toBeInTheDocument();
    expect(cues()).toEqual([['gameOverWin']]);
  });
});
