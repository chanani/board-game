import type { UnoEvent, UnoSessionView, UnoStage, UnoView } from '../../api/types';
import type { LogDraft } from '../../lib/eventLog';
import { cardName, COLOR_NAMES, isWild } from './cards';

type Nickname = (memberId: number) => string;

const AUTO_HIDDEN = new Set<UnoEvent['type']>(['DRAW', 'PASS', 'COLOR']);

// 시간 초과 자동 행동 자체(뽑기·넘기기·색·4장 받기)는 "시간이 지나…" 한 줄로 대신한다. 더미 다시 만들기 같은 결과는 쓴다.
function hiddenWhenAuto(event: UnoEvent): boolean {
  if (!event.auto) {
    return false;
  }
  return AUTO_HIDDEN.has(event.type) || (event.type === 'PENALTY' && event.reason === 'WILD_DRAW_FOUR');
}

function passText(event: UnoEvent, name: string): string {
  if (event.reason === 'KEEP') {
    return `${name}님이 뽑은 카드를 갖고 차례를 넘겼어요`;
  }
  if (event.reason === 'NO_PLAYABLE') {
    return `${name}님이 뽑은 카드를 낼 수 없어 차례를 넘겼어요`;
  }
  return `뽑을 카드가 없어 ${name}님의 차례를 넘겼어요`;
}

function playText(event: UnoEvent, name: string): string {
  const card = event.card;
  if (card && isWild(card) && event.color) {
    return `${name}님이 ${cardName(card)} 카드를 내고 ${COLOR_NAMES[event.color]}으로 정했어요`;
  }
  return `${name}님이 ${card ? cardName(card) : ''} 카드를 냈어요`;
}

function penaltyLines(event: UnoEvent, nicknameOf: Nickname): LogDraft[] {
  const target = event.targetId ?? 0;
  if (event.reason === 'DRAW_TWO') {
    return [{ kind: 'draw-deck', actorId: target, text: `${nicknameOf(target)}님이 2장을 뽑고 차례를 건너뛰어요` }];
  }
  if (event.reason === 'WILD_DRAW_FOUR') {
    return [{ kind: 'draw-deck', actorId: target, text: `${nicknameOf(target)}님이 4장을 받고 차례를 건너뛰어요` }];
  }
  return [];
}

function challengeLine(event: UnoEvent, nicknameOf: Nickname): LogDraft {
  const challenger = event.actorId ?? 0;
  if (event.reason === 'GUILTY') {
    return { kind: 'challenge', actorId: challenger, text: `${nicknameOf(challenger)}님이 도전에 성공했어요! ${nicknameOf(event.targetId ?? 0)}님이 4장을 뽑아요` };
  }
  return { kind: 'challenge', actorId: challenger, text: `${nicknameOf(challenger)}님이 도전에 실패해 6장을 뽑고 차례를 건너뛰어요` };
}

function gameEndLine(event: UnoEvent, nicknameOf: Nickname): LogDraft {
  const winner = event.actorId ?? 0;
  const points = event.count === null ? '' : ` (${event.count}점)`;
  return { kind: 'result', actorId: winner, text: `${nicknameOf(winner)}님이 게임에서 승리했어요!${points}` };
}

export function describeUnoEvent(event: UnoEvent, nicknameOf: Nickname): LogDraft[] {
  const actor = event.actorId ?? 0;
  const name = nicknameOf(actor);
  const target = event.targetId ?? 0;
  switch (event.type) {
    case 'START':
      return [{ kind: 'start', actorId: actor, text: `${name}님부터 시작해요 · 첫 카드: ${event.card ? cardName(event.card) : ''}` }];
    case 'FIRST_CARD_REDRAWN':
      return [{ kind: 'other', text: '첫 카드가 와일드 +4라 다시 뒤집었어요' }];
    case 'PLAY':
      return [{ kind: 'play', actorId: actor, text: playText(event, name) }];
    case 'COLOR':
      return [{ kind: 'color', actorId: actor, text: `${name}님이 ${event.color ? COLOR_NAMES[event.color] : ''}으로 정했어요` }];
    case 'DRAW':
      return [{ kind: 'draw-deck', actorId: actor, text: `${name}님이 카드를 1장 뽑았어요` }];
    case 'PASS':
      return [{ kind: 'other', actorId: actor, text: passText(event, name) }];
    case 'SKIP':
      return [{ kind: 'skip', actorId: target, text: `${nicknameOf(target)}님의 차례를 건너뛰어요` }];
    case 'REVERSE':
      return [{ kind: 'reverse', text: '진행 방향이 바뀌었어요' }];
    case 'PENALTY':
      return penaltyLines(event, nicknameOf);
    case 'CHALLENGE':
      return [challengeLine(event, nicknameOf)];
    case 'UNO_CALL':
      return [{ kind: 'uno', actorId: actor, text: `${name}님이 우노를 외쳤어요!` }];
    case 'UNO_CAUGHT':
      return [{ kind: 'catch', actorId: actor, text: `${name}님이 ${nicknameOf(target)}님의 우노를 잡았어요! ${nicknameOf(target)}님이 2장을 뽑아요` }];
    case 'RESHUFFLE':
      return [{ kind: 'reshuffle', text: '버린 카드를 섞어 뽑을 더미를 다시 만들었어요' }];
    case 'GAME_END':
      return [gameEndLine(event, nicknameOf)];
    default:
      return [];
  }
}

function linesOf(events: UnoEvent[], nicknameOf: Nickname): LogDraft[] {
  return events.filter((event) => !hiddenWhenAuto(event)).flatMap((event) => describeUnoEvent(event, nicknameOf));
}

function autoColorName(view: UnoView): string {
  const chosen = view.events.find((event) => event.type === 'COLOR')?.color ?? view.currentColor ?? 'RED';
  return COLOR_NAMES[chosen];
}

const AUTO_TEXT: Record<UnoStage, (name: string, view: UnoView) => string> = {
  PLAY: (name) => `시간이 지나 ${name}님 대신 카드를 1장 뽑고 차례를 넘겼어요`,
  DRAWN: (name) => `시간이 지나 ${name}님 대신 뽑은 카드를 갖고 차례를 넘겼어요`,
  CHOOSE_COLOR: (name, view) => `시간이 지나 ${name}님 대신 ${autoColorName(view)}을 골랐어요`,
  CHALLENGE: (name) => `시간이 지나 ${name}님 대신 도전하지 않고 4장을 받았어요`,
};

/** autoActSeq가 늘었을 때만, 직전 화면의 단계 기준으로 한 줄. */
function timeouts(prev: UnoView, next: UnoView, nicknameOf: Nickname): LogDraft[] {
  if (next.autoActSeq <= prev.autoActSeq || prev.stage === null) {
    return [];
  }
  const text = AUTO_TEXT[prev.stage];
  return next.lastAutoActorIds.map((actorId) => ({ kind: 'timeout', actorId, text: text(nicknameOf(actorId), next) }));
}

export function describeUno(prev: UnoSessionView | null, next: UnoSessionView, nicknameOf: Nickname): LogDraft[] {
  if (!prev) {
    return [];
  }
  const before = prev.game;
  const after = next.game;
  if (before.startedAt !== after.startedAt) {
    return [{ kind: 'other', text: '새 게임을 시작해요' }, ...linesOf(after.events, nicknameOf)];
  }
  const lastSeq = before.events.reduce((max, event) => Math.max(max, event.seq), 0);
  const fresh = after.events.filter((event) => event.seq > lastSeq);
  return [...linesOf(fresh, nicknameOf), ...timeouts(before, after, nicknameOf)];
}
