import { describe, expect, it } from 'vitest';
import { card, oldMaidEvent, oldMaidView } from '../oldMaidFixtures';
import { FINALE_DELAY_MS } from '../../../table/useFinalePhase';
import { DRAW_MS, finaleDelayMs, MAX_TRANSFER_FLIGHTS, PAIR_GAP_MS, PAIR_MS, planOldMaidMotion } from './planOldMaidMotion';

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

  it('내가 뽑으면 내 손패로 날아오는 카드는 뒷면에서 앞면으로 뒤집히며 들어온다(뽑은 카드는 내 손패에 새로 생긴 카드)', () => {
    const from = oldMaidView({ hand: [card('SPADES', 'THREE'), card('HEARTS', 'SEVEN')], events: base.events });
    const to = oldMaidView({ hand: [card('SPADES', 'THREE'), card('HEARTS', 'SEVEN'), card('CLUBS', 'KING')], events: [
      oldMaidEvent(4, 'DRAW', { actorId: 1, targetId: 2, count: 1 }),
    ] });

    expect(planOldMaidMotion(from, to, 1).flights).toEqual([
      { card: card('CLUBS', 'KING'), from: 'target', to: 'hand:1', delay: 0, duration: DRAW_MS, flip: true },
    ]);
  });

  it('내가 뽑아 곧바로 짝이 되면 짝 중 원래 내 손패에 없던 카드가 앞면으로 뒤집히며 들어온다', () => {
    const from = oldMaidView({ hand: [card('SPADES', 'THREE'), card('HEARTS', 'SEVEN')], events: base.events });
    const to = oldMaidView({ hand: [card('HEARTS', 'SEVEN')], events: [
      oldMaidEvent(4, 'DRAW', { actorId: 1, targetId: 2, count: 1 }),
      oldMaidEvent(5, 'PAIR', { actorId: 1, cards: [card('SPADES', 'THREE'), card('DIAMONDS', 'THREE')] }),
    ] });

    const [drawn] = planOldMaidMotion(from, to, 1).flights;

    expect(drawn).toEqual({ card: card('DIAMONDS', 'THREE'), from: 'target', to: 'hand:1', delay: 0, duration: DRAW_MS, flip: true });
  });

  it('남이 뽑는 카드는 누구에게도 얼굴을 보이지 않는다(숨김 정보)', () => {
    const to = oldMaidView({ hand: [card('SPADES', 'THREE'), card('HEARTS', 'SEVEN')], events: [oldMaidEvent(4, 'DRAW', { actorId: 3, targetId: 1, count: 1 })] });

    expect(planOldMaidMotion(base, to, 1).flights[0]).toMatchObject({ card: null, flip: false });
    expect(planOldMaidMotion(base, to, 2).flights[0]).toMatchObject({ card: null, flip: false });
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

  it('게임 끝 배너는 마지막 비행이 내려앉고 100ms 뒤(우노처럼), 짧으면 기본 450ms', () => {
    const last = oldMaidView({ status: 'GAME_OVER', events: [
      oldMaidEvent(4, 'DRAW', { actorId: 3, targetId: 2, count: 1 }),
      oldMaidEvent(5, 'PAIR', { actorId: 3, cards: [card('SPADES', 'NINE'), card('HEARTS', 'NINE')] }),
      oldMaidEvent(6, 'GAME_END', { actorId: 2, count: 2, reason: 'NORMAL' }),
    ] });
    const drawOnly = oldMaidView({ status: 'GAME_OVER', events: [oldMaidEvent(4, 'DRAW', { actorId: 3, targetId: 2, count: 1 })] });

    expect(finaleDelayMs(base, last, 1)).toBe(DRAW_MS + PAIR_GAP_MS + PAIR_MS + 100);
    expect(finaleDelayMs(base, drawOnly, 1)).toBe(FINALE_DELAY_MS);
    expect(finaleDelayMs(null, last, 1)).toBe(FINALE_DELAY_MS);
  });
});
