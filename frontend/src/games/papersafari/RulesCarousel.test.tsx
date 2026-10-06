import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RulesCarousel } from './RulesCarousel';

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
});
