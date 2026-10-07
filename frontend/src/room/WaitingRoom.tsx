import { useState } from 'react';
import type { ChatMessage } from '../api/chat';
import type { Room, RoomMember } from '../api/types';
import { BinocularsIcon, BookIcon } from '../components/icons';
import { Button, Panel } from '../components/ui';
import { Felt } from '../components/Felt';
import { RulesCarousel } from '../table/RulesCarousel';
import { findGame } from '../games/registry';
import { PC_QUERY, useMediaQuery } from '../lib/useMediaQuery';
import { ChatPanel } from './ChatPanel';
import { KickConfirmModal } from './KickConfirmModal';
import { MemberList } from './MemberList';
import { MemberStatsModal, type StatsTarget } from './MemberStatsModal';
import { MemberAvatar } from '../components/Avatar';
import { useSeatBubbles } from './useSeatBubbles';
import { WaitingActionBar } from './WaitingActionBar';

/** latest: 지금 막 받은 메시지(기록 제외). 앉은 사람의 말이면 그 자리 위에 말풍선을 띄운다. */
type Chat = { messages: ChatMessage[]; onSend: (text: string) => boolean; latest?: ChatMessage | null };

type Props = {
  room: Room;
  meId: number;
  receivedAt: number;
  now: number;
  onStart: () => void;
  /** 요청이 끝날 때까지(Promise) 준비 버튼을 잠근다. */
  onReady: (ready: boolean) => unknown;
  onForfeit: (memberId: number) => void;
  /** 방장이 대기 중에 참가자를 내보낸다(확인 창을 거친 뒤 부른다). */
  onKick: (memberId: number) => unknown;
  onSeat: () => void;
  chat: Chat;
};

/** 펠트의 나무 테두리(box-shadow 13px)는 레이아웃에 잡히지 않으므로 그만큼 안쪽 여백을 두어 패널 사이 간격(24px)을 맞춘다. */
const FELT_RIM = 'p-[13px]';

export function WaitingRoom({ room, meId, receivedAt, now, onStart, onReady, onForfeit, onKick, onSeat, chat }: Props) {
  const spectating = room.spectators.some((spectator) => spectator.id === meId);
  const [kickTarget, setKickTarget] = useState<RoomMember | null>(null);
  const [statsTarget, setStatsTarget] = useState<StatsTarget | null>(null);
  const wide = useMediaQuery(PC_QUERY);
  const [rulesOpen, setRulesOpen] = useState(false);
  const rules = findGame(room.gameType)?.rules;
  const bubbles = useSeatBubbles(room.status === 'WAITING' ? chat.latest ?? null : null);
  const canKick = !spectating && room.status === 'WAITING' && room.hostId === meId;
  const askKick = (memberId: number) => setKickTarget(room.members.find((member) => member.id === memberId) ?? null);
  const confirmKick = () => {
    if (kickTarget) {
      onKick(kickTarget.id);
    }
    setKickTarget(null);
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
      <section aria-label="테이블" className={`flex flex-col items-center gap-[37px] ${FELT_RIM}`}>
        {/* 테이블 위에는 자리만 둔다. 가운데가 비어 있으니 펠트를 낮게(정사각형~3:2) 그린다. */}
        <Felt shape="round" className="aspect-square w-full max-w-[640px] sm:aspect-[3/2]">
          <MemberList members={room.members} maxPlayers={room.maxPlayers} meId={meId} receivedAt={receivedAt} now={now} bubbles={bubbles}
            onForfeit={spectating ? undefined : onForfeit} onKick={canKick ? askKick : undefined} onShowStats={setStatsTarget} />
        </Felt>
        <WaitingActionBar room={room} meId={meId} spectating={spectating} onStart={onStart} onReady={onReady} onSeat={onSeat} />
        {room.spectators.length > 0 ? (
          <p className="flex w-fit max-w-full flex-wrap items-center gap-x-1.5 gap-y-1 pill rounded-full px-3 py-1 text-sm">
            <BinocularsIcon /> 관전 중:
            {room.spectators.map((spectator, index) => {
              const separator = index < room.spectators.length - 1 ? ',' : '';
              if (spectator.id === meId) {
                return <span key={spectator.id} className="inline-flex items-center gap-1"><MemberAvatar memberId={spectator.id} avatar={spectator.avatar} size={18} />{spectator.nickname}{separator}</span>;
              }
              return (
                <button key={spectator.id} type="button" aria-label={`${spectator.nickname}님 전적 보기`} onClick={() => setStatsTarget(spectator)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-full underline decoration-dotted underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-mustard-300">
                  <MemberAvatar memberId={spectator.id} avatar={spectator.avatar} size={18} />{spectator.nickname}{separator}
                </button>
              );
            })}
          </p>
        ) : null}
      </section>
      <div className="flex flex-col gap-6">
        <Panel className="flex h-[340px] flex-col gap-3 lg:h-[380px]">
          <h2 className="font-bold">채팅</h2>
          <ChatPanel messages={chat.messages} meId={meId} onSend={chat.onSend} className="flex-1" />
        </Panel>
        {rules && wide ? (
          <Panel>
            <h2 className="font-bold">{rules.title}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-600">
              {rules.summary.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </Panel>
        ) : null}
        {rules && !wide ? (
          <Button variant="secondary" onClick={() => setRulesOpen(true)} className="flex items-center justify-center gap-1.5 self-center px-3 py-1.5">
            <BookIcon /> 규칙 보기
          </Button>
        ) : null}
      </div>
      {rules ? <RulesCarousel open={rulesOpen} onClose={() => setRulesOpen(false)} title={rules.title} slides={rules.slides} renderArt={rules.renderArt} /> : null}
      <MemberStatsModal target={statsTarget} onClose={() => setStatsTarget(null)} />
      <KickConfirmModal nickname={kickTarget?.nickname ?? null} onCancel={() => setKickTarget(null)} onConfirm={confirmKick} />
    </div>
  );
}
