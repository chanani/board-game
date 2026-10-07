import { useEffect, useState } from 'react';
import { messageOf } from '../api/http';
import { recordsApi } from '../api/records';
import type { GameStat, MemberStats } from '../api/types';
import { MemberAvatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { GAME_ORDER, findGame } from '../games/registry';
import { percent } from '../lib/format';

/** 모달에 띄울 사람. 그림·닉네임은 전적이 오기 전에도 바로 보이게 방 정보에서 받는다. */
export type StatsTarget = { id: number; nickname: string; avatar?: string };

type Props = { target: StatsTarget | null; onClose: () => void };

type Line = { key: string; name: string; matches: number; wins: number; winRate: number | null };

/** 등록된 게임 순서대로 한 줄씩, 끝에 전체 합계. */
export function statLines(stats: GameStat[]): { games: Line[]; total: Line } {
  const games = GAME_ORDER.flatMap((type) => {
    const game = findGame(type);
    if (!game) {
      return [];
    }
    const stat = stats.find((candidate) => candidate.gameType === type);
    const matches = stat?.matches ?? 0;
    const wins = stat?.wins ?? 0;
    return [{ key: type, name: game.name, matches, wins, winRate: matches === 0 ? null : wins / matches }];
  });
  const matches = games.reduce((sum, line) => sum + line.matches, 0);
  const wins = games.reduce((sum, line) => sum + line.wins, 0);
  return { games, total: { key: 'TOTAL', name: '전체', matches, wins, winRate: matches === 0 ? null : wins / matches } };
}

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'done'; stats: MemberStats };

function useMemberStats(memberId: number | null): State {
  const [state, setState] = useState<State>({ status: 'loading' });
  useEffect(() => {
    if (memberId === null) {
      return undefined;
    }
    let cancelled = false;
    setState({ status: 'loading' });
    recordsApi.member(memberId)
      .then((stats) => { if (!cancelled) setState({ status: 'done', stats }); })
      .catch((error) => { if (!cancelled) setState({ status: 'error', message: messageOf(error) }); });
    return () => {
      cancelled = true;
    };
  }, [memberId]);
  return state;
}

/** 대기실에서 다른 사람을 누르면 뜨는 승률 정보. 배경·Esc·닫기 버튼으로 닫는다(Modal 공통 동작). */
export function MemberStatsModal({ target, onClose }: Props) {
  const state = useMemberStats(target?.id ?? null);
  return (
    <Modal open={target !== null} title={target ? `${target.nickname}님 전적` : '전적'} onClose={onClose}>
      {target ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 pr-8">
            <MemberAvatar memberId={target.id} avatar={target.avatar} size={56} />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black text-wood-800">{target.nickname}</h2>
              <p className="text-xs text-stone-500">게임별 승률</p>
            </div>
          </div>
          <StatsBody state={state} />
        </div>
      ) : null}
    </Modal>
  );
}

function StatsBody({ state }: { state: State }) {
  if (state.status === 'loading') {
    return <p className="py-6 text-center text-sm text-stone-500">전적을 불러오는 중…</p>;
  }
  if (state.status === 'error') {
    return <p role="alert" className="py-6 text-center text-sm font-bold text-red-700">{state.message}</p>;
  }
  const { games, total } = statLines(state.stats.stats);
  if (total.matches === 0) {
    return <p data-testid="no-records" className="rounded-xl bg-cream-200/60 py-6 text-center text-sm font-bold text-wood-700">아직 기록이 없어요</p>;
  }
  return (
    <table className="w-full text-sm text-wood-800">
      <thead>
        <tr className="text-xs text-stone-500">
          <th scope="col" className="py-1.5 text-left font-semibold">게임</th>
          <th scope="col" className="py-1.5 text-right font-semibold">판 수</th>
          <th scope="col" className="py-1.5 text-right font-semibold">승</th>
          <th scope="col" className="py-1.5 text-right font-semibold">승률</th>
        </tr>
      </thead>
      <tbody>
        {games.map((line) => <StatRow key={line.key} line={line} />)}
      </tbody>
      <tfoot>
        <StatRow line={total} strong />
      </tfoot>
    </table>
  );
}

function StatRow({ line, strong = false }: { line: Line; strong?: boolean }) {
  return (
    <tr data-testid={`stat-${line.key}`} className={strong ? 'border-t-2 border-wood-700/20 font-black' : 'border-t border-wood-700/10'}>
      <th scope="row" className="py-2 text-left font-bold">{line.name}</th>
      <td className="py-2 text-right tabular-nums">{line.matches}판</td>
      <td className="py-2 text-right tabular-nums">{line.wins}승</td>
      <td className="py-2 text-right font-bold tabular-nums">{percent(line.winRate)}</td>
    </tr>
  );
}
