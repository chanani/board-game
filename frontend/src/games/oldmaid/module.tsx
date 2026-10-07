import type { OldMaidSessionView } from '../../api/types';
import type { GameModule, RuleSlideBase } from '../gameModule';
import { describeOldMaid } from './describe';
import { OldMaidBoxArt } from './OldMaidBoxArt';
import { OldMaidTable } from './OldMaidTable';
import { PlayingCardFace } from './PlayingCardFace';
import { isStaleDiscard } from './staleDiscard';
import { OLD_MAID_RULE_SLIDES, OLD_MAID_RULE_SUMMARY, type OldMaidRuleSlide } from './rules';

function renderArt(slide: RuleSlideBase) {
  const { cards, backs = 0 } = slide as OldMaidRuleSlide;
  return [
    ...cards.map((card) => <PlayingCardFace key={card.id} card={card} width={64} />),
    ...Array.from({ length: backs }, (_, index) => <PlayingCardFace key={`back-${index}`} card={null} width={64} />),
  ];
}

export const oldMaidModule: GameModule<OldMaidSessionView> = {
  gameType: 'OLD_MAID',
  name: '도둑잡기',
  slug: 'old-maid',
  tagline: '2~6인 · 조커를 피해라!',
  minPlayers: 2,
  maxPlayers: 6,
  Table: OldMaidTable,
  describeChanges: describeOldMaid,
  isGameOver: (view) => view.game.status === 'GAME_OVER',
  wasParticipant: (view, meId) => view.game.participantIds.includes(meId),
  // 서버가 경기 id를 주지 않으므로 방 코드 + 시작 시각(우노 D26과 같다).
  gameOverKey: (code, view) => `${code}:OLD_MAID:${view.game.startedAt}`,
  rules: { title: '도둑잡기 규칙', summary: OLD_MAID_RULE_SUMMARY, slides: OLD_MAID_RULE_SLIDES, renderArt },
  BoxArt: OldMaidBoxArt,
  // D10: 라운드 점수 = 등수.
  averageScoreLabel: '평균 순위',
  roundScoreText: (score) => `${score}등`,
  isStaleRejection: isStaleDiscard,
};
