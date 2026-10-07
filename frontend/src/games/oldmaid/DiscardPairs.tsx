import { useState } from 'react';
import type { OldMaidDiscard, PlayingCard } from '../../api/types';
import { cardName } from './cards';
import { DiscardHistoryModal } from './DiscardHistoryModal';
import { PlayingCardFace } from './PlayingCardFace';

type Props = { pairs: PlayingCard[][]; count: number; cardWidth: number; discards: OldMaidDiscard[]; nicknameOf: (id: number) => string };

const SHOWN_PAIRS = 3;

/** 버린 짝 더미: 최근 짝 3쌍을 아래부터 겹쳐 쌓고 맨 위 짝은 엇갈려 둔다. 모두에게 공개. 누르면 버린 카드 목록 창을 연다. */
export function DiscardPairs({ pairs, count, cardWidth, discards, nicknameOf }: Props) {
  const [open, setOpen] = useState(false);
  const shown = pairs.slice(-SHOWN_PAIRS);
  const top = shown[shown.length - 1];
  const label = top ? `버린 카드 ${count}장, 맨 위 ${top.map(cardName).join('·')}` : '버린 카드 없음';
  return (
    <div role="group" aria-label={label} data-testid="discard-pairs" className="flex shrink-0 flex-col items-center gap-1">
      <button type="button" aria-label="버린 카드 보기" onClick={() => setOpen(true)}
        className="flex cursor-pointer flex-col items-center gap-1 rounded-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cream-50">
        <div data-oldmaid-zone="discard" className="relative" style={{ width: cardWidth * 1.7, height: cardWidth * 1.5 + 8 }}>
          {shown.length === 0 ? <div className="absolute inset-0 rounded-lg border-2 border-dashed border-cream-50/40" /> : null}
          {shown.map((pair, depth) => (
            <div key={pair.map((one) => one.id).join('-')} className="absolute inset-0" style={{ opacity: depth === shown.length - 1 ? 1 : 0.55, transform: `translateY(${(shown.length - 1 - depth) * -3}px)` }}>
              <span className="absolute left-0 top-1" style={{ transform: 'rotate(-6deg)' }}><PlayingCardFace card={pair[0]} width={cardWidth} decorative /></span>
              <span className="absolute top-1" style={{ left: cardWidth * 0.62, transform: 'rotate(8deg)' }}><PlayingCardFace card={pair[1]} width={cardWidth} decorative /></span>
            </div>
          ))}
        </div>
        <span className="felt-ink text-[11px] font-bold">{count > 0 ? `버린 카드 ${count}장` : '버린 짝 없음'}</span>
      </button>
      <DiscardHistoryModal open={open} discards={discards} nicknameOf={nicknameOf} onClose={() => setOpen(false)} />
    </div>
  );
}
