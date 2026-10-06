import { describe, expect, it } from 'vitest';
import { num, unoEvent, unoView, wild } from '../unoFixtures';
import { planUnoMotion } from './planUnoMotion';

const before = unoView({ events: [unoEvent(4, 'DRAW', { actorId: 3, count: 1 })] });

describe('planUnoMotion', () => {
  it('처음 화면·새 게임·같은 이벤트면 아무것도 날리지 않는다', () => {
    expect(planUnoMotion(null, before, 1)).toEqual({ flights: [], sounds: [] });
    expect(planUnoMotion(before, before, 1)).toEqual({ flights: [], sounds: [] });
    expect(planUnoMotion(before, unoView({ startedAt: 9999, events: [unoEvent(1, 'START', { actorId: 1 })] }), 1)).toEqual({ flights: [], sounds: [] });
  });

  it('카드를 내면 그 사람 자리에서 버린 더미로 0.35초, 상대 카드는 뒤집으며 날린다', () => {
    const plan = planUnoMotion(before, unoView({ events: [unoEvent(5, 'PLAY', { actorId: 2, card: num('RED', 7, 13) })] }), 1);

    expect(plan.flights).toEqual([{ card: num('RED', 7, 13), from: 'hand:2', to: 'discard', delay: 0, duration: 350, flip: true }]);
    expect(plan.sounds).toEqual([{ name: 'place', delay: 0 }]);
  });

  it('내가 낸 카드는 뒤집지 않는다', () => {
    const plan = planUnoMotion(before, unoView({ events: [unoEvent(5, 'PLAY', { actorId: 1, card: wild(100), color: 'GREEN' })] }), 1);

    expect(plan.flights[0].flip).toBe(false);
  });

  it('여러 장 뽑기는 장당 0.25초·0.08초 간격, 최대 6장만 날리고 소리는 0.12초 간격 최대 4번', () => {
    const plan = planUnoMotion(before, unoView({ events: [
      unoEvent(5, 'PLAY', { actorId: 1, card: num('RED', 7, 13) }),
      unoEvent(6, 'PENALTY', { targetId: 2, count: 8, reason: 'CHALLENGE_FAILED' }),
    ] }), 1);

    const draws = plan.flights.filter((flight) => flight.from === 'draw');
    expect(draws).toHaveLength(6);
    expect(draws.map((flight) => flight.delay)).toEqual([350, 430, 510, 590, 670, 750]);
    expect(draws.every((flight) => flight.to === 'hand:2' && flight.duration === 250 && flight.card === null)).toBe(true);
    expect(plan.sounds.filter((sound) => sound.name === 'draw').map((sound) => sound.delay)).toEqual([350, 470, 590, 710]);
  });

  it('우노 외침과 잡힘에는 우노 소리를 낸다', () => {
    const plan = planUnoMotion(before, unoView({ events: [unoEvent(5, 'UNO_CALL', { actorId: 2 })] }), 1);

    expect(plan.sounds).toEqual([{ name: 'uno', delay: 0 }]);
  });
});
