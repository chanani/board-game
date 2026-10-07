import type { OldMaidEvent, OldMaidView, PlayingCard } from '../../../api/types';
import { FINALE_DELAY_MS } from '../../../table/useFinalePhase';
import type { FlightPlan } from '../../../table/useGhostFlights';
import { latestSeq } from '../describe';

export type OldMaidZone = 'discard' | 'target' | `hand:${number}`;
export type OldMaidPlan = FlightPlan<OldMaidZone, PlayingCard | null>;

export const DRAW_MS = 350;
export const PAIR_MS = 300;
export const PAIR_GAP_MS = 60;
export const TRANSFER_MS = 400;
export const TRANSFER_GAP_MS = 80;
export const MAX_TRANSFER_FLIGHTS = 4;
/** 마지막 비행이 내려앉고 배너까지의 여유(우노: 낼 카드 350ms 비행 + 100ms = 450ms). */
export const FINALE_GAP_MS = 100;

const empty = (): OldMaidPlan => ({ flights: [], sounds: [] });

/** 이벤트 하나를 계획에 더하고 다음 비행 시작 시각을 돌려준다. */
function add(plan: OldMaidPlan, event: OldMaidEvent, clock: number, from: OldMaidView, meId: number): number {
  const actor = event.actorId;
  const target = event.targetId;
  if (event.type === 'DRAW' && actor !== null && target !== null) {
    // 뽑히는 사람 본인은 가운데 부채 대신 자기 손패에서 카드가 나간다.
    const source: OldMaidZone = target === meId ? `hand:${meId}` : 'target';
    plan.flights.push({ card: null, from: source, to: `hand:${actor}`, delay: clock, duration: DRAW_MS, flip: false });
    plan.sounds.push({ name: 'draw', delay: clock });
    return clock + DRAW_MS;
  }
  if (event.type === 'PAIR' && actor !== null) {
    event.cards.forEach((card, index) => plan.flights.push({ card, from: `hand:${actor}`, to: 'discard', delay: clock + index * PAIR_GAP_MS, duration: PAIR_MS, flip: false }));
    plan.sounds.push({ name: 'place', delay: clock });
    return clock + PAIR_MS + PAIR_GAP_MS;
  }
  if (event.type === 'FORFEIT' && actor !== null && target !== null) {
    const shown = Math.min(event.count ?? 0, MAX_TRANSFER_FLIGHTS);
    for (let index = 0; index < shown; index += 1) {
      plan.flights.push({ card: null, from: `hand:${actor}`, to: `hand:${target}`, delay: clock + index * TRANSFER_GAP_MS, duration: TRANSFER_MS, flip: false });
    }
    if (shown === 0) {
      return clock;
    }
    plan.sounds.push({ name: 'draw', delay: clock });
    return clock + (shown - 1) * TRANSFER_GAP_MS + TRANSFER_MS;
  }
  // 섞기 소리는 내가 섞었거나 지금 뽑히는 사람이 섞었을 때만(모두가 1초마다 섞어도 시끄럽지 않게).
  if (event.type === 'SHUFFLE' && actor !== null && (actor === meId || actor === from.targetId)) {
    plan.sounds.push({ name: 'draw', delay: clock });
  }
  return clock;
}

/** 새 이벤트(seq가 이전 화면보다 큰 것)만 보고 카드 비행과 소리를 순서대로 잡는다(스펙 6.8·6.9). */
export function planOldMaidMotion(from: OldMaidView | null, to: OldMaidView, meId: number): OldMaidPlan {
  if (!from || from.startedAt !== to.startedAt) {
    return empty();
  }
  const lastSeq = latestSeq(from.events);
  const plan = empty();
  to.events
    .filter((event) => event.seq > lastSeq)
    .reduce((clock, event) => add(plan, event, clock, from, meId), 0);
  return plan;
}

/** "게임 끝!" 배너까지 기다리는 시간. 마지막 비행(뽑기+짝 버리기 약 710ms)이 내려앉은 뒤, 짧으면 공통 450ms. */
export function finaleDelayMs(from: OldMaidView | null, to: OldMaidView, meId: number): number {
  const landed = planOldMaidMotion(from, to, meId).flights
    .reduce((end, flight) => Math.max(end, flight.delay + flight.duration), 0);
  return Math.max(FINALE_DELAY_MS, landed + FINALE_GAP_MS);
}
