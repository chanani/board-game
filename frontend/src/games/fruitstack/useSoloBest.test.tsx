import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MemberStats } from '../../api/types';
import { useSoloBest } from './useSoloBest';

const stats = (best: number | null | undefined): MemberStats => ({
  memberId: 1, nickname: 'P1', stats: [
    { gameType: 'UNO', gameTypeName: '우노', matches: 0, wins: 0, draws: 0, losses: 0, winRate: null, rounds: 0, roundWins: 0, roundDraws: 0, roundLosses: 0, roundWinRate: null, averageRoundScore: null },
    { gameType: 'FRUIT_STACK', gameTypeName: '수박게임', matches: 0, wins: 0, draws: 0, losses: 0, winRate: null, rounds: 0, roundWins: 0, roundDraws: 0, roundLosses: 0, roundWinRate: null, averageRoundScore: null, bestSoloScore: best },
  ],
});

const flush = () => act(async () => { await Promise.resolve(); });

describe('useSoloBest', () => {
  it('혼자 하는 게임이 열리면 내 최고 점수를 한 번 불러오고, 게임 중에 불러온 값은 이번 판이 들어가기 전 값이다', async () => {
    const load = vi.fn().mockResolvedValue(stats(420));
    const { result, rerender } = renderHook((props) => useSoloBest(props), { initialProps: { active: true, startedAt: 1, inProgress: true, load } });
    expect(result.current).toBeNull();

    await flush();
    expect(result.current).toEqual({ previous: 420, fresh: true });

    rerender({ active: true, startedAt: 1, inProgress: false, load });
    await flush();
    expect(load).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual({ previous: 420, fresh: true });
  });

  it('처음 혼자 하면 이전 최고 점수가 없다', async () => {
    const load = vi.fn().mockResolvedValue(stats(null));
    const { result } = renderHook(() => useSoloBest({ active: true, startedAt: 1, inProgress: true, load }));

    await flush();
    expect(result.current).toEqual({ previous: null, fresh: true });
  });

  it('끝난 화면에서 처음 불러오면 fresh가 아니다(새로고침)', async () => {
    const load = vi.fn().mockResolvedValue(stats(300));
    const { result } = renderHook(() => useSoloBest({ active: true, startedAt: 1, inProgress: false, load }));

    await flush();
    expect(result.current).toEqual({ previous: 300, fresh: false });
  });

  it('새 게임(startedAt이 바뀜)이면 다시 불러온다', async () => {
    const load = vi.fn().mockResolvedValueOnce(stats(100)).mockResolvedValueOnce(stats(250));
    const { result, rerender } = renderHook((props) => useSoloBest(props), { initialProps: { active: true, startedAt: 1, inProgress: true, load } });
    await flush();

    rerender({ active: true, startedAt: 2, inProgress: true, load });
    expect(result.current).toBeNull();
    await flush();

    expect(load).toHaveBeenCalledTimes(2);
    expect(result.current).toEqual({ previous: 250, fresh: true });
  });

  it('대결·관전이면 부르지 않고, 불러오기에 실패하면 모르는 채로 둔다', async () => {
    const load = vi.fn().mockRejectedValue(new Error('net'));
    const inactive = renderHook(() => useSoloBest({ active: false, startedAt: 1, inProgress: true, load }));
    await flush();
    expect(load).not.toHaveBeenCalled();
    expect(inactive.result.current).toBeNull();

    const failed = renderHook(() => useSoloBest({ active: true, startedAt: 1, inProgress: true, load }));
    await flush();
    expect(failed.result.current).toBeNull();
  });
});
