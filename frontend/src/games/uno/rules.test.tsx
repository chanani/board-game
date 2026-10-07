import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RulesCarousel } from '../../table/RulesCarousel';
import { UNO_RULE_SLIDES, UNO_RULE_SUMMARY } from './rules';
import { unoModule } from './module';

describe('우노 규칙', () => {
  it('슬라이드 10장과 대기실 요약 4줄', () => {
    expect(UNO_RULE_SLIDES.map((slide) => slide.title)).toEqual(['목표', '준비', '내 차례', '카드 뽑기', '기능 카드', '와일드', '도전', '우노!', '점수', '시간']);
    expect(UNO_RULE_SUMMARY).toEqual([
      '같은 색·숫자·기호의 카드를 1장씩 내요.',
      '낼 카드가 없으면 1장을 뽑아요.',
      "2장일 때 '우노!'를 누르고 내요.",
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

  it('+4 도전은 고른 색이 아니라 직전 색 기준임을 밝힌다', () => {
    const challenge = UNO_RULE_SLIDES.find((slide) => slide.title === '도전');
    expect(challenge?.body).toContain('판정 기준은 낸 사람이 고른 색이 아니라 +4를 내기 직전의 색이에요.');
  });
});
