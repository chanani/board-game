import { useEffect, useState } from 'react';
import { messageOf } from '../api/http';
import { recordsApi } from '../api/records';
import type { GameStat, MemberStats } from '../api/types';
import { MemberAvatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { FriendAction, FriendRemoveConfirmModal } from '../friends/FriendAction';
import { GAME_ORDER, findGame } from '../games/registry';
import { percent, playsSolo, points } from '../lib/format';

/** 모달에 띄울 사람. 그림·닉네임은 전적이 오기 전에도 바로 보이게 방 정보에서 받는다. */
export type StatsTarget = { id: number; nickname: string; avatar?: string };

type Props = { target: StatsTarget | null; onClose: () => void };

type Line = { key: string; name: string; matches: number; wins: number; winRate: number | null };

type SoloBest = { key: string; name: string; score: number };

/** 혼자 한 게임의 최고 점수(혼자 할 수 있는 게임만, 혼자 한 적이 있을 때만). 등록된 게임 순서. */
export function soloBests(stats: GameStat[]): SoloBest[] {
  return GAME_ORDER.flatMap((type) => {
    const game = findGame(type);
    const best = stats.find((candidate) => candidate.gameType === type)?.bestSoloScore;
    if (!game || !playsSolo(game.minPlayers) || best === null || best === undefined) {
      return [];
    }
    return [{ key: type, name: game.name, score: best }];
  });
}

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

/**
 * 다른 사람(대기실 자리·관전자, 친구 목록의 친구)을 누르면 뜨는 승률 정보. 배경·Esc·닫기 버튼으로 닫는다(Modal 공통 동작).
 * 아래에는 그 사람과의 사이에 맞는 친구 버튼(친구 추가 / 요청 보냄 / 친구 삭제)이 붙고, 삭제는 한 번 더 묻는다.
 */
export function MemberStatsModal({ target, onClose }: Props) {
  const state = useMemberStats(target?.id ?? null);
  const [confirming, setConfirming] = useState(false);
  const removing = confirming && target !== null;
  const closeAll = () => {
    setConfirming(false);
    onClose();
  };
  return (
    <>
      {/* 삭제를 묻는 동안에는 뒤에 깔린 전적 창이 Esc·배경 누르기에 같이 닫히지 않게 한다. */}
      <Modal open={target !== null} title={target ? `${target.nickname}님 전적` : '전적'} onClose={removing ? undefined : closeAll}>
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
            <FriendAction target={target} onAskRemove={() => setConfirming(true)} />
          </div>
        ) : null}
      </Modal>
      <FriendRemoveConfirmModal target={removing ? target : null} onCancel={() => setConfirming(false)} onRemoved={closeAll} />
    </>
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
  const bests = soloBests(state.stats.stats);
  if (total.matches === 0 && bests.length === 0) {
    return <p data-testid="no-records" className="rounded-xl bg-cream-200/60 py-6 text-center text-sm font-bold text-wood-700">아직 기록이 없어요</p>;
  }
  const bestLines = bests.length === 0 ? null : (
    <dl className="space-y-1">
      {bests.map((best) => (
        <div key={best.key} data-testid={`solo-best-${best.key}`} className="flex items-baseline justify-between rounded-xl bg-cream-200/60 px-3 py-2 text-sm text-wood-800">
          <dt className="font-bold">{best.name} 혼자 최고 점수</dt>
          <dd className="font-black tabular-nums">{points(best.score)}</dd>
        </div>
      ))}
    </dl>
  );
  if (total.matches === 0) {
    return bestLines;
  }
  return (
    <div className="space-y-3">
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
    {bestLines}
    </div>
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
