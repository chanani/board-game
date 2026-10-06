import type { UnoCard, UnoView } from '../../../api/types';
import type { SoundName } from '../../../lib/sound';

export type UnoZone = 'draw' | 'discard' | `hand:${number}`;
export type UnoFlight = { card: UnoCard | null; from: UnoZone; to: UnoZone; delay: number; duration: number; flip: boolean };
export type UnoMotionPlan = { flights: UnoFlight[]; sounds: { name: SoundName; delay: number }[] };

export const PLAY_MS = 350;
export const DRAW_MS = 250;
export const DRAW_GAP_MS = 80;
export const MAX_FLIGHTS = 6;
export const DRAW_SOUND_GAP_MS = 120;
export const MAX_DRAW_SOUNDS = 4;

const EMPTY: UnoMotionPlan = { flights: [], sounds: [] };

/** 새 이벤트(seq가 이전 화면보다 큰 것)만 보고 카드 비행과 소리를 순서대로 잡는다(스펙 6.8·6.9). */
export function planUnoMotion(from: UnoView | null, to: UnoView, meId: number): UnoMotionPlan {
  if (!from || from.startedAt !== to.startedAt) {
    return EMPTY;
  }
  const lastSeq = from.events.reduce((max, event) => Math.max(max, event.seq), 0);
  const plan: UnoMotionPlan = { flights: [], sounds: [] };
  let clock = 0;
  to.events.filter((event) => event.seq > lastSeq).forEach((event) => {
    if (event.type === 'PLAY' && event.actorId !== null && event.card) {
      plan.flights.push({ card: event.card, from: `hand:${event.actorId}`, to: 'discard', delay: clock, duration: PLAY_MS, flip: event.actorId !== meId });
      plan.sounds.push({ name: 'place', delay: clock });
      clock += PLAY_MS;
      return;
    }
    const count = event.type === 'DRAW' ? 1 : event.type === 'PENALTY' ? event.count ?? 0 : 0;
    const target = event.type === 'DRAW' ? event.actorId : event.targetId;
    if (count > 0 && target !== null) {
      const shown = Math.min(count, MAX_FLIGHTS);
      for (let index = 0; index < shown; index += 1) {
        plan.flights.push({ card: null, from: 'draw', to: `hand:${target}`, delay: clock + index * DRAW_GAP_MS, duration: DRAW_MS, flip: false });
      }
      for (let index = 0; index < Math.min(count, MAX_DRAW_SOUNDS); index += 1) {
        plan.sounds.push({ name: 'draw', delay: clock + index * DRAW_SOUND_GAP_MS });
      }
      clock += (shown - 1) * DRAW_GAP_MS + DRAW_MS;
      return;
    }
    if (event.type === 'UNO_CALL' || event.type === 'UNO_CAUGHT') {
      plan.sounds.push({ name: 'uno', delay: clock });
    }
  });
  return plan;
}
