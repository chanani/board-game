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
/** 한 화면에 짝이 3쌍 이상 버려지면(처음 버리기 마감 자동 버림, 기권 손패 넘겨받기) 짝마다 이 간격으로 겹쳐 날려 오래 끌지 않는다. */
export const FAST_PAIR_STEP_MS = 120;
const FAST_PAIRS_FROM = 3;
/** 마지막 비행이 내려앉고 배너까지의 여유(우노: 낼 카드 350ms 비행 + 100ms = 450ms). */
export const FINALE_GAP_MS = 100;

const empty = (): OldMaidPlan => ({ flights: [], sounds: [] });

/**
 * 내가 뽑은 카드(내 화면에만 있는 정보): 새 손패에 새로 생긴 카드, 곧바로 짝이 되어 손패에 없으면 내 짝 중 원래 손패에 없던 카드.
 * 남이 뽑은 카드는 알 수 없으므로(숨김 정보) 여기서 찾지 않는다.
 */
function drawnByMe(from: OldMaidView, to: OldMaidView, fresh: OldMaidEvent[], meId: number): PlayingCard | null {
  if (!from.hand || !to.hand) {
    return null;
  }
  const before = new Set(from.hand.map((one) => one.id));
  const added = to.hand.find((one) => !before.has(one.id));
  if (added) {
    return added;
  }
  const paired = fresh.find((event) => event.type === 'PAIR' && event.actorId === meId);
  return paired?.cards.find((one) => !before.has(one.id)) ?? null;
}

type Context = { from: OldMaidView; meId: number; drawn: PlayingCard | null; fastPairs: boolean };

/** 짝 한 쌍: 두 장이 손패/자리에서 버린 더미로 앞면으로. 짝이 많으면 겹쳐 날리고 소리는 첫 짝에서만. */
function addPair(plan: OldMaidPlan, event: OldMaidEvent, actor: number, clock: number, fast: boolean): number {
  event.cards.forEach((card, index) => plan.flights.push({ card, from: `hand:${actor}`, to: 'discard', delay: clock + index * PAIR_GAP_MS, duration: PAIR_MS, flip: false }));
  if (!fast || !plan.sounds.some((sound) => sound.name === 'place')) {
    plan.sounds.push({ name: 'place', delay: clock });
  }
  return clock + (fast ? FAST_PAIR_STEP_MS : PAIR_MS + PAIR_GAP_MS);
}

/** 이벤트 하나를 계획에 더하고 다음 비행 시작 시각을 돌려준다. */
function add(plan: OldMaidPlan, event: OldMaidEvent, clock: number, { from, meId, drawn, fastPairs }: Context): number {
  const actor = event.actorId;
  const target = event.targetId;
  if (event.type === 'DRAW' && actor !== null && target !== null) {
    // 뽑히는 사람 본인은 가운데 부채 대신 자기 손패에서 카드가 나간다.
    const source: OldMaidZone = target === meId ? `hand:${meId}` : 'target';
    // 내가 뽑으면 날아오며 뒷면에서 앞면으로 뒤집혀 내 손패에 앞면으로 들어온다. 남이 뽑는 카드는 끝까지 뒷면(숨김 정보).
    const face = actor === meId ? drawn : null;
    plan.flights.push({ card: face, from: source, to: `hand:${actor}`, delay: clock, duration: DRAW_MS, flip: face !== null });
    plan.sounds.push({ name: 'draw', delay: clock });
    return clock + DRAW_MS;
  }
  if (event.type === 'PAIR' && actor !== null) {
    return addPair(plan, event, actor, clock, fastPairs);
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
  const fresh = to.events.filter((event) => event.seq > lastSeq);
  const context: Context = { from, meId, drawn: drawnByMe(from, to, fresh, meId), fastPairs: fresh.filter((event) => event.type === 'PAIR').length >= FAST_PAIRS_FROM };
  fresh.reduce((clock, event) => add(plan, event, clock, context), 0);
  return plan;
}

/** "게임 끝!" 배너까지 기다리는 시간. 마지막 비행(뽑기+짝 버리기 약 710ms)이 내려앉은 뒤, 짧으면 공통 450ms. */
export function finaleDelayMs(from: OldMaidView | null, to: OldMaidView, meId: number): number {
  const landed = planOldMaidMotion(from, to, meId).flights
    .reduce((end, flight) => Math.max(end, flight.delay + flight.duration), 0);
  return Math.max(FINALE_DELAY_MS, landed + FINALE_GAP_MS);
}
