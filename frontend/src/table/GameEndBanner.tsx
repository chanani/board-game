import { StageCallout } from '../components/StageCallout';

/**
 * 결과 창 전에 화면 가운데 크게 떴다 사라지는 "게임 끝!" 알림. 게임 시작 3-2-1 카운트다운과 같은 모습이다.
 * 보이는 시간은 마무리 연출(BANNER_MS)이 정하고, 그 뒤에 결과 창이 열린다. 아랫줄은 게임마다 다르다(점수가 없는 도둑잡기는 순위).
 */
export function GameEndBanner({ subtitle = '점수를 계산하고 있어요' }: { subtitle?: string }) {
  return (
    <StageCallout testId="game-end-banner" label={`게임 끝! ${subtitle}`} shoutKey="game-end" shout="게임 끝!"
      below={subtitle} size="text" />
  );
}
