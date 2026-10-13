import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FruitStackView, GameSignal, Room } from '../../api/types';
import type { LogEntry } from '../../lib/eventLog';
import { SILENT_SOUND, SoundContext } from '../../lib/sound';
import { LANDSCAPE_PHONE_QUERY } from '../../lib/useTableLayout';
import { setMediaMatches } from '../../test/media';
import type { ViewTransition } from '../gameModule';
import { FRUIT_STARTED_AT, fruitPlayer, fruitSession, fruitView } from './fruitStackFixtures';
import { FruitStackTable } from './FruitStackTable';

vi.mock('../../realtime/RealtimeContext', () => ({ useRealtime: () => ({ connected: true, realtime: {} }) }));

const member = (id: number, host = false) => ({ id, nickname: `P${id}`, host, connected: true, offlineSeconds: 0, ready: false });
const room: Room = {
  code: 'ABCDEF', name: '방', gameType: 'FRUIT_STACK', gameTypeName: '과일 쌓기', status: 'PLAYING', hostId: 1, maxPlayers: 5,
  locked: false, spectators: [], theme: 'WOOD', members: [member(1, true), member(2), member(3), member(4), member(5)],
};

type Options = { game?: Partial<FruitStackView>; /** 전환(transition.to)과 같은 객체여야 할 때 화면을 그대로 넘긴다. */ full?: FruitStackView; meId?: number; transition?: ViewTransition<FruitStackView> | null; aside?: ReactElement; log?: LogEntry[] };

function renderTable(options: Options = {}) {
  const send = vi.fn();
  const sendSignal = vi.fn();
  const play = vi.fn();
  let listener: (signal: GameSignal) => void = () => {};
  const subscribe = (next: (signal: GameSignal) => void) => {
    listener = next;
    return () => { listener = () => {}; };
  };
  const tree = ({ game, full, meId = 1, transition = null, aside, log = [] }: Options) => (
    <SoundContext.Provider value={{ ...SILENT_SOUND, play }}>
      <FruitStackTable view={full ? { gameType: 'FRUIT_STACK', game: full } : fruitSession(game)} room={room} meId={meId} log={log} receivedAt={0} now={0} errorSeq={0} nicknameOf={(id) => `P${id}`}
        send={send} sendSignal={sendSignal} subscribeSignal={subscribe} onCloseGameOver={vi.fn()} onReadyNext={vi.fn()} transition={transition} aside={aside} />
    </SoundContext.Provider>
  );
  const view = render(tree(options));
  const receive = (board: string, playerId = 2) =>
    act(() => listener({ gameType: 'FRUIT_STACK', type: 'BOARD', startedAt: FRUIT_STARTED_AT, playerId, seq: 1, board }));
  return { send, sendSignal, play, receive, rerender: (next: Options) => view.rerender(tree({ ...options, ...next })) };
}

const table = () => screen.getByTestId('fruit-table');
const minis = () => screen.queryAllByTestId('mini-board');
const players = () => minis().map((board) => board.getAttribute('data-player'));
const pass = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const five = { participantIds: [1, 2, 3, 4, 5], players: [1, 2, 3, 4, 5].map((id) => fruitPlayer(id)) };
const OVER: Partial<FruitStackView> = {
  status: 'GAME_OVER', deadline: null, winnerId: 1, players: [fruitPlayer(1, 320, 'OUT'), fruitPlayer(2, 100, 'OUT')],
  result: { reason: 'ALL_OUT', standings: [
    { playerId: 1, score: 320, outcome: 'WIN', rank: 1, state: 'OUT' },
    { playerId: 2, score: 100, outcome: 'LOSE', rank: 2, state: 'OUT' },
  ] },
};

