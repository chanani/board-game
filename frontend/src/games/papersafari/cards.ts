import type { CardView } from '../../api/types';

const NUMBER_NAMES = ['쥐', '토끼', '원숭이', '얼룩말', '기린', '치타', '하마', '악어', '코뿔소', '사자'];
const SPECIAL = {
  ELEPHANT: { name: '코끼리' },
  TARZAN: { name: '타잔' },
  FOX: { name: '여우' },
  WILD: { name: '와일드' },
} as const;

export function animalName(card: CardView): string {
  if (card.kind === 'NUMBER') {
    return NUMBER_NAMES[card.value] ?? '카드';
  }
  return SPECIAL[card.kind].name;
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
