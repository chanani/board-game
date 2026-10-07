import { describe, expect, it } from 'vitest';
import type { UnoEvent, UnoView } from '../../api/types';
import { describeUno } from './describe';
import { num, unoEvent, unoSession, wild } from './unoFixtures';

const nick = (id: number) => ({ 1: '앨리스', 2: '밥', 3: '캐롤' })[id] ?? '떠난 플레이어';
const before = unoSession({ events: [unoEvent(4, 'DRAW', { actorId: 3, count: 1 })] });
const after = (events: UnoEvent[], overrides: Partial<UnoView> = {}) => unoSession({ events, ...overrides });
const texts = (events: UnoEvent[], overrides: Partial<UnoView> = {}) => describeUno(before, after(events, overrides), nick).map((line) => line.text);

describe('describeUno', () => {
  it('처음 받은 화면은 기록하지 않는다', () => {
    expect(describeUno(null, before, nick)).toEqual([]);
  });

  it('첫 화면이 막 시작한 게임이면 START와 첫 카드 효과를 쓴다', () => {
    const first = unoSession({ events: [
      unoEvent(1, 'START', { actorId: 1, card: num('RED', 7, 13) }),
      unoEvent(2, 'SKIP', { targetId: 2 }),
    ] });

    expect(describeUno(null, first, nick).map((line) => line.text)).toEqual(['앨리스님부터 시작해요 · 첫 카드: 빨강 7', '밥님의 차례를 건너뛰어요']);
  });

  it('START 없는 첫 화면(다시 연결)은 기록하지 않는다', () => {
    expect(describeUno(null, unoSession({ events: [unoEvent(9, 'PLAY', { actorId: 1, card: num('RED', 7, 13) })] }), nick)).toEqual([]);
  });

  it('마지막 카드로 +2나 +4를 내면 차례를 건너뛴다고 쓰지 않는다', () => {
    const lines = texts([
      unoEvent(5, 'PLAY', { actorId: 1, card: num('RED', 7, 13) }),
      unoEvent(6, 'SKIP', { targetId: 2 }),
      unoEvent(7, 'PENALTY', { targetId: 2, reason: 'DRAW_TWO', count: 2 }),
      unoEvent(8, 'GAME_END', { actorId: 1, count: 30, reason: 'EMPTY_HAND' }),
    ]);

    expect(lines.some((text) => text.includes('건너뛰어요'))).toBe(false);
    expect(lines).toContain('밥님이 2장을 뽑아요');
  });

  it('같은 이벤트가 다시 와도(동기화) 다시 쓰지 않는다', () => {
    expect(describeUno(before, before, nick)).toEqual([]);
  });

  it('새 게임이면 알리고 첫 카드를 쓴다', () => {
    const ended = unoSession({ status: 'GAME_OVER', startedAt: 1000, events: [unoEvent(40, 'GAME_END', { actorId: 2, count: 30, reason: 'EMPTY_HAND' })] });
    const started = unoSession({ startedAt: 2000, events: [
      unoEvent(1, 'FIRST_CARD_REDRAWN', { card: { id: 104, kind: 'WILD_DRAW_FOUR', color: null, number: null } }),
      unoEvent(2, 'START', { actorId: 1, card: num('RED', 7, 13) }),
    ] });

    const lines = describeUno(ended, started, nick);

    expect(lines.map((line) => line.text)).toEqual(['새 게임을 시작해요', '첫 카드가 와일드 +4라 다시 뒤집었어요', '앨리스님부터 시작해요 · 첫 카드: 빨강 7']);
    expect(lines.map((line) => line.kind)).toEqual(['other', 'other', 'start']);
    expect(lines[2].actorId).toBe(1);
  });

  it('카드를 내고 색을 고른 것을 쓴다', () => {
    expect(texts([unoEvent(5, 'PLAY', { actorId: 1, card: num('RED', 7, 13) })])).toEqual(['앨리스님이 빨강 7 카드를 냈어요']);
    expect(texts([unoEvent(5, 'PLAY', { actorId: 1, card: wild(100), color: 'GREEN' })])).toEqual(['앨리스님이 와일드 카드를 내고 초록으로 정했어요']);
    expect(texts([unoEvent(5, 'COLOR', { actorId: 2, color: 'BLUE' })])).toEqual(['밥님이 파랑으로 정했어요']);
    expect(describeUno(before, after([unoEvent(5, 'PLAY', { actorId: 1, card: num('RED', 7, 13) })]), nick)[0].kind).toBe('play');
  });

  it('뽑기와 넘기기를 이유별로 쓴다', () => {
    expect(texts([unoEvent(5, 'DRAW', { actorId: 2, count: 1 }), unoEvent(6, 'PASS', { actorId: 2, reason: 'NO_PLAYABLE' })]))
      .toEqual(['밥님이 카드를 1장 뽑았어요', '밥님이 뽑은 카드를 낼 수 없어 차례를 넘겼어요']);
    expect(texts([unoEvent(5, 'PASS', { actorId: 2, reason: 'KEEP' })])).toEqual(['밥님이 뽑은 카드를 갖고 차례를 넘겼어요']);
    expect(texts([unoEvent(5, 'PASS', { actorId: 2, reason: 'EMPTY_PILE' })])).toEqual(['뽑을 카드가 없어 밥님의 차례를 넘겼어요']);
  });

  it('건너뛰기·방향 바꾸기·벌칙을 쓴다', () => {
    expect(texts([unoEvent(5, 'SKIP', { targetId: 2 })])).toEqual(['밥님의 차례를 건너뛰어요']);
    expect(texts([unoEvent(5, 'REVERSE', { actorId: 1 })])).toEqual(['진행 방향이 바뀌었어요']);
    expect(texts([unoEvent(5, 'PENALTY', { targetId: 3, count: 2, reason: 'DRAW_TWO' })])).toEqual(['캐롤님이 2장을 뽑고 차례를 건너뛰어요']);
    expect(texts([unoEvent(5, 'PENALTY', { targetId: 3, count: 4, reason: 'WILD_DRAW_FOUR' })])).toEqual(['캐롤님이 4장을 받고 차례를 건너뛰어요']);
  });

  it('도전 결과를 한 줄로 쓰고 도전 벌칙 줄은 쓰지 않는다', () => {
    expect(texts([unoEvent(5, 'CHALLENGE', { actorId: 2, targetId: 1, reason: 'GUILTY', color: 'RED' }), unoEvent(6, 'PENALTY', { targetId: 1, count: 4, reason: 'CHALLENGE_GUILTY' })]))
      .toEqual(['앨리스님이 빨강 카드를 갖고 있었어요 — 도전 성공! 앨리스님이 4장']);
    expect(texts([unoEvent(5, 'CHALLENGE', { actorId: 2, targetId: 1, reason: 'INNOCENT', color: 'RED' }), unoEvent(6, 'PENALTY', { targetId: 2, count: 6, reason: 'CHALLENGE_FAILED' })]))
      .toEqual(['앨리스님에게 빨강 카드가 없었어요 — 정당한 +4, 밥님이 6장']);
  });

  it('우노 외침과 잡힘, 더미 다시 만들기를 쓴다', () => {
    expect(texts([unoEvent(5, 'UNO_CALL', { actorId: 3 })])).toEqual(['캐롤님이 우노를 외쳤어요!']);
    expect(texts([unoEvent(5, 'UNO_CAUGHT', { actorId: 2, targetId: 3 }), unoEvent(6, 'PENALTY', { targetId: 3, count: 2, reason: 'UNO_CAUGHT' })]))
      .toEqual(['밥님이 캐롤님의 우노를 잡았어요! 캐롤님이 2장을 뽑아요']);
    expect(texts([unoEvent(5, 'RESHUFFLE', { count: 40 })])).toEqual(['버린 카드를 섞어 뽑을 더미를 다시 만들었어요']);
  });

  it('게임 끝을 점수와 함께, 기권으로 끝나면 점수 없이 쓴다', () => {
    expect(texts([unoEvent(5, 'GAME_END', { actorId: 1, count: 47, reason: 'EMPTY_HAND' })], { status: 'GAME_OVER' })).toEqual(['앨리스님이 게임에서 승리했어요! (47점)']);
    expect(texts([unoEvent(5, 'GAME_END', { actorId: 1, count: null, reason: 'FORFEIT' })], { status: 'GAME_OVER' })).toEqual(['앨리스님이 게임에서 승리했어요!']);
  });

  it('시간 초과 자동 행동은 따로 쓰지 않고 직전 단계에 맞는 한 줄로 쓴다', () => {
    const auto = { auto: true };
    const playing = unoSession({ stage: 'PLAY', currentPlayerId: 2, events: [unoEvent(4, 'PLAY', { actorId: 1, card: num('RED', 7, 13) })] });
    const timedOut = unoSession({
      currentPlayerId: 3, autoActSeq: 1, lastAutoActorIds: [2],
      events: [unoEvent(5, 'RESHUFFLE', { count: 30, ...auto }), unoEvent(6, 'DRAW', { actorId: 2, count: 1, ...auto }), unoEvent(7, 'PASS', { actorId: 2, reason: 'KEEP', ...auto })],
    });

    const lines = describeUno(playing, timedOut, nick);

    expect(lines.map((line) => line.text)).toEqual(['버린 카드를 섞어 뽑을 더미를 다시 만들었어요', '시간이 지나 밥님 대신 카드를 1장 뽑고 차례를 넘겼어요']);
    expect(lines[1].kind).toBe('timeout');
  });

  it('단계별 시간 초과 문구', () => {
    const at = (stage: UnoView['stage'], events: UnoEvent[]) => describeUno(
      unoSession({ stage, currentPlayerId: 2 }),
      unoSession({ autoActSeq: 1, lastAutoActorIds: [2], events }), nick).map((line) => line.text);

    expect(at('DRAWN', [unoEvent(5, 'PASS', { actorId: 2, reason: 'KEEP', auto: true })])).toEqual(['시간이 지나 밥님 대신 뽑은 카드를 갖고 차례를 넘겼어요']);
    expect(at('CHOOSE_COLOR', [unoEvent(5, 'COLOR', { actorId: 2, color: 'GREEN', auto: true })])).toEqual(['시간이 지나 밥님 대신 초록을 골랐어요']);
    expect(at('CHALLENGE', [unoEvent(5, 'PENALTY', { targetId: 2, count: 4, reason: 'WILD_DRAW_FOUR', auto: true })])).toEqual(['시간이 지나 밥님 대신 도전하지 않고 4장을 받았어요']);
  });
});
