import type { OldMaidView, PlayingCard } from '../../api/types';

/** 고를 수 있는 최대 장수(짝 한 쌍). */
export const MAX_PICK = 2;

/** R3: 같은 숫자 두 장(조커는 짝이 없다). */
export function isPair(first: PlayingCard, second: PlayingCard): boolean {
  return first.id !== second.id && first.rank === second.rank && first.rank !== 'JOKER';
}

/** 카드를 누르면 고르거나 풀고, 이미 두 장이면 먼저 고른 카드를 놓고 새 카드를 고른다. */
export function toggleSelection(selected: number[], id: number): number[] {
  if (selected.includes(id)) {
    return selected.filter((one) => one !== id);
  }
  return [...selected, id].slice(-MAX_PICK);
}

/** 손에 남은 카드만 남긴다(버리거나 섞으면 고른 카드가 사라질 수 있다). */
export function keepInHand(selected: number[], hand: PlayingCard[]): number[] {
  return selected.filter((id) => hand.some((card) => card.id === id));
}

/** 손패에서 처음 만나는 짝(손패 순서). 짝 버리기 단계에서는 뽑은 카드와 그 짝뿐이다(R37). */
export function firstPair(hand: PlayingCard[]): [PlayingCard, PlayingCard] | null {
  for (let index = 0; index < hand.length; index += 1) {
    const partner = hand.slice(index + 1).find((other) => isPair(hand[index], other));
    if (partner) {
      return [hand[index], partner];
    }
  }
  return null;
}

export type DiscardChoice = {
  /** "버리기"가 보낼 두 장(null이면 비활성). */
  ids: [number, number] | null;
  /** 두 장을 골랐는데 짝이 아니면 짧은 안내. */
  hint: string | null;
  /** 은은하게 빛낼 카드(짝 버리기 단계의 뽑은 짝). */
  glowIds: number[];
};

const NOT_A_PAIR_HINT = '같은 숫자 두 장을 골라 주세요';

/**
 * 버리기 버튼이 보낼 두 장. 고른 두 장이 짝이면 그 두 장, 짝 버리기 단계에서 덜 골랐으면 뽑은 짝(강조된 두 장),
 * 두 장을 골랐는데 짝이 아니면 비활성 + 안내. 처음 버리기 단계는 직접 고른 두 장만.
 */
export function discardChoice(game: Pick<OldMaidView, 'stage' | 'canDiscard' | 'hand'>, selected: number[]): DiscardChoice {
  const hand = game.hand ?? [];
  if (!game.canDiscard) {
    return { ids: null, hint: null, glowIds: [] };
  }
  const drawnPair = game.stage === 'DISCARD' ? firstPair(hand) : null;
  const glowIds = drawnPair ? drawnPair.map((card) => card.id) : [];
  const picked = selected.map((id) => hand.find((card) => card.id === id)).filter((card): card is PlayingCard => card !== undefined);
  if (picked.length === MAX_PICK) {
    return isPair(picked[0], picked[1])
      ? { ids: [picked[0].id, picked[1].id], hint: null, glowIds }
      : { ids: null, hint: NOT_A_PAIR_HINT, glowIds };
  }
  if (drawnPair) {
    return { ids: [drawnPair[0].id, drawnPair[1].id], hint: null, glowIds };
  }
  return { ids: null, hint: null, glowIds };
}
