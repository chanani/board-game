import type { CardView } from '../../api/types';

const NUMBER_EMOJI = ['🐁', '🐇', '🐒', '🦓', '🦒', '🐆', '🦛', '🐊', '🦏', '🦁'];
const SPECIAL = {
  ELEPHANT: { emoji: '🐘', name: '코끼리' },
  TARZAN: { emoji: '🧔', name: '타잔' },
  FOX: { emoji: '🦊', name: '여우' },
  WILD: { emoji: '❓', name: '와일드' },
} as const;

export function cardEmoji(card: CardView): string {
  if (card.kind === 'NUMBER') {
    return NUMBER_EMOJI[card.value] ?? '🃏';
  }
  return SPECIAL[card.kind].emoji;
}

export function cardName(card: CardView): string | null {
  if (card.kind === 'NUMBER') {
    return null;
  }
  return SPECIAL[card.kind].name;
}

export function cardLabel(card: CardView): string {
  const name = cardName(card);
  if (card.kind === 'WILD') {
    return '와일드';
  }
  return name ? `${name} ${card.value}` : String(card.value);
}
