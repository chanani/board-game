import type { UnoCard, UnoCardKind, UnoColor } from '../../api/types';
import type { RuleSlideBase } from '../gameModule';

export type UnoRuleSlide = RuleSlideBase & { cards: UnoCard[]; backs?: number };

let nextId = 900;
const card = (kind: UnoCardKind, color: UnoColor | null = null, number: number | null = null): UnoCard => ({ id: nextId++, kind, color, number });

export const UNO_RULE_SLIDES: UnoRuleSlide[] = [
  { title: '목표', body: ['손에 든 카드를 가장 먼저 모두 내면 이겨요.', '한 판으로 승부가 나요.'],
    cards: [card('NUMBER', 'RED', 1), card('NUMBER', 'YELLOW', 2), card('NUMBER', 'GREEN', 3)] },
  { title: '준비', body: ['각자 카드 7장을 받아요.', '더미에서 1장을 뒤집어 시작 카드로 놓아요. 시작 카드가 기능 카드면 그 효과부터 적용해요.'],
    cards: [], backs: 3 },
  { title: '내 차례', body: ['맨 위 카드와 색·숫자·기호 중 하나가 같은 카드 1장을 내요.', '와일드는 언제든 낼 수 있어요.'],
    cards: [card('NUMBER', 'BLUE', 5), card('NUMBER', 'BLUE', 8), card('NUMBER', 'RED', 8)] },
  { title: '카드 뽑기', body: [
    '낼 카드가 없거나 내고 싶지 않으면 1장을 뽑아요.',
    '뽑은 카드를 낼 수 있으면 바로 낼 수 있어요. 아니면 차례가 넘어가요.',
    '한 번에 1장만 내요. +2 위에 +2를 겹쳐 낼 수 없어요.',
  ], cards: [] },
  { title: '기능 카드', body: [
    '건너뛰기: 다음 사람은 차례를 쉬어요.',
    '방향 바꾸기: 도는 방향이 반대가 돼요. 둘이서 할 때는 건너뛰기와 같아요.',
    '+2: 다음 사람은 2장을 뽑고 차례를 쉬어요.',
  ], cards: [card('SKIP', 'RED'), card('REVERSE', 'YELLOW'), card('DRAW_TWO', 'GREEN')] },
  { title: '와일드', body: [
    '와일드: 낼 때 다음 색을 골라요.',
    '와일드 +4: 색을 고르고, 다음 사람은 4장을 뽑고 차례를 쉬어요.',
    '와일드 +4는 지금 색과 같은 색 카드가 없을 때만 낼 수 있어요.',
  ], cards: [card('WILD'), card('WILD_DRAW_FOUR')] },
  { title: '도전', body: [
    '와일드 +4를 받은 사람은 도전할 수 있어요.',
    '판정 기준은 낸 사람이 고른 색이 아니라 +4를 내기 직전의 색이에요.',
    '낸 사람이 직전 색 카드를 갖고 있었다면 도전 성공: 낸 사람이 4장을 뽑아요.',
    '없었다면 정당한 +4라 도전 실패: 도전한 사람이 6장을 뽑고 차례를 쉬어요.',
  ], cards: [] },
  { title: '우노!', body: [
    "카드가 2장일 때 1장을 내기 전에 '우노!' 버튼을 눌러요.",
    "안 누르고 1장이 되면, 다음 사람이 행동하기 전에 다른 사람이 '우노 안 외쳤어요!'로 잡을 수 있어요. 잡히면 2장을 뽑아요.",
  ], cards: [] },
  { title: '점수', body: [
    '이긴 사람은 다른 사람들이 남긴 카드 점수를 모두 얻어요.',
    '숫자 카드는 숫자만큼, 건너뛰기·방향 바꾸기·+2는 20점, 와일드는 50점이에요.',
  ], cards: [] },
  { title: '시간', body: [
    '결정마다 15초가 있어요.',
    '시간이 지나면 대신 1장을 뽑고 넘기거나, 뽑은 카드를 갖고 넘기거나, 가장 많은 색을 고르거나, 도전 없이 4장을 받아요.',
  ], cards: [] },
];

export const UNO_RULE_SUMMARY: string[] = [
  '같은 색·숫자·기호의 카드를 1장씩 내요.',
  '낼 카드가 없으면 1장을 뽑아요.',
  "2장일 때 '우노!'를 누르고 내요.",
  '손패를 먼저 비우면 이겨요.',
];
