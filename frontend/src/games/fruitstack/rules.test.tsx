import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { fruitStackModule } from './module';
import { FRUIT_RULE_SLIDES, FRUIT_RULE_SUMMARY } from './rules';

describe('수박게임 규칙', () => {
  it('규칙은 6장이고 제목이 순서대로다', () => {
    expect(FRUIT_RULE_SLIDES.map((slide) => slide.title)).toEqual(['목표', '과일', '떨어뜨리기', '탈락', '끝', '나가기와 끊김']);
  });

  it('본문은 장마다 두 줄이다', () => {
    FRUIT_RULE_SLIDES.forEach((slide) => expect(slide.body).toHaveLength(2));
  });

  it('끝 장은 일찍 끝나는 규칙을 말한다', () => {
    expect(FRUIT_RULE_SLIDES[4].body[0]).toContain('한 사람만 남았을 때 그 사람 점수가 가장 높으면 바로 끝나요');
  });

  it('요약은 4줄이다', () => {
    expect(FRUIT_RULE_SUMMARY).toEqual([
      '같은 과일 두 개를 합쳐 점수를 쌓아요.', '10초 안에 떨어뜨리지 않으면 저절로 떨어져요.',
      '과일이 선을 2초 넘게 넘으면 탈락이에요.', '가장 높은 점수가 이겨요.',
    ]);
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

    const none = render(<>{fruitStackModule.rules.renderArt(FRUIT_RULE_SLIDES[5])}</>);
    expect(none.container.querySelectorAll('svg')).toHaveLength(0);
  });
});
