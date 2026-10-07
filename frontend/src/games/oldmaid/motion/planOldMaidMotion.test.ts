import { describe, expect, it } from 'vitest';
import { card, oldMaidEvent, oldMaidView } from '../oldMaidFixtures';
import { DRAW_MS, MAX_TRANSFER_FLIGHTS, PAIR_GAP_MS, planOldMaidMotion } from './planOldMaidMotion';

const base = oldMaidView({ events: [oldMaidEvent(3, 'SHUFFLE', { actorId: 3 })] });

describe('planOldMaidMotion', () => {
  it('뽑기는 가운데 부채에서 뽑은 사람 자리로 뒷면 한 장, 짝은 두 장이 앞면으로 버린 더미로', () => {
    const to = oldMaidView({ events: [
      oldMaidEvent(4, 'DRAW', { actorId: 3, targetId: 2, count: 1 }),
      oldMaidEvent(5, 'PAIR', { actorId: 3, cards: [card('SPADES', 'NINE'), card('HEARTS', 'NINE')] }),
    ] });

    const plan = planOldMaidMotion(base, to, 1);

    expect(plan.flights).toEqual([
      { card: null, from: 'target', to: 'hand:3', delay: 0, duration: DRAW_MS, flip: false },
      { card: card('SPADES', 'NINE'), from: 'hand:3', to: 'discard', delay: DRAW_MS, duration: 300, flip: false },
      { card: card('HEARTS', 'NINE'), from: 'hand:3', to: 'discard', delay: DRAW_MS + PAIR_GAP_MS, duration: 300, flip: false },
    ]);
    expect(plan.sounds).toEqual([{ name: 'draw', delay: 0 }, { name: 'place', delay: DRAW_MS }]);
  });

  it('내가 뽑히는 상대면 내 손패에서 날아간다', () => {
    const to = oldMaidView({ events: [oldMaidEvent(4, 'DRAW', { actorId: 3, targetId: 1, count: 1 })] });

    expect(planOldMaidMotion(base, to, 1).flights[0].from).toBe('hand:1');
  });

  it('기권 넘기기는 뒷면 묶음(최대 4장)이 받는 사람에게', () => {
    const to = oldMaidView({ events: [oldMaidEvent(4, 'FORFEIT', { actorId: 3, targetId: 1, count: 9 })] });

    const plan = planOldMaidMotion(base, to, 1);

    expect(plan.flights).toHaveLength(MAX_TRANSFER_FLIGHTS);
    expect(plan.flights.every((flight) => flight.from === 'hand:3' && flight.to === 'hand:1' && flight.card === null)).toBe(true);
    expect(plan.sounds).toEqual([{ name: 'draw', delay: 0 }]);
  });

  it('섞기 소리는 내가 섞었거나 지금 뽑히는 사람이 섞었을 때만', () => {
    const shuffleBy = (actorId: number) => oldMaidView({ events: [oldMaidEvent(4, 'SHUFFLE', { actorId })] });

    expect(planOldMaidMotion(base, shuffleBy(1), 1).sounds).toEqual([{ name: 'draw', delay: 0 }]);
    expect(planOldMaidMotion(base, shuffleBy(2), 1).sounds).toEqual([{ name: 'draw', delay: 0 }]);
    expect(planOldMaidMotion(base, shuffleBy(3), 1).sounds).toEqual([]);
  });

  it('처음 화면·새 판·이미 본 이벤트는 아무것도 하지 않는다', () => {
    expect(planOldMaidMotion(null, base, 1)).toEqual({ flights: [], sounds: [] });
    expect(planOldMaidMotion(base, oldMaidView({ startedAt: 2, events: [oldMaidEvent(9, 'DRAW', { actorId: 1, targetId: 2 })] }), 1).flights).toEqual([]);
    expect(planOldMaidMotion(base, base, 1)).toEqual({ flights: [], sounds: [] });
  });
});
