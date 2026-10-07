import type { OldMaidEvent, OldMaidSessionView, OldMaidView } from '../../api/types';
import type { LogDraft } from '../../lib/eventLog';
import { rankLabel } from './cards';

type Nickname = (memberId: number) => string;

/** 기록 중 가장 큰 seq(없으면 0). 진행 기록·움직임·섞기 효과가 "새 기록"을 가르는 기준. */
export function latestSeq(events: OldMaidEvent[]): number {
  return events.reduce((max, event) => Math.max(max, event.seq), 0);
}

function gameEndLine(event: OldMaidEvent, name: string, actor: number): LogDraft {
  // 혼자 남은 1등(모두 기권)은 도둑이 아니다(D9).
  if (event.count === 1) {
    return { kind: 'result', actorId: actor, text: `모두 나가서 ${name}님이 1등이에요` };
  }
  return { kind: 'thief', actorId: actor, text: `${name}님이 도둑이에요!` };
}

export function describeOldMaidEvent(event: OldMaidEvent, nicknameOf: Nickname): LogDraft[] {
  const actor = event.actorId ?? 0;
  const name = nicknameOf(actor);
  const target = nicknameOf(event.targetId ?? 0);
  switch (event.type) {
    case 'START':
      return [{ kind: 'start', actorId: actor, text: `${name}님부터 ${target}님의 카드를 뽑아요` }];
    case 'DEAL_PAIRS':
      return (event.count ?? 0) > 0 ? [{ kind: 'pair', actorId: actor, text: `${name}님이 처음 짝 ${event.count}쌍을 버렸어요` }] : [];
    case 'DRAW':
      return [{ kind: 'draw-deck', actorId: actor, text: `${name}님이 ${target}님의 카드를 1장 뽑았어요` }];
    case 'PAIR':
      return event.cards.length > 0 ? [{ kind: 'pair', actorId: actor, text: `${name}님이 ${rankLabel(event.cards[0])} 짝을 버렸어요` }] : [];
    case 'FINISH':
      return [{ kind: 'finish', actorId: actor, text: `${name}님이 ${event.count}등으로 끝냈어요!` }];
    case 'SHUFFLE':
      return [{ kind: 'shuffle', actorId: actor, text: `${name}님이 손패를 섞었어요` }];
    case 'FORFEIT':
      return event.targetId === null ? [] : [{ kind: 'leave', actorId: actor, text: `${name}님의 카드 ${event.count}장이 ${target}님에게 넘어갔어요` }];
    case 'GAME_END':
      return [gameEndLine(event, name, actor)];
    default:
      return [];
  }
}

// 시간 초과 자동 뽑기 자체는 "시간이 지나…" 한 줄로 대신한다. 뒤따른 짝·끝냄은 쓴다.
function linesOf(events: OldMaidEvent[], nicknameOf: Nickname): LogDraft[] {
  return events
    .filter((event) => !(event.auto && event.type === 'DRAW'))
    .flatMap((event) => describeOldMaidEvent(event, nicknameOf));
}

function timeouts(prev: OldMaidView, next: OldMaidView, nicknameOf: Nickname): LogDraft[] {
  if (next.autoActSeq <= prev.autoActSeq) {
    return [];
  }
  return next.lastAutoActorIds.map((actorId) => ({ kind: 'timeout', actorId, text: `시간이 지나 ${nicknameOf(actorId)}님 대신 카드를 뽑았어요` }));
}

export function describeOldMaid(prev: OldMaidSessionView | null, next: OldMaidSessionView, nicknameOf: Nickname): LogDraft[] {
  if (!prev) {
    // 방에서 처음 받은 화면: 막 시작한 게임(START 있음)만 쓰고, 다시 연결로 받은 중간 화면은 반복하지 않는다.
    return next.game.events.some((event) => event.type === 'START') ? linesOf(next.game.events, nicknameOf) : [];
  }
  const before = prev.game;
  const after = next.game;
  if (before.startedAt !== after.startedAt) {
    return [{ kind: 'other', text: '새 게임을 시작해요' }, ...linesOf(after.events, nicknameOf)];
  }
  const lastSeq = latestSeq(before.events);
  const fresh = after.events.filter((event) => event.seq > lastSeq);
  return [...linesOf(fresh, nicknameOf), ...timeouts(before, after, nicknameOf)];
}
