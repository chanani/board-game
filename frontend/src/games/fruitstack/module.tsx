import type { FruitStackSessionView } from '../../api/types';
import type { GameModule, RuleSlideBase } from '../gameModule';
import { FruitIcon } from './FruitIcon';
import { FruitStackBoxArt } from './FruitStackBoxArt';
import { FruitStackTable } from './FruitStackTable';
import { FRUIT_RULE_SLIDES, FRUIT_RULE_SUMMARY, type FruitRuleSlide } from './rules';

function renderArt(slide: RuleSlideBase) {
  return (slide as FruitRuleSlide).fruits.map((level, index) => <FruitIcon key={`${level}-${index}`} level={level} size={44} />);
}

export const fruitStackModule: GameModule<FruitStackSessionView> = {
  gameType: 'FRUIT_STACK',
  name: '수박게임',
  slug: 'fruit-stack',
  tagline: '2~5인 · 합쳐서 점수를 쌓아라!',
  // 혼자 하기(스펙 12장): 1명이면 혼자, 2~5명이면 대결.
  minPlayers: 1,
  maxPlayers: 5,
  // R35·R36: 물리가 브라우저에서 돌아 컴퓨터가 대신 둘 수 없다.
  supportsBots: false,
  Table: FruitStackTable,
  ownsPhoneChrome: true,
  // 이 게임은 진행 기록을 보이지 않는다(판이 화면을 다 쓴다). 탈락·결과는 판과 결과 창이 알린다.
  describeChanges: () => [],
  isGameOver: (view) => view.game.status === 'GAME_OVER',
  wasParticipant: (view, meId) => view.game.participantIds.includes(meId),
  // R29: 탈락한 사람은 나가도 기권이 아니고 탈락 때의 점수로 겨룬다.
  leavesWithoutForfeit: ({ game }, memberId) => game.players.some((player) => player.playerId === memberId && player.state === 'OUT'),
  gameOverKey: (code, view) => `${code}:FRUIT_STACK:${view.game.startedAt}`,
  // 이 게임의 행동(SCORE·OUT)은 훅이 보내는 보고라 거절은 모두 조용한 코드다. 걸음은 경기 하나다.
  stepKey: ({ game }) => `${game.status}:${game.startedAt}`,
  rules: { title: '수박게임 규칙', summary: FRUIT_RULE_SUMMARY, slides: FRUIT_RULE_SLIDES, renderArt },
  BoxArt: FruitStackBoxArt,
  averageScoreLabel: '평균 점수',
};
