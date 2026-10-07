import { describe, expect, it } from 'vitest';
import { describeOldMaid } from './describe';
import { card, JOKER, oldMaidEvent, oldMaidSession } from './oldMaidFixtures';

const names: Record<number, string> = { 1: '앨리스', 2: '밥', 3: '캐롤' };
const nicknameOf = (id: number) => names[id] ?? '떠난 플레이어';
const texts = (lines: { text: string }[]) => lines.map((line) => line.text);

describe('describeOldMaid', () => {
  it('처음 받은 화면은 시작 화면일 때만 쓰고 짝 0쌍은 쓰지 않는다', () => {
    const start = oldMaidSession({ events: [
      oldMaidEvent(1, 'START', { actorId: 1, targetId: 2 }),
      oldMaidEvent(2, 'DEAL_PAIRS', { actorId: 1, count: 3 }),
      oldMaidEvent(3, 'DEAL_PAIRS', { actorId: 2, count: 0 }),
    ] });

    expect(texts(describeOldMaid(null, start, nicknameOf))).toEqual(['앨리스님부터 밥님의 카드를 뽑아요', '앨리스님이 처음 짝 3쌍을 버렸어요']);
    expect(describeOldMaid(null, oldMaidSession({ events: [oldMaidEvent(9, 'DRAW', { actorId: 1, targetId: 2 })] }), nicknameOf)).toEqual([]);
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
    expect(texts(lines)).toEqual(['앨리스님이 A 짝을 버렸어요', '시간이 지나 앨리스님 대신 카드를 뽑았어요']);
    expect(lines[1].kind).toBe('timeout');
  });

  it('새 게임이면 알리고 새 게임 줄을 쓴다', () => {
    const prev = oldMaidSession({ startedAt: 1, events: [oldMaidEvent(40, 'GAME_END', { actorId: 2, count: 3, reason: 'NORMAL' })] });
    const next = oldMaidSession({ startedAt: 2, events: [oldMaidEvent(1, 'START', { actorId: 3, targetId: 1 })] });

    expect(texts(describeOldMaid(prev, next, nicknameOf))).toEqual(['새 게임을 시작해요', '캐롤님부터 앨리스님의 카드를 뽑아요']);
    expect(JOKER.id).toBe(52);
  });
});
