import type { PlayingCard } from '../../api/types';
import type { RuleSlideBase } from '../gameModule';
import { JOKER_CARD, playingCard } from './cards';

export type OldMaidRuleSlide = RuleSlideBase & { cards: PlayingCard[]; backs?: number };

export const OLD_MAID_RULE_SLIDES: OldMaidRuleSlide[] = [
  { title: '목표', body: ['같은 숫자 카드 두 장을 짝지어 버려요.', '손패를 먼저 비울수록 높은 등수예요. 조커를 마지막까지 쥔 사람이 도둑이에요.'],
    cards: [playingCard('SPADES', 'ACE'), playingCard('HEARTS', 'ACE'), JOKER_CARD] },
  { title: '카드', body: ['트럼프 52장에 조커 1장을 더해 53장을 써요.', '무늬와 색은 상관없이 숫자(랭크)만 같으면 짝이에요.'],
    cards: [playingCard('HEARTS', 'SEVEN'), playingCard('CLUBS', 'SEVEN')] },
  { title: '준비', body: ['카드를 모두 한 장씩 나눠 줘요.', '받자마자 짝은 자동으로 버려요. 같은 숫자가 3장이면 2장만 버려요.'],
    cards: [], backs: 3 },
  { title: '내 차례', body: ['왼쪽 사람(다음 차례 사람)의 뒷면 카드 중 1장을 골라 가져와요.', '카드에 마우스를 올리거나 한 번 누르면 모두에게 그 카드가 살짝 들려 보여요.'],
    cards: [], backs: 3 },
  { title: '짝 버리기', body: ['가져온 카드가 내 카드와 짝이면 바로 버려요.', '짝이 없으면 내 손패 어딘가에 들어가요.'],
    cards: [playingCard('SPADES', 'QUEEN'), playingCard('DIAMONDS', 'QUEEN')] },
  { title: '섞기', body: ["내 차례가 아닐 때 '섞기'로 손패 순서를 바꿀 수 있어요.", '남은 섞는 모습만 보고, 카드는 볼 수 없어요.'],
    cards: [] },
  { title: '끝', body: ['손패를 다 비우면 비운 순서대로 1등, 2등…이에요.', '마지막까지 조커를 쥔 한 사람이 도둑이에요. 1등만 승리로 기록돼요.'],
    cards: [JOKER_CARD] },
  { title: '시간과 기권', body: ['카드를 고를 시간은 15초예요. 지나면 무작위로 1장을 뽑아요.', '게임 중에 나가면 손패가 다음 사람에게 넘어가고 맨 아래 등수가 돼요.'],
    cards: [] },
];

export const OLD_MAID_RULE_SUMMARY = [
  '왼쪽 사람의 카드를 1장씩 뽑아요.',
  '같은 숫자 두 장은 짝지어 버려요.',
  '손패를 먼저 비울수록 높은 등수예요.',
  '조커를 마지막까지 쥐면 도둑이에요.',
];
