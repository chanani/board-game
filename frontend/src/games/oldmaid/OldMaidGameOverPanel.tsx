import type { OldMaidRankEntry, OldMaidView, Room } from '../../api/types';
import { AvatarFace } from '../../components/Avatar';
import { Confetti } from '../../components/Confetti';
import { ThiefMaskIcon } from '../../components/icons';
import { Modal } from '../../components/Modal';
import { roomAvatarOf } from '../../lib/avatars';
import { FooterButton, HeadlineIcon, ReadyChips } from '../../table/gameOver';
import { JOKER_CARD } from './cards';
import { PlayingCardFace } from './PlayingCardFace';

type Props = {
  game: OldMaidView;
  room: Room;
  meId: number;
  nicknameOf: (memberId: number) => string;
  onReady: () => void;
  onClose: () => void;
};

function RankRow({ entry, name, room }: { entry: OldMaidRankEntry; name: string; room: Room }) {
  const thief = entry.placement === 'THIEF';
  const forfeited = entry.placement === 'FORFEITED';
  return (
    <li data-testid="rank-row" data-player={entry.playerId} data-placement={entry.placement}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${thief ? 'bg-rose-100 ring-2 ring-rose-400' : 'bg-cream-200/60'} ${forfeited ? 'opacity-60' : ''}`}>
      <span className="w-10 shrink-0 font-black tabular-nums">{entry.rank}등</span>
      <AvatarFace avatar={roomAvatarOf(room, entry.playerId)} size={24} />
      <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
      {thief ? (
        <span className="inline-flex items-center gap-1 font-bold text-rose-700">
          <ThiefMaskIcon className="h-4 w-4" /><PlayingCardFace card={JOKER_CARD} width={18} decorative />도둑
        </span>
      ) : null}
      {forfeited ? <span className="text-xs font-bold text-stone-500">기권</span> : null}
    </li>
  );
}

/** 게임 결과: 1등 머리말, 도둑 줄, 등수 표(도둑 강조), 다음 게임 준비(스펙 6.10). */
export function OldMaidGameOverPanel({ game, room, meId, nicknameOf, onReady, onClose }: Props) {
  const result = game.result;
  const winnerId = game.winnerId;
  const won = winnerId === meId;
  const me = room.members.find((member) => member.id === meId);
  const guest = me !== undefined && !me.host;
  const headline = won ? '내가 1등이에요!' : `${nicknameOf(winnerId ?? 0)}님이 1등이에요!`;
  const thiefId = result?.thiefId ?? null;
  const thiefLine = thiefId === null ? null : thiefId === meId ? '내가 도둑이에요' : `도둑은 ${nicknameOf(thiefId)}님이에요`;
  const lastStanding = Boolean(result?.ranking.some((entry) => entry.placement === 'LAST_STANDING'));

  return (
    <>
      <Confetti active={won} />
      <Modal open title="게임 결과" onClose={onClose} wide padding="roomy" initialFocus="dialog">
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-1">
            <HeadlineIcon won={won} />
            <h2 className="text-center text-2xl font-black">{headline}</h2>
            {thiefLine ? (
              <p data-testid="thief-line" className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-sm font-bold text-rose-700">
                <ThiefMaskIcon className="h-4 w-4" />{thiefLine}
              </p>
            ) : null}
            {lastStanding ? <p className="text-center text-sm font-bold text-wood-700">모두 나가서 게임이 끝났어요</p> : null}
          </div>
          <ol aria-label="등수" className="space-y-2">
            {(result?.ranking ?? []).map((entry) => <RankRow key={entry.playerId} entry={entry} name={nicknameOf(entry.playerId)} room={room} />)}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ReadyChips members={room.members} />
            <div className="ml-auto">
              <FooterButton guest={guest} onReady={onReady} onClose={onClose} />
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
