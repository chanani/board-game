import type { CardView } from '../../api/types';
import { cardLabel } from './cards';
import { CardArt } from './cards/CardArt';
import { CardBack } from './cards/CardBack';

type Props = {
  card: CardView | null;
  faceUp: boolean;
  known: boolean;
  size?: 'sm' | 'md' | 'lg';
  highlight?: boolean;
  pulse?: boolean;
  sparkle?: boolean;
  onClick?: () => void;
};

const SIZES = { sm: 'h-[67px] w-12', md: 'h-[90px] w-16', lg: 'h-28 w-20' };

function labelOf(card: CardView | null, faceUp: boolean, known: boolean): string {
  if (!card) {
    return '뒷면 카드';
  }
  return `${cardLabel(card)} 카드${known && !faceUp ? ' (엿봄)' : ''}`;
}

export function CardFace({ card, faceUp, known, size = 'md', highlight = false, pulse = false, sparkle = false, onClick }: Props) {
  const showFront = card !== null && faceUp;
  const peeked = card !== null && known && !faceUp;
  const ring = highlight ? 'ring-[3px] ring-mustard-400 shadow-[0_0_14px_rgb(242_179_61/0.8)]' : '';
  const clickable = onClick ? 'cursor-pointer hover:-translate-y-1.5 hover:rotate-[-1.5deg] focus-visible:-translate-y-1.5' : 'cursor-default';
  return (
    <button
      type="button"
      aria-label={labelOf(card, faceUp, known)}
      data-side={showFront ? 'front' : 'back'}
      disabled={!onClick}
      onClick={onClick}
      className={`card-3d relative block select-none rounded-[10%/7%] transition-transform duration-150 outline-none focus-visible:ring-4 focus-visible:ring-mustard-300 ${SIZES[size]} ${clickable} ${pulse ? 'float-hint' : ''}`}
    >
      <span className={`card-inner card-thick block rounded-[10%/7%] ${ring} ${sparkle ? 'gold-sparkle' : ''}`}
        style={{ transform: showFront ? 'rotateY(0deg)' : 'rotateY(180deg)' }}>
        <span className="card-side">{card ? <CardArt card={card} /> : null}</span>
        <span className="card-side is-back"><CardBack /></span>
      </span>
      {peeked ? (
        <span className="pointer-events-none absolute inset-0 opacity-45"><CardArt card={card} /></span>
      ) : null}
      {peeked ? (
        <span className="absolute -right-1.5 -top-1.5 rounded-full bg-cream-50 px-1 text-xs shadow">👁</span>
      ) : null}
    </button>
  );
}
