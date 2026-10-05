import type { CardView } from '../../../api/types';
import { CardFace } from '../CardFace';
import { CardBack } from '../cards/CardBack';
import { ZoneAnchor } from '../motion/ZoneAnchor';
import { DECK, DISCARD } from '../motion/zones';

const SIZE_CLASS = { md: 'h-[90px] w-16', lg: 'h-28 w-20' };

type Props = { deckSize: number; discardTop: CardView | null; drawable: boolean; onDrawDeck: () => void; onDrawDiscard: () => void; size: 'md' | 'lg' };

function deckLayers(deckSize: number): number {
  return Math.max(1, Math.min(4, Math.ceil(deckSize / 12)));
}

export function CenterPiles({ deckSize, discardTop, drawable, onDrawDeck, onDrawDiscard, size }: Props) {
  const layers = deckLayers(deckSize);
  return (
    <div className="flex items-end gap-6">
      <div className="flex flex-col items-center gap-1">
        <ZoneAnchor zone={DECK} className="relative">
          {Array.from({ length: layers - 1 }, (_, index) => (
            <span key={index} aria-hidden="true" className={`card-thick absolute block overflow-hidden rounded-[10%/7%] ${SIZE_CLASS[size]}`}
              style={{ transform: `translate(${(index + 1) * 2}px, ${(index + 1) * 2}px)` }}>
              <CardBack />
            </span>
          ))}
          <button type="button" aria-label="덱에서 뽑기" disabled={!drawable} onClick={onDrawDeck}
            className={`press-3d card-thick relative block overflow-hidden rounded-[10%/7%] disabled:cursor-default ${SIZE_CLASS[size]} ${drawable ? 'float-hint' : ''}`}>
            <CardBack />
          </button>
        </ZoneAnchor>
        <span className="rounded-full bg-black/35 px-2 text-xs font-bold text-cream-50">덱 {deckSize}장</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <ZoneAnchor zone={DISCARD}>
          {discardTop ? (
            <CardFace card={discardTop} faceUp known={false} size={size} pulse={drawable}
              onClick={drawable ? onDrawDiscard : undefined} />
          ) : (
            <div className={`${SIZE_CLASS[size]} rounded-[10%/7%] border-2 border-dashed border-cream-50/40`} />
          )}
        </ZoneAnchor>
        <span className="rounded-full bg-black/35 px-2 text-xs font-bold text-cream-50">버린 카드</span>
      </div>
    </div>
  );
}