describe('FruitStackTable', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setMediaMatches(true);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('스크롤된 채로 게임이 시작되면 맨 위로 올린다(판은 맨 위 화면에 맞춰 놓인다)', () => {
    vi.stubGlobal('scrollY', 250);
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);

    renderTable();

    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    vi.unstubAllGlobals();
  });

  it('진행 기록은 어느 배치에서도 보이지 않는다(방이 남긴 기록이 있어도)', () => {
    const log: LogEntry[] = [{ id: 1, kind: 'leave', actorId: 3, text: 'P3님이 나갔어요', at: 0 }];
    const { rerender } = renderTable({ log });
    const absent = () => {
      expect(screen.queryByTestId('last-log')).toBeNull();
      expect(screen.queryByRole('button', { name: '진행 기록 보기' })).toBeNull();
      expect(table()).not.toHaveTextContent('나갔어요');
    };
    absent();
    setMediaMatches(false);
    rerender({ log });
    expect(table()).toHaveAttribute('data-layout', 'portrait');
    absent();
    setMediaMatches((query) => query === LANDSCAPE_PHONE_QUERY);
    rerender({ log });
    expect(table()).toHaveAttribute('data-layout', 'landscape');
    absent();
  });

  it('휴대폰에서는 게임 동안 화면을 가득 쓰고(html[data-game-focus]), PC와 결과 창에서는 쓰지 않는다', () => {
    const focus = () => document.documentElement.dataset.gameFocus;
    const { rerender } = renderTable();
    expect(focus()).toBeUndefined();
    expect(table()).not.toHaveClass('-mb-4');

    setMediaMatches(false);
    rerender({});
    expect(focus()).toBe('on');
    expect(table()).toHaveClass('-mb-4');

    setMediaMatches((query) => query === LANDSCAPE_PHONE_QUERY);
    rerender({});
    expect(focus()).toBe('on');

    rerender({ game: OVER });
    expect(screen.getByTestId('fruit-game-over')).toBeInTheDocument();
    expect(focus()).toBeUndefined();
  });

  it('PC: 내 판이 크게, 상대는 작은 판으로 보인다', () => {
    renderTable();

    expect(table()).toHaveAttribute('data-layout', 'pc');
    expect(table()).toHaveAttribute('data-mode', 'play');
    expect(screen.getAllByTestId('my-board')).toHaveLength(1);
    expect(screen.getByTestId('my-board')).toHaveStyle({ width: '400px', height: '600px' });
    expect(players()).toEqual(['2']);
    expect(minis()[0]).toHaveStyle({ width: '200px' });
    const hud = screen.getByTestId('fruit-hud');
    expect(hud).toHaveTextContent('점수');
    expect(hud).toHaveTextContent('다음');
    expect(hud).toHaveTextContent('남은 시간');
    expect(screen.getByText('끌어서 자리를 정하고 놓으면 떨어져요.')).toBeInTheDocument();
  });

  it('과일 순서표: 점수 띠의 버튼으로 열고, 판을 누르면 닫히며 판 크기는 그대로다', () => {
    renderTable();
    const size = { width: '400px', height: '600px' };

    fireEvent.click(within(screen.getByTestId('fruit-hud')).getByRole('button', { name: '과일 순서 보기' }));
    expect(screen.getByRole('dialog', { name: '과일 순서' })).toHaveTextContent('수박');
    expect(screen.getByTestId('my-board')).toHaveStyle(size);
    expect(screen.getByTestId('match-clock')).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByTestId('my-board'), { clientX: 100, pointerId: 1 });
    expect(screen.queryByRole('dialog', { name: '과일 순서' })).toBeNull();
    expect(screen.getByTestId('my-board')).toHaveStyle(size);
  });

  it('과일 순서 버튼은 관전자에게도 있다', () => {
    renderTable({ meId: 9 });

    expect(screen.getByTestId('fruit-hud')).toHaveTextContent('관전 중');
    expect(within(screen.getByTestId('fruit-hud')).getByRole('button', { name: '과일 순서 보기' })).toBeInTheDocument();
  });

  it('세로 배치', () => {
    setMediaMatches(false);
    renderTable();

    expect(table()).toHaveAttribute('data-layout', 'portrait');
    expect(screen.getByText('끌어서 놓으면 떨어져요')).toBeInTheDocument();
    expect(screen.getByTestId('my-board')).toHaveStyle({ width: '220px' });
    expect(minis()[0]).toHaveStyle({ width: '53px' });
  });

  it('가로 배치는 세로 점수 띠와 왼쪽 칸을 쓴다', () => {
    setMediaMatches((query) => query === LANDSCAPE_PHONE_QUERY);
    renderTable({ aside: <p>상태 바</p> });

    expect(table()).toHaveAttribute('data-layout', 'landscape');
    expect(screen.getByTestId('fruit-hud')).toHaveAttribute('data-vertical', 'true');
    expect(screen.getByTestId('table-aside')).toHaveTextContent('상태 바');
    expect(screen.getByTestId('my-board')).toHaveStyle({ width: '217px' });
    // 머리줄이 숨어 페이지 여백을 당겨 쓸 일이 없고, 감정 표현 버튼 자리는 점수 띠 아래다.
    expect(screen.getByTestId('landscape-table')).not.toHaveClass('-my-5');
    expect(screen.getByTestId('fruit-hud').parentElement).toContainElement(screen.getByTestId('emote-slot'));
  });

  it('상대 4명이면 작은 판이 4개다', () => {
    renderTable({ game: five });

    expect(players()).toEqual(['2', '3', '4', '5']);
    expect(minis()[0]).toHaveStyle({ width: '196px' });
  });

  it('내가 가운데 자리면 내 다음 사람부터 도는 순서다', () => {
    renderTable({ game: five, meId: 3 });

    expect(players()).toEqual(['4', '5', '1', '2']);
  });

  it('기권한 사람의 판은 그리지 않는다', () => {
    renderTable({ game: { participantIds: [1, 2, 3], players: [fruitPlayer(1), fruitPlayer(2), fruitPlayer(3, 40, 'FORFEITED')] } });

    expect(players()).toEqual(['2']);
  });

  it('관전자는 지켜보기 모드로 살아 있는 판을 크게 본다', () => {
    renderTable({ meId: 9 });

    expect(table()).toHaveAttribute('data-mode', 'watch');
    expect(screen.queryByTestId('my-board')).not.toBeInTheDocument();
    expect(players()).toEqual(['1', '2']);
    minis().forEach((board) => expect(board).toHaveAttribute('data-large', 'true'));
    expect(screen.getByTestId('fruit-hud')).toHaveTextContent('관전 중');
    expect(screen.getByText('모두 과일을 쌓는 중…')).toBeInTheDocument();
  });

  it('받은 판 신호가 없으면 불러오는 중, 받으면 사라진다', () => {
    vi.useFakeTimers();
    const { receive } = renderTable();
    expect(screen.getByText('불러오는 중…')).toBeInTheDocument();

    receive('WAAAAGAPqA');
    pass(300);

    expect(screen.queryByText('불러오는 중…')).not.toBeInTheDocument();
    expect(minis()[0]).not.toHaveAttribute('data-danger');
  });

  it('위험한 상대 판은 붉은 테두리다', () => {
    vi.useFakeTimers();
    const { receive } = renderTable();

    receive('WAIAA');
    pass(300);

    expect(minis()[0]).toHaveAttribute('data-danger', 'true');
  });

  it('R22 내 판 모습을 250ms마다 보낸다', () => {
    vi.useFakeTimers();
    const { sendSignal } = renderTable();

    pass(1000);

    expect(sendSignal).toHaveBeenCalledTimes(4);
    expect(sendSignal).toHaveBeenCalledWith({ type: 'BOARD', board: expect.stringMatching(/^[A-Za-z0-9_-]{5,}$/) });
  });

  it('관전자는 판 모습도 점수도 보내지 않는다', () => {
    vi.useFakeTimers();
    const { send, sendSignal } = renderTable({ meId: 9 });

    pass(2000);

    expect(sendSignal).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('내가 탈락하면 안내 뒤 지켜보기로 바뀐다', () => {
    vi.useFakeTimers();
    const { rerender } = renderTable();

    rerender({ game: { players: [fruitPlayer(1, 40, 'OUT'), fruitPlayer(2)] } });

    const notice = within(screen.getByTestId('my-board')).getByRole('status');
    expect(notice).toHaveTextContent('가득 찼어요!');
    expect(notice).toHaveTextContent('40점');
    expect(table()).toHaveAttribute('data-mode', 'play');

    pass(1500);
    expect(table()).toHaveAttribute('data-mode', 'watch');
    expect(screen.queryByTestId('my-board')).not.toBeInTheDocument();
    expect(players()).toEqual(['2', '1']);
    expect(minis()[0]).toHaveAttribute('data-large', 'true');
    expect(minis()[1]).not.toHaveAttribute('data-large');
    expect(minis()[1]).toHaveTextContent('탈락');
    expect(minis()[1]).toHaveTextContent('40점');
    expect(screen.getByTestId('fruit-hud')).not.toHaveTextContent('다음');
  });

  it('이미 탈락한 채로 들어오면(새로고침) 안내를 다시 보이지 않고 바로 지켜본다', () => {
    renderTable({ game: { players: [fruitPlayer(1, 40, 'OUT'), fruitPlayer(2)] } });

    expect(table()).toHaveAttribute('data-mode', 'watch');
    expect(screen.queryByTestId('my-board')).not.toBeInTheDocument();
    expect(players()).toEqual(['2', '1']);
  });

  it('R26 혼자 남으면 남은 점수를 알려 준다', () => {
    vi.useFakeTimers();
    const alone = { players: [fruitPlayer(1, 20), fruitPlayer(2, 50, 'OUT')] };
    const mine = renderTable({ game: alone });
    expect(screen.getByText('혼자 남았어요. 31점만 더 얻으면 이겨요.')).toBeInTheDocument();
    mine.rerender({ game: { status: 'GAME_OVER' } });

    renderTable({ game: alone, meId: 2 });
    pass(1500);
    expect(screen.getByText('P1님이 31점만 더 얻으면 이겨요.')).toBeInTheDocument();
  });

  it('떨어뜨리면 소리가 나고 점수는 보고하지 않는다', () => {
    const { play, send } = renderTable();
    const board = screen.getByTestId('my-board');

    fireEvent.pointerDown(board, { clientX: 200, pointerId: 1 });
    fireEvent.pointerUp(board, { clientX: 200, pointerId: 1 });

    expect(play).toHaveBeenCalledWith('place');
    expect(send).not.toHaveBeenCalled();
  });

  it('끝난 화면을 처음 받으면 바로 결과 창이다', async () => {
    renderTable({ game: OVER });

    await waitFor(() => expect(screen.getByTestId('fruit-game-over')).toBeVisible());
    expect(screen.queryByTestId('fruit-table')).not.toBeInTheDocument();
  });

  it('게임 중에 끝나면 "게임 끝!" 뒤에 결과 창이 열린다', () => {
    vi.useFakeTimers();
    const before = fruitView();
    const after = fruitView(OVER);
    const { rerender } = renderTable({ full: before });

    rerender({ full: after, transition: { seq: 2, from: before, to: after, animate: true } });
    expect(screen.queryByTestId('game-end-banner')).not.toBeInTheDocument();
    pass(450);
    expect(screen.getByTestId('game-end-banner')).toBeInTheDocument();
    expect(table()).toHaveAttribute('inert');
    pass(1800);

    expect(screen.getByTestId('fruit-game-over')).toBeInTheDocument();
    expect(screen.queryByTestId('fruit-table')).not.toBeInTheDocument();
  });

  it('상대가 나가 끝나면 배너 없이 결과 창이다', () => {
    vi.useFakeTimers();
    const before = fruitView();
    const after = fruitView({ ...OVER, players: [fruitPlayer(1, 0), fruitPlayer(2, 0, 'FORFEITED')], result: { reason: 'FORFEIT', standings: [
      { playerId: 1, score: 0, outcome: 'WIN', rank: 1, state: 'PLAYING' },
      { playerId: 2, score: 0, outcome: 'LOSE', rank: 2, state: 'FORFEITED' },
    ] } });
    const { rerender } = renderTable({ full: before });

    rerender({ full: after, transition: { seq: 2, from: before, to: after, animate: true } });

    expect(screen.getByTestId('fruit-game-over')).toBeInTheDocument();
    expect(screen.queryByTestId('game-end-banner')).not.toBeInTheDocument();
  });
});
