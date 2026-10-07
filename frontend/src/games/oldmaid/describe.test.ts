import { describe, expect, it } from 'vitest';
import { describeOldMaid } from './describe';
import { card, JOKER, oldMaidEvent, oldMaidSession } from './oldMaidFixtures';

const names: Record<number, string> = { 1: '앨리스', 2: '밥', 3: '캐롤' };
const nicknameOf = (id: number) => names[id] ?? '떠난 플레이어';
const texts = (lines: { text: string }[]) => lines.map((line) => line.text);

describe('describeOldMaid', () => {
  it('처음 받은 화면은 막 나눈 화면(DEAL)이나 첫 차례(START)일 때만 쓴다', () => {
    const dealt = oldMaidSession({ stage: 'OPENING_DISCARD', events: [oldMaidEvent(1, 'DEAL', { actorId: 1 })] });
    const noPairs = oldMaidSession({ events: [oldMaidEvent(1, 'DEAL', { actorId: 1 }), oldMaidEvent(2, 'START', { actorId: 1, targetId: 2 })] });

    expect(texts(describeOldMaid(null, dealt, nicknameOf))).toEqual(['카드를 나눠 줬어요. 같은 숫자 두 장을 골라 버리세요']);
    expect(texts(describeOldMaid(null, noPairs, nicknameOf))).toEqual(['카드를 나눠 줬어요. 같은 숫자 두 장을 골라 버리세요', '앨리스님부터 밥님의 카드를 뽑아요']);
    expect(describeOldMaid(null, oldMaidSession({ events: [oldMaidEvent(9, 'DRAW', { actorId: 1, targetId: 2 })] }), nicknameOf)).toEqual([]);
  });

  it('R36 처음 버리기: 사람이 버린 짝은 한 줄씩, 마지막 짝이 버려지면 첫 차례 줄', () => {
    const prev = oldMaidSession({ stage: 'OPENING_DISCARD', events: [oldMaidEvent(1, 'DEAL', { actorId: 1 })] });
    const next = oldMaidSession({ events: [
      oldMaidEvent(2, 'PAIR', { actorId: 3, cards: [card('SPADES', 'SEVEN'), card('HEARTS', 'SEVEN')] }),
      oldMaidEvent(3, 'FINISH', { actorId: 3, count: 1 }),
      oldMaidEvent(4, 'START', { actorId: 1, targetId: 2 }),
    ] });

    expect(texts(describeOldMaid(prev, next, nicknameOf))).toEqual(['캐롤님이 7 짝을 버렸어요', '캐롤님이 1등으로 끝냈어요!', '앨리스님부터 밥님의 카드를 뽑아요']);
  });

  it('R38 처음 버리기 마감의 자동 버림은 사람마다 한 줄로 묶는다', () => {
    const prev = oldMaidSession({ stage: 'OPENING_DISCARD', events: [oldMaidEvent(1, 'DEAL', { actorId: 1 })] });
    const pair = (seq: number, actorId: number, rank: 'TWO' | 'NINE' | 'KING') => oldMaidEvent(seq, 'PAIR', { actorId, auto: true, cards: [card('SPADES', rank), card('HEARTS', rank)] });
    const next = oldMaidSession({ autoActSeq: 1, lastAutoActorIds: [1, 2], events: [
      pair(2, 1, 'TWO'), pair(3, 1, 'NINE'), pair(4, 2, 'KING'),
      oldMaidEvent(5, 'START', { actorId: 1, targetId: 2, auto: true }),
    ] });

    const lines = describeOldMaid(prev, next, nicknameOf);

    expect(texts(lines)).toEqual(['시간이 지나 앨리스님의 짝 2쌍을 자동으로 버렸어요', '시간이 지나 밥님의 K 짝을 자동으로 버렸어요', '앨리스님부터 밥님의 카드를 뽑아요']);
    expect(lines.map((line) => line.kind)).toEqual(['timeout', 'timeout', 'start']);
  });

  it('스펙 6.7 문구', () => {
    const prev = oldMaidSession({ events: [oldMaidEvent(4, 'SHUFFLE', { actorId: 3 })] });
    const next = oldMaidSession({ events: [
      oldMaidEvent(5, 'DRAW', { actorId: 1, targetId: 2, count: 1 }),
      oldMaidEvent(6, 'PAIR', { actorId: 1, cards: [card('SPADES', 'TEN'), card('HEARTS', 'TEN')] }),
      oldMaidEvent(7, 'FINISH', { actorId: 2, count: 1 }),
      oldMaidEvent(8, 'SHUFFLE', { actorId: 3 }),
      oldMaidEvent(9, 'FORFEIT', { actorId: 3, targetId: 1, count: 4 }),
      oldMaidEvent(10, 'GAME_END', { actorId: 1, count: 2, reason: 'NORMAL' }),
    ] });

    const lines = describeOldMaid(prev, next, nicknameOf);

    expect(texts(lines)).toEqual([
      '앨리스님이 밥님의 카드를 1장 뽑았어요',
      '앨리스님이 10 짝을 버렸어요',
      '밥님이 1등으로 끝냈어요!',
      '캐롤님이 손패를 섞었어요',
      '캐롤님의 카드 4장이 앨리스님에게 넘어갔어요',
      '앨리스님이 도둑이에요!',
    ]);
    expect(lines.map((line) => line.kind)).toEqual(['draw-deck', 'pair', 'finish', 'shuffle', 'leave', 'thief']);
  });

  it('모두 나가 혼자 남은 1등은 도둑이라 하지 않는다', () => {
    const prev = oldMaidSession();
    const next = oldMaidSession({ events: [oldMaidEvent(3, 'GAME_END', { actorId: 2, count: 1, reason: 'FORFEIT' })] });

    expect(texts(describeOldMaid(prev, next, nicknameOf))).toEqual(['모두 나가서 밥님이 1등이에요']);
  });

  it('같은 화면이 다시 와도 쓰지 않고, 자동 뽑기는 시간 초과 한 줄로 대신한다', () => {
    const prev = oldMaidSession({ events: [oldMaidEvent(5, 'DRAW', { actorId: 1, targetId: 2 })] });
    expect(describeOldMaid(prev, prev, nicknameOf)).toEqual([]);

    const next = oldMaidSession({
      autoActSeq: 1, lastAutoActorIds: [1],
      events: [
        oldMaidEvent(6, 'DRAW', { actorId: 1, targetId: 2, auto: true }),
        oldMaidEvent(7, 'PAIR', { actorId: 1, cards: [card('SPADES', 'ACE'), card('CLUBS', 'ACE')], auto: true }),
      ],
    });
    const lines = describeOldMaid(prev, next, nicknameOf);
    expect(texts(lines)).toEqual(['시간이 지나 앨리스님 대신 카드를 뽑았어요', '시간이 지나 앨리스님의 A 짝을 자동으로 버렸어요']);
    expect(lines.map((line) => line.kind)).toEqual(['timeout', 'timeout']);
  });

  it('새 게임이면 알리고 새 게임 줄을 쓴다', () => {
    const prev = oldMaidSession({ startedAt: 1, events: [oldMaidEvent(40, 'GAME_END', { actorId: 2, count: 3, reason: 'NORMAL' })] });
    const next = oldMaidSession({ startedAt: 2, events: [oldMaidEvent(1, 'START', { actorId: 3, targetId: 1 })] });

    expect(texts(describeOldMaid(prev, next, nicknameOf))).toEqual(['새 게임을 시작해요', '캐롤님부터 앨리스님의 카드를 뽑아요']);
    expect(JOKER.id).toBe(52);
  });
});
