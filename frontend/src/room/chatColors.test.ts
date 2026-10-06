import { describe, expect, it } from 'vitest';
import { CHAT_TONES, chatOrderOf, toneOf } from './chatColors';

describe('chatColors', () => {
  it('방에 들어온 순서(참가자 다음 관전자)대로 색을 붙이고 다섯 가지를 돌려 쓴다', () => {
    const order = chatOrderOf({ members: [{ id: 10 }, { id: 20 }, { id: 30 }], spectators: [{ id: 40 }, { id: 50 }, { id: 60 }] });
    expect(toneOf(order, 10)).toBe(CHAT_TONES[0]);
    expect(toneOf(order, 20)).toBe(CHAT_TONES[1]);
    expect(toneOf(order, 40)).toBe(CHAT_TONES[3]);
    expect(toneOf(order, 60)).toBe(CHAT_TONES[0]);
  });

  it('방에 없는 사람(이미 나간 사람)은 번호로 정한 색을 쓴다', () => {
    expect(toneOf(new Map(), 7)).toBe(CHAT_TONES[7 % CHAT_TONES.length]);
  });

  it('색은 주황·청록·보라·분홍·파랑 다섯 가지다', () => {
    expect(CHAT_TONES.map((tone) => tone.name)).toEqual(['text-orange-700', 'text-teal-700', 'text-violet-700', 'text-pink-700', 'text-blue-700']);
    expect(CHAT_TONES.map((tone) => tone.bubble)).toEqual(['bg-orange-100', 'bg-teal-100', 'bg-violet-100', 'bg-pink-100', 'bg-blue-100']);
  });
});
