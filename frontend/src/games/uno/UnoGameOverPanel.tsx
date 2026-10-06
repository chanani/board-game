import { useEffect, useState } from 'react';
import type { Room, UnoResultPlayer, UnoView } from '../../api/types';
import { Confetti } from '../../components/Confetti';
import { Modal } from '../../components/Modal';
import { RollingNumber } from '../../components/RollingNumber';
import { FooterButton, HeadlineIcon, ReadyChips, useResultSound } from '../../table/gameOver';
import { UnoCardFace } from './UnoCardFace';

type Props = {
  game: UnoView;
  room: Room;
  meId: number;
  nicknameOf: (memberId: number) => string;
  onReady: () => void;
  onClose: () => void;
};

const SHOWN_CARDS = 10;

function ResultRow({ player, name }: { player: UnoResultPlayer; name: string }) {
  const extra = player.cards.length - SHOWN_CARDS;
  return (
    <li data-testid="uno-result-row" data-player={player.playerId} className="space-y-1.5 rounded-lg bg-cream-200/60 px-3 py-2 text-sm">
      <div className="flex justify-between gap-2">
        <span className="font-medium">{name}</span>
        <span><span>{player.cards.length}장</span> · <strong>{player.points}점</strong></span>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {player.cards.slice(0, SHOWN_CARDS).map((card) => <UnoCardFace key={card.id} card={card} width={22} />)}
        {extra > 0 ? <span className="text-xs font-bold text-wood-700">+{extra}</span> : null}
      </div>
    </li>
  );
}

/** 게임 결과: 이긴 사람과 얻은 점수, 진 사람마다 남은 카드와 점수, 그리고 다음 게임 준비(스펙 6.10). */
export function UnoGameOverPanel({ game, room, meId, nicknameOf, onReady, onClose }: Props) {
  const result = game.result;
  const winnerId = game.winnerId;
  const won = winnerId === meId;
  const participant = game.participantIds.includes(meId);
  const emptied = result?.reason === 'EMPTY_HAND';
  const [shown, setShown] = useState(0);
  useEffect(() => setShown(result?.points ?? 0), [result?.points]);
  useResultSound(true, participant ? (won ? 'WIN' : 'LOSE') : undefined);
  const me = room.members.find((member) => member.id === meId);
  const guest = me !== undefined && !me.host;
  const rows = [...(result?.players ?? [])].sort((a, b) => b.points - a.points);
  const headline = won ? '내가 이겼어요!' : `${nicknameOf(winnerId ?? 0)}님이 이겼어요!`;

  return (
    <>
      <Confetti active={won} />
      <Modal open title="게임 결과" onClose={onClose} wide padding="roomy" initialFocus="dialog">
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-1">
            <HeadlineIcon won={won} />
            <h2 className="text-center text-2xl font-black">{headline}</h2>
            {emptied ? <p data-testid="won-points" className="text-4xl font-black text-safari-700">+<RollingNumber value={shown} />점</p> : null}
            {result?.reason === 'FORFEIT' && won ? <p className="text-center text-sm font-bold text-wood-700">상대가 모두 나가서 게임이 끝났어요</p> : null}
          </div>
          {emptied ? (
            <ul className="space-y-2">
              {rows.map((player) => <ResultRow key={player.playerId} player={player} name={nicknameOf(player.playerId)} />)}
            </ul>
          ) : null}
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
