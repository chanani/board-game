import type { CardView } from '../../api/types';
import { cardLabel } from './cards';
import { CardArt } from './cards/CardArt';
import { CardBack } from './cards/CardBack';

type Props = {
  card: CardView | null;
  faceUp: boolean;
  known: boolean;
  size?: CardSize;
  highlight?: boolean;
  pulse?: boolean;
  sparkle?: boolean;
  onClick?: () => void;
};

export type CardSize = 'mini' | 'xs' | 'sm' | 'md' | 'lg';

const SIZES = { mini: 'h-10 w-7', xs: 'h-14 w-10', sm: 'h-[67px] w-12', md: 'h-[90px] w-16', lg: 'h-28 w-20' };

function labelOf(card: CardView | null, faceUp: boolean, known: boolean): string {
  if (!card) {
    return '뒷면 카드';
  }
  return `${cardLabel(card)} 카드${known && !faceUp ? ' (엿봄)' : ''}`;
}

function sideOf(showFront: boolean, peeked: boolean): 'front' | 'peeked' | 'back' {
  if (peeked) {
    return 'peeked';
  }
  return showFront ? 'front' : 'back';
}

export function CardFace({ card, faceUp, known, size = 'md', highlight = false, pulse = false, sparkle = false, onClick }: Props) {
  const peeked = card !== null && known && !faceUp;
  const showFront = card !== null && (faceUp || peeked);
  const peekRing = peeked ? 'outline-[3px] outline-dashed outline-violet-400 outline-offset-2 peek-lift' : 'outline-none';
  const ring = highlight ? 'ring-[3px] ring-mustard-400 shadow-[0_0_14px_rgb(242_179_61/0.8)]' : '';
  const clickable = onClick ? 'cursor-pointer hover:-translate-y-1.5 hover:rotate-[-1.5deg] focus-visible:-translate-y-1.5' : 'cursor-default';
  return (
    <button
      type="button"
      aria-label={labelOf(card, faceUp, known)}
      data-side={sideOf(showFront, peeked)}
      disabled={!onClick}
      data-no-click-sound
      onClick={onClick}
      className={`card-3d relative block select-none rounded-[10%/7%] transition-transform duration-150 focus-visible:ring-4 focus-visible:ring-mustard-300 ${SIZES[size]} ${clickable} ${pulse ? 'float-hint' : ''} ${peekRing}`}
    >
      <span className={`card-inner card-thick block rounded-[10%/7%] ${ring} ${sparkle ? 'gold-sparkle' : ''}`}
        style={{ transform: showFront ? 'rotateY(0deg)' : 'rotateY(180deg)' }}>
        <span className="card-side">{card ? <CardArt card={card} /> : null}</span>
        <span className="card-side is-back"><CardBack /></span>
      </span>
      {peeked ? (
        <span data-testid="peek-tag" aria-hidden="true" className="pointer-events-none absolute -bottom-2 left-1/2 z-[2] -translate-x-1/2 whitespace-nowrap rounded-full bg-violet-600 px-1.5 text-[9px] font-black leading-4 text-white shadow">엿봄</span>
      ) : null}
    </button>
  );
}
