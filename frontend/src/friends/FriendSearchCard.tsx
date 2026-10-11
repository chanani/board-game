import { useEffect, useState } from 'react';
import type { FriendSearchRelation, FriendSearchResult, SendFriendResult } from '../api/friends';
import { messageOf } from '../api/http';
import { recordsApi } from '../api/records';
import type { GameStat } from '../api/types';
import { MemberAvatar } from '../components/Avatar';
import { CheckIcon, UserPlusIcon } from '../components/icons';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui';
import { percent } from '../lib/format';

/** 요청이 잘 갔을 때의 안내. 상대가 먼저 보낸 요청이 있었다면 바로 친구가 된다. */
export function sentMessage(result: SendFriendResult): string {
  return result.status === 'ACCEPTED' ? `${result.nickname}님과 친구가 됐어요.` : `${result.nickname}님에게 친구 요청을 보냈어요.`;
}

/** 게임을 가리지 않고 모두 더한 한 줄 전적. */
export function statSummary(stats: GameStat[]): string {
  const matches = stats.reduce((sum, stat) => sum + stat.matches, 0);
  if (matches === 0) {
    return '아직 기록이 없어요';
  }
  const wins = stats.reduce((sum, stat) => sum + stat.wins, 0);
  return `${matches}판 ${wins}승 · 승률 ${percent(wins / matches)}`;
}

/** 찾은 사람의 전적 한 줄. 불러오는 동안과 실패했을 때는 비워 둔다(그림과 닉네임만으로도 누구인지 알 수 있다). */
function useStatSummary(memberId: number): string | null {
  const [summary, setSummary] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    recordsApi.member(memberId)
      .then((stats) => { if (!cancelled) setSummary(statSummary(stats.stats)); })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [memberId]);
  return summary;
}

type Props = {
  member: FriendSearchResult;
  relation: FriendSearchRelation;
  /** 친구 요청을 보낸다. 상대가 먼저 보낸 요청이 있으면 서버가 바로 친구로 만들어 주어, 수락도 이것으로 한다. */
  onRequest: (memberId: number) => Promise<SendFriendResult>;
};

const stateText = 'shrink-0 text-xs font-bold text-wood-700';

/** 닉네임으로 찾은 사람 한 명. 그림·닉네임·전적 한 줄과, 그 사람과의 사이에 맞는 버튼이나 안내를 보여 준다. */
export function FriendSearchCard({ member, relation, onRequest }: Props) {
  const summary = useStatSummary(member.memberId);
  return (
    <div data-testid="friend-search-card" role="group" aria-label={`${member.nickname}님 검색 결과`}
      className="flex items-center gap-2.5 rounded-xl border border-wood-700/15 bg-cream-200/60 p-2.5">
      <MemberAvatar memberId={member.memberId} avatar={member.avatar} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{member.nickname}</p>
        <p data-testid="friend-search-stats" className="min-h-4 truncate text-xs text-stone-600">{summary ?? ''}</p>
      </div>
      <CardAction member={member} relation={relation} onRequest={onRequest} />
    </div>
  );
}

function CardAction({ member, relation, onRequest }: Props) {
  const toast = useToast();
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      toast.show(sentMessage(await onRequest(member.memberId)), 'info');
    } catch (error) {
      toast.show(messageOf(error));
    } finally {
      setSending(false);
    }
  };

  if (relation === 'SELF') {
    return <span className={stateText}>내 닉네임이에요</span>;
  }
  if (relation === 'FRIEND') {
    return <span className={stateText}>이미 친구예요</span>;
  }
  if (relation === 'REQUEST_SENT') {
    // 누를 수 없지만 흐리게 하지 않는다(공통 Button의 disabled는 반투명이라 글자가 잘 안 읽힌다).
    return (
      <button type="button" disabled
        className="flex shrink-0 cursor-not-allowed items-center gap-1 rounded-xl border border-stone-400 bg-stone-200 px-3 py-2 text-sm font-bold text-stone-700">
        <CheckIcon className="h-4 w-4" />요청 보냄
      </button>
    );
  }
  return (
    <Button className="flex shrink-0 items-center gap-1.5 px-3" disabled={sending} onClick={() => void send()}>
      <UserPlusIcon />{relation === 'REQUEST_RECEIVED' ? '요청 수락' : '친구 요청'}
    </Button>
  );
}
