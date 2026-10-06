import type { UnoSessionView } from '../../api/types';
import type { GameModule, RuleSlideBase } from '../gameModule';
import { describeUno } from './describe';
import { UNO_RULE_SLIDES, UNO_RULE_SUMMARY, type UnoRuleSlide } from './rules';
import { UnoBoxArt } from './UnoBoxArt';
import { UnoCardFace } from './UnoCardFace';
import { UnoTable } from './UnoTable';

function renderArt(slide: RuleSlideBase) {
  const { cards, backs = 0 } = slide as UnoRuleSlide;
  return [
    ...cards.map((card) => <UnoCardFace key={card.id} card={card} width={64} />),
    ...Array.from({ length: backs }, (_, index) => <UnoCardFace key={`back-${index}`} card={null} width={64} />),
  ];
}

export const unoModule: GameModule<UnoSessionView> = {
  gameType: 'UNO',
  name: '우노',
  slug: 'uno',
  tagline: '2~5인 · 손패를 먼저 비워라!',
  minPlayers: 2,
  maxPlayers: 5,
  Table: UnoTable,
  describeChanges: describeUno,
  isGameOver: (view) => view.game.status === 'GAME_OVER',
  wasParticipant: (view, meId) => view.game.participantIds.includes(meId),
  // D26: 서버가 경기 id를 주지 않으므로 방 코드 + 시작 시각.
  gameOverKey: (code, view) => `${code}:UNO:${view.game.startedAt}`,
  rules: { title: '우노 규칙', summary: UNO_RULE_SUMMARY, slides: UNO_RULE_SLIDES, renderArt },
  BoxArt: UnoBoxArt,
  averageScoreLabel: '평균 획득 점수',
};
