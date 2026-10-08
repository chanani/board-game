import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RulesCarousel } from '../../table/RulesCarousel';
import { UNO_RULE_SLIDES, UNO_RULE_SUMMARY } from './rules';
import { unoModule } from './module';

describe('우노 규칙', () => {
  it('슬라이드 9장과 대기실 요약 4줄', () => {
    expect(UNO_RULE_SLIDES.map((slide) => slide.title)).toEqual(['목표', '준비', '내 차례', '카드 뽑기', '기능 카드', '와일드', '우노!', '점수', '시간']);
    expect(UNO_RULE_SUMMARY).toEqual([
      '같은 색·숫자·기호의 카드를 1장씩 내요.',
      '낼 카드가 없으면 1장을 뽑아요.',
      "1장이 남으면 잡히기 전에 '우노!'를 눌러요.",
      '손패를 먼저 비우면 이겨요.',
    ]);
  });

  it('캐러셀에서 우노 카드 그림과 함께 넘겨 본다', async () => {
    const { rules } = unoModule;
    render(<RulesCarousel open onClose={vi.fn()} title={rules.title} slides={rules.slides} renderArt={rules.renderArt} />);

    expect(screen.getByRole('dialog', { name: '우노 규칙' })).toBeInTheDocument();
    expect(screen.getByText('손에 든 카드를 가장 먼저 모두 내면 이겨요.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '빨강 1' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '2번째 설명' }));
    expect(await screen.findAllByRole('img', { name: '우노 카드 뒷면' })).toHaveLength(3);
  });

  it('우노!는 2장일 때가 아니라 1장이 남았을 때 잡히기 전에 누른다', () => {
    const uno = UNO_RULE_SLIDES.find((slide) => slide.title === '우노!');
    expect(uno?.body).toContain("카드를 내고 1장이 남으면 '우노!' 버튼이 나타나요. 다른 사람에게 잡히기 전에 눌러요.");
    expect(UNO_RULE_SLIDES.flatMap((slide) => slide.body).join(' ')).not.toContain('2장일 때');
  });

  it('+4는 도전 없이 언제든 낼 수 있고 받는 사람은 바로 4장을 뽑는다', () => {
    const wild = UNO_RULE_SLIDES.find((slide) => slide.title === '와일드');
    expect(wild?.body).toContain('와일드 +4: 색을 고르고, 다음 사람은 4장을 뽑고 차례를 쉬어요.');
    expect(wild?.body).toContain('와일드 +4도 언제든 낼 수 있어요.');
    expect(UNO_RULE_SLIDES.flatMap((slide) => slide.body).join(' ')).not.toContain('도전');
  });
});
