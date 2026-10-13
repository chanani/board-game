import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameSignal } from '../../api/types';
import type { BoardFrame } from './engine/constants';
import { encodeBoard } from './engine/snapshot';
import { FRUIT_STARTED_AT } from './fruitStackFixtures';
import { useBoardSignals } from './useBoardSignals';

const motion = vi.hoisted(() => ({ reduced: false }));
vi.mock('motion/react', async (original) => ({ ...(await original<typeof import('motion/react')>()), useReducedMotion: () => motion.reduced }));

const FRAME: BoardFrame = { held: 5, aimX: 180, danger: false, fruits: [{ level: 1, x: 180, y: 529, angle: 0 }] };
const at = (x: number) => encodeBoard({ ...FRAME, fruits: [{ level: 1, x, y: 529, angle: 0 }] });

let clock = FRUIT_STARTED_AT;
const now = () => clock;
const advance = (ms: number) => act(() => {
  clock += ms;
  vi.advanceTimersByTime(ms);
});

type Props = { out: boolean; active: boolean; startedAt: number; getFrame: () => BoardFrame | null };

function open(overrides: Partial<Props> = {}) {
  const sendSignal = vi.fn();
  let listener: (signal: GameSignal) => void = () => {};
  const subscribeSignal = (next: (signal: GameSignal) => void) => {
    listener = next;
    return () => { listener = () => {}; };
  };
  const hook = renderHook(
    (props: Props) => useBoardSignals({ sendSignal, subscribeSignal, meId: 1, now, ...props }),
    { initialProps: { out: false, active: true, startedAt: FRUIT_STARTED_AT, getFrame: () => FRAME, ...overrides } },
  );
  const receive = (signal: Partial<Extract<GameSignal, { gameType: 'FRUIT_STACK' }>>) =>
    act(() => listener({ gameType: 'FRUIT_STACK', type: 'BOARD', startedAt: FRUIT_STARTED_AT, playerId: 2, seq: 1, board: 'WAAAAGAPqA', ...signal }));
  return { ...hook, sendSignal, receive, raw: (signal: GameSignal) => act(() => listener(signal)) };
}

describe('useBoardSignals', () => {
  beforeEach(() => {
    clock = FRUIT_STARTED_AT;
    motion.reduced = false;
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('R22 살아 있는 동안 250ms마다 내 판을 보낸다', () => {
    const { sendSignal } = open();

    advance(1000);

    expect(sendSignal).toHaveBeenCalledTimes(4);
    expect(sendSignal).toHaveBeenCalledWith({ type: 'BOARD', board: 'WAAAAGAPqA' });
  });

  it('R22 탈락하면 바로 한 번, 그 뒤로는 2초마다 보낸다', () => {
    const { sendSignal, rerender } = open();
    advance(500);
    sendSignal.mockClear();

    rerender({ out: true, active: true, startedAt: FRUIT_STARTED_AT, getFrame: () => FRAME });
    expect(sendSignal).toHaveBeenCalledTimes(1);
    advance(4000);

    expect(sendSignal).toHaveBeenCalledTimes(3);
  });

  it('활성이 아니거나 내 판이 없으면 보내지 않는다', () => {
    const inactive = open({ active: false });
    const boardless = open({ getFrame: () => null });

    advance(1000);

    expect(inactive.sendSignal).not.toHaveBeenCalled();
    expect(boardless.sendSignal).not.toHaveBeenCalled();
  });

  it('R25 남의 판을 받아 돌려준다', () => {
    const { result, receive } = open();

    receive({});

    expect(result.current.frameOf(2)).toMatchObject({ held: 5, danger: false });
    expect(result.current.frameOf(2)?.fruits).toHaveLength(1);
    expect(result.current.frameOf(3)).toBeNull();
  });

  it('R25 내 신호·다른 경기의 신호·깨진 판·다른 게임의 신호는 버린다', () => {
    const { result, receive, raw } = open();

    receive({ playerId: 1 });
    receive({ playerId: 2, startedAt: FRUIT_STARTED_AT + 1 });
    receive({ playerId: 3, board: 'bad' });
    raw({ gameType: 'OLD_MAID', type: 'PEEK', startedAt: FRUIT_STARTED_AT, turnSeq: 1, drawerId: 4, targetId: 2, index: 0, seq: 1 });

    [1, 2, 3, 4].forEach((playerId) => expect(result.current.frameOf(playerId)).toBeNull());
  });

  it('R25 두 판 사이를 250ms 동안 보간한다', () => {
    const { result, receive } = open();
    receive({ board: at(100) });
    clock += 250;
    receive({ board: at(140), seq: 2 });

    clock += 125;
    expect(Math.abs((result.current.frameOf(2)?.fruits[0].x ?? 0) - 120)).toBeLessThan(1);
    clock += 125;
    expect(Math.abs((result.current.frameOf(2)?.fruits[0].x ?? 0) - 140)).toBeLessThan(1);
  });

  it('동작 줄이기면 보간하지 않는다', () => {
    motion.reduced = true;
    const { result, receive } = open();
    receive({ board: at(100) });
    clock += 250;

    receive({ board: at(140), seq: 2 });

    expect(Math.abs((result.current.frameOf(2)?.fruits[0].x ?? 0) - 140)).toBeLessThan(1);
  });

  it('경기가 바뀌면 받은 판을 지운다', () => {
    const { result, receive, rerender } = open();
    receive({});

    rerender({ out: false, active: true, startedAt: FRUIT_STARTED_AT + 1000, getFrame: () => FRAME });

    expect(result.current.frameOf(2)).toBeNull();
  });
});
