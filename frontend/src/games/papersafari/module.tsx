import type { PaperSafariSessionView } from '../../api/types';
import { gameOverKey } from '../../lib/dismissals';
import type { GameModule, RuleSlideBase } from '../gameModule';
import { PaperSafariBoxArt } from '../PaperSafariBoxArt';
import { CardFace } from './CardFace';
import { describePaperSafari } from './describe';
import { PaperSafariTable } from './PaperSafariTable';
import { RULE_SLIDES, RULE_SUMMARY, type RuleSlide } from './rules';

function renderArt(slide: RuleSlideBase) {
  return (slide as RuleSlide).cards.map((card, index) => <CardFace key={index} card={card} faceUp known size="md" />);
}

export const paperSafariModule: GameModule<PaperSafariSessionView> = {
  gameType: 'PAPER_SAFARI',
  name: '페이퍼 사파리',
  slug: 'paper-safari',
  tagline: '2~5인 · 낮은 점수를 노려라!',
  minPlayers: 2,
  maxPlayers: 5,
  Table: PaperSafariTable,
  describeChanges: (prev, next, nicknameOf) => describePaperSafari(prev?.game ?? null, next.game, nicknameOf),
  isGameOver: (view) => view.game.status === 'GAME_OVER',
  wasParticipant: (view, meId) => view.game.round.boards.some((board) => board.playerId === meId),
  gameOverKey: (code, view) => gameOverKey(code, view.game),
  rules: { title: '페이퍼 사파리 규칙', summary: RULE_SUMMARY, slides: RULE_SLIDES, renderArt },
  BoxArt: PaperSafariBoxArt,
  averageScoreLabel: '평균 점수',
};
