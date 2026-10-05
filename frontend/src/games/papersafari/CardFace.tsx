import type { CardView } from '../../api/types';
import { cardEmoji, cardLabel, cardName } from './cards';

type Props = {
  card: CardView | null;
  faceUp: boolean;
  known: boolean;
  size?: 'sm' | 'md';
  highlight?: boolean;
  onClick?: () => void;
};

const SIZES = { sm: 'h-14 w-10 text-lg', md: 'h-24 w-16 text-3xl' };

export function CardFace({ card, faceUp, known, size = 'md', highlight = false, onClick }: Props) {
  const ring = highlight ? 'ring-2 ring-safari-300' : 'ring-1 ring-stone-200';
  const clickable = onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : '';
  const base = `relative flex select-none flex-col items-center justify-center rounded-xl shadow-sm transition ${SIZES[size]} ${ring} ${clickable}`;

  if (!card) {
    return (
      <button type="button" aria-label="뒷면 카드" disabled={!onClick} onClick={onClick}
        className={`${base} bg-safari-600 text-white disabled:cursor-default`}>
        <span className="opacity-60">🌿</span>
      </button>
    );
  }

  const label = `${cardLabel(card)} 카드${known && !faceUp ? ' (엿봄)' : ''}`;
  const name = cardName(card);
  return (
    <button type="button" aria-label={label} disabled={!onClick} onClick={onClick}
      className={`${base} bg-white disabled:cursor-default ${known && !faceUp ? 'opacity-70' : ''}`}>
      <span>{cardEmoji(card)}</span>
      <span className="text-xs font-bold text-stone-700">{card.kind === 'WILD' ? '?' : card.value}</span>
      {name && size === 'md' ? <span className="text-[10px] text-stone-500">{name}</span> : null}
      {known && !faceUp ? <span className="absolute right-1 top-1 text-xs">👁</span> : null}
    </button>
  );
}
