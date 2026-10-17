import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { fruitStackModule } from './module';
import { fruitPlayer, fruitSession, soloSession } from './fruitStackFixtures';
import { FRUIT_RULE_SLIDES, FRUIT_RULE_SUMMARY } from './rules';

describe('수박게임 규칙', () => {
  it('규칙은 7장이고 제목이 순서대로다', () => {
    expect(FRUIT_RULE_SLIDES.map((slide) => slide.title)).toEqual(['목표', '과일', '떨어뜨리기', '탈락', '끝', '혼자 하기', '나가기와 끊김']);
  });

  it('혼자 하기 장은 혼자 시작·시간 제한 없음·최고 점수를 말한다', () => {
    const solo = FRUIT_RULE_SLIDES[5].body.join(' ');
    expect(solo).toContain('혼자 있을 때 시작하면 혼자 해요');
    expect(solo).toContain('시간 제한이 없고');
    expect(solo).toContain('저절로 떨어지지 않아요');
    expect(solo).toContain('최고 점수');
  });

  it('여럿이 할 때만 쓰는 규칙(이기기·10분·기권 패배)은 여럿이 할 때라고 밝힌다', () => {
    expect(FRUIT_RULE_SLIDES[0].body[1]).toContain('여럿이 하면');
    expect(FRUIT_RULE_SLIDES[4].body[0]).toContain('여럿이 하면');
    expect(FRUIT_RULE_SLIDES[6].body[0]).toContain('여럿이 할 때');
  });

  it('본문은 장마다 두 줄이다', () => {
    FRUIT_RULE_SLIDES.forEach((slide) => expect(slide.body).toHaveLength(2));
  });

  it('끝 장은 일찍 끝나는 규칙을 말한다', () => {
    expect(FRUIT_RULE_SLIDES[4].body[0]).toContain('한 사람만 남았을 때 그 사람 점수가 가장 높으면 바로 끝나요');
  });

  it('요약은 5줄이다', () => {
    expect(FRUIT_RULE_SUMMARY).toEqual([
      '같은 과일 두 개를 합쳐 점수를 쌓아요.', '여럿이 하면 10초 안에 떨어뜨려야 해요.',
      '과일이 선을 2초 넘게 넘으면 탈락이에요.', '혼자 하면 시간 제한 없이 최고 점수에 도전해요.', '여럿이 하면 가장 높은 점수가 이겨요.',
    ]);
  });

  it('소개 문구는 혼자부터 다섯 명까지라고 알린다', () => {
    expect(fruitStackModule.tagline).toBe('1~5인 · 합쳐서 점수를 쌓아라!');
    expect(fruitStackModule.minPlayers).toBe(1);
    expect(fruitStackModule.maxPlayers).toBe(5);
  });

  it('게임 이름은 "수박게임"이고 예전 이름 "과일 쌓기"는 어디에도 쓰지 않는다', () => {
    expect(fruitStackModule.name).toBe('수박게임');
    expect(fruitStackModule.rules.title).toBe('수박게임 규칙');
    const texts = [...FRUIT_RULE_SLIDES.flatMap((slide) => [slide.title, ...slide.body]), ...FRUIT_RULE_SUMMARY, fruitStackModule.name, fruitStackModule.tagline, fruitStackModule.rules.title];

    texts.forEach((text) => expect(text.replace(/\s/g, '')).not.toContain('과일쌓기'));
  });

  it('모듈의 renderArt가 장의 과일 수만큼 그림을 그린다', () => {
    const { container } = render(<>{fruitStackModule.rules.renderArt(FRUIT_RULE_SLIDES[1])}</>);
    expect(container.querySelectorAll('svg')).toHaveLength(11);

    const none = render(<>{fruitStackModule.rules.renderArt(FRUIT_RULE_SLIDES[6])}</>);
    expect(none.container.querySelectorAll('svg')).toHaveLength(0);
  });

  it('나간 사람 알림: 탈락한 사람과 혼자 하던 사람은 기권이 아니라 그냥 나간 것이다', () => {
    const leaves = fruitStackModule.leavesWithoutForfeit!;
    expect(leaves(fruitSession({ players: [fruitPlayer(1, 0, 'OUT'), fruitPlayer(2)] }), 1)).toBe(true);
    expect(leaves(fruitSession(), 2)).toBe(false);
    expect(leaves(soloSession(), 1)).toBe(true);
  });
});
