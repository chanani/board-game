import type { OldMaidView, PlayingCard } from '../../api/types';

/** R3: 같은 숫자 두 장(조커는 짝이 없다). */
export function isPair(first: PlayingCard, second: PlayingCard): boolean {
  return first.id !== second.id && first.rank === second.rank && first.rank !== 'JOKER';
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

/** 다른 숫자를 고르면 잠깐 보이는 안내. */
export const NOT_A_PAIR_HINT = '같은 숫자 두 장을 고르세요';

export type PickStep = {
  /** 누른 뒤 고른 카드(0~1장). */
  ids: number[];
  /** 바로 보낼 짝 두 장(누른 순서). 없으면 null. */
  send: [number, number] | null;
  /** 두 번째 카드가 다른 숫자일 때 짧은 안내. */
  hint: string | null;
};

/**
 * R36·R37 카드 누르기: 고른 카드를 다시 누르면 풀고, 한 장을 골라 둔 채 같은 숫자를 누르면 그 두 장을 바로 버린다.
 * 다른 숫자(조커 포함)면 보내지 않고 새로 누른 카드만 고른 채 안내를 띄운다.
 */
export function pickCard(hand: PlayingCard[], selected: number[], id: number): PickStep {
  if (selected.includes(id)) {
    return { ids: selected.filter((one) => one !== id), send: null, hint: null };
  }
  const first = hand.find((one) => one.id === selected[0]);
  const second = hand.find((one) => one.id === id);
  if (!first || !second) {
    return { ids: [id], send: null, hint: null };
  }
  if (isPair(first, second)) {
    return { ids: [], send: [first.id, second.id], hint: null };
  }
  return { ids: [id], send: null, hint: NOT_A_PAIR_HINT };
}

/** R37 짝 버리기 단계에서 은은하게 빛낼 뽑은 짝(그 밖의 단계는 없음). */
export function drawnPairIds(game: Pick<OldMaidView, 'stage' | 'canDiscard' | 'hand'>): number[] {
  if (!game.canDiscard || game.stage !== 'DISCARD') {
    return [];
  }
  const pair = firstPair(game.hand ?? []);
  return pair ? pair.map((card) => card.id) : [];
}
