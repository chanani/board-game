import type { CardView } from '../../../api/types';
import { CardFace } from '../CardFace';
import { CardBack } from '../cards/CardBack';
import { ZoneAnchor } from '../motion/ZoneAnchor';
import { DECK, DISCARD } from '../motion/zones';

const SIZE_CLASS = { xs: 'h-14 w-10', sm: 'h-[67px] w-12', md: 'h-[90px] w-16', lg: 'h-28 w-20' };
/** 작은 테이블에서는 두 더미 사이와 이름표를 줄여, 양옆 상대 판 사이에 들어가게 한다. */
const GAP = { xs: 'gap-1.5', sm: 'gap-4', md: 'gap-6', lg: 'gap-6' };
const LABEL = { xs: 'px-1.5 text-[10px]', sm: 'px-2 text-xs', md: 'px-2 text-xs', lg: 'px-2 text-xs' };
/** 가져올 수 있을 때: 버린 카드와 같은 손가락 커서와 살짝 떠오르는 hover. */
const DRAWABLE = 'float-hint cursor-pointer hover:-translate-y-1.5 hover:rotate-[-1.5deg] focus-visible:-translate-y-1.5';

type Props = { deckSize: number; discardTop: CardView | null; drawable: boolean; onDrawDeck: () => void; onDrawDiscard: () => void; size: PileSize };

export type PileSize = 'xs' | 'sm' | 'md' | 'lg';

function deckLayers(deckSize: number): number {
  return Math.max(1, Math.min(4, Math.ceil(deckSize / 12)));
}

export function CenterPiles({ deckSize, discardTop, drawable, onDrawDeck, onDrawDiscard, size }: Props) {
  const layers = deckLayers(deckSize);
  return (
    <div className={`flex items-end ${GAP[size]}`}>
      <div className="flex flex-col items-center gap-1">
        <ZoneAnchor zone={DECK} className="relative">
          {Array.from({ length: layers - 1 }, (_, index) => (
            <span key={index} aria-hidden="true" className={`card-thick absolute block overflow-hidden rounded-[10%/7%] ${SIZE_CLASS[size]}`}
              style={{ transform: `translate(${(index + 1) * 2}px, ${(index + 1) * 2}px)` }}>
              <CardBack />
            </span>
          ))}
          <button type="button" aria-label="덱에서 뽑기" data-no-click-sound disabled={!drawable} onClick={onDrawDeck}
            className={`press-3d card-thick relative block overflow-hidden rounded-[10%/7%] transition-transform duration-150 ${SIZE_CLASS[size]} ${drawable ? DRAWABLE : 'cursor-default'}`}>
            <CardBack />
          </button>
        </ZoneAnchor>
        <span className={`relative z-[1] mt-1.5 pill whitespace-nowrap rounded-full font-bold ${LABEL[size]}`}>덱 {deckSize}장</span>
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
        <span className={`relative z-[1] mt-1.5 pill whitespace-nowrap rounded-full font-bold ${LABEL[size]}`}>버린 카드</span>
      </div>
    </div>
  );
}
