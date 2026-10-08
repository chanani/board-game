import { describe, expect, it } from 'vitest';
import { pcSeatPlan } from './pcSeatPlan';

describe('pcSeatPlan', () => {
  it.each([1, 2])('내 자리가 있고 상대가 %i명이면 덱을 내 판 옆에 두는 한 줄 배치에 보통 크기 판을 쓴다', (count) => {
    expect(pcSeatPlan(count, true)).toMatchObject({ arrangement: 'arc', opponent: 'sm', handOverlay: false, lowered: '' });
  });

  it('상대 3명(4인)은 손 카드를 판 위에 겹쳐 폭을 줄이고, 양 끝 자리를 내려 타원 모서리를 피한다', () => {
    expect(pcSeatPlan(3, true)).toMatchObject({ arrangement: 'arc', opponent: 'sm', handOverlay: true, lowered: 'pt-10' });
  });

  it('상대 4명(5인)은 한 줄에 들어가게 판을 한 단계(xs) 줄이고 더 내린다', () => {
    expect(pcSeatPlan(4, true)).toMatchObject({ arrangement: 'arc', opponent: 'xs', handOverlay: true, lowered: 'pt-12' });
  });

  it.each([2, 3, 4, 5])('관전자(내 판 없음)는 상대 %i명이어도 둥근 배치를 쓴다', (count) => {
    expect(pcSeatPlan(count, false)).toMatchObject({ arrangement: 'round', opponent: 'sm', handOverlay: false });
  });
});
