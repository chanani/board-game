import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RulesCarousel } from './RulesCarousel';
import { RULE_SLIDES, RULE_SUMMARY } from './rules';

function renderCarousel() {
  render(<RulesCarousel open onClose={vi.fn()} />);
}

describe('RulesCarousel', () => {
  it('첫 슬라이드에서 시작한다', () => {
    renderCarousel();

    expect(screen.getByRole('dialog', { name: '페이퍼 사파리 규칙' })).toBeInTheDocument();
    expect(screen.getByText('1 / 7')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이전' })).toBeDisabled();
  });

  it('다음과 이전으로 넘긴다', async () => {
    renderCarousel();

    await userEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(await screen.findByText('2 / 7')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '이전' }));
    expect(await screen.findByText('1 / 7')).toBeInTheDocument();
  });

  it('마지막 슬라이드에서는 다음이 비활성이다', async () => {
    renderCarousel();

    await userEvent.click(screen.getByRole('button', { name: '7번째 설명' }));

    expect(await screen.findByText('7 / 7')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '7번째 설명' })).toHaveAttribute('aria-current', 'step');
  });

  it('좌우 방향키로 넘긴다', async () => {
    renderCarousel();

    await userEvent.keyboard('{ArrowRight}');
    expect(await screen.findByText('2 / 7')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowLeft}');
    expect(await screen.findByText('1 / 7')).toBeInTheDocument();
  });

  it('5번째 슬라이드에 0점 설명이 있다', async () => {
    renderCarousel();

    await userEvent.click(screen.getByRole('button', { name: '5번째 설명' }));

    expect((await screen.findAllByText(/0점/)).length).toBeGreaterThan(0);
  });

  const swipe = (from: [number, number], to: [number, number]) => {
    const target = screen.getByText(/1\. 목표/);
    fireEvent.touchStart(target, { touches: [{ clientX: from[0], clientY: from[1] }] });
    fireEvent.touchEnd(target, { changedTouches: [{ clientX: to[0], clientY: to[1] }] });
  };

  it('50px 이상 가로로 밀면 넘어가고 그보다 적게 밀면 그대로다', async () => {
    renderCarousel();

    swipe([100, 0], [60, 0]);
    expect(screen.getByText('1 / 7')).toBeInTheDocument();
    swipe([100, 0], [40, 0]);
    expect(await screen.findByText('2 / 7')).toBeInTheDocument();
  });

  it('세로로 더 많이 움직인 스와이프는 무시한다', () => {
    renderCarousel();

    swipe([100, 0], [30, 90]);

    expect(screen.getByText('1 / 7')).toBeInTheDocument();
  });

  it('대기실 요약은 타잔을 버릴 수 없다고 알려준다', () => {
    expect(RULE_SUMMARY).toContain('버린 카드 더미에서 가져온 카드는 반드시 교체해요(되돌리기로 다시 내려놓을 수는 있어요). 덱에서 가져온 카드는 타잔만 빼고 버릴 수 있어요.');
  });

  it('되돌리기 안내는 버린 카드 더미 문장에만 붙고 타잔 문장에는 붙지 않는다', () => {
    const texts = [...RULE_SLIDES.flatMap((slide) => slide.body), ...RULE_SUMMARY];
    const sentences = texts.flatMap((text) => text.split(/(?<=\.)\s+/)).filter((sentence) => sentence.includes('되돌리기로'));

    expect(sentences).toHaveLength(2);
    sentences.forEach((sentence) => {
      expect(sentence).toMatch(/^버린 카드 더미에서 가져온 카드는[^.]*\(되돌리기로 다시 내려놓을 수는 있어요\)\.$/);
      expect(sentence).not.toMatch(/타잔/);
    });
  });

  it('단판 규칙이라 슬라이드와 요약 어디에도 토큰이 없다', () => {
    const texts = [...RULE_SLIDES.flatMap((slide) => [slide.title, ...slide.body]), ...RULE_SUMMARY];

    texts.forEach((text) => expect(text).not.toMatch(/토큰/));
  });

  it('마지막 슬라이드는 가장 낮은 사람이 1승, 최저점 동점이면 무승부라고 알려준다', () => {
    const last = RULE_SLIDES[RULE_SLIDES.length - 1].body.join(' ');

    expect(last).toContain('1승');
    expect(last).toContain('무승부');
  });
});
