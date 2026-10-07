import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RulesCarousel } from '../../table/RulesCarousel';
import { oldMaidModule } from './module';
import { OLD_MAID_RULE_SLIDES, OLD_MAID_RULE_SUMMARY } from './rules';

describe('도둑잡기 규칙', () => {
  it('슬라이드 8장과 대기실 요약 4줄', () => {
    expect(OLD_MAID_RULE_SLIDES.map((slide) => slide.title)).toEqual(['목표', '카드', '준비', '내 차례', '짝 버리기', '섞기', '끝', '시간과 기권']);
    expect(OLD_MAID_RULE_SUMMARY).toEqual([
      '왼쪽 사람의 카드를 1장씩 뽑아요.',
      '같은 숫자 두 장은 직접 골라 버려요.',
      '손패를 먼저 비울수록 높은 등수예요.',
      '조커를 마지막까지 쥐면 도둑이에요.',
    ]);
  });

  it('캐러셀에서 트럼프 카드 그림과 함께 넘겨 본다', async () => {
    const { rules } = oldMaidModule;
    render(<RulesCarousel open onClose={vi.fn()} title={rules.title} slides={rules.slides} renderArt={rules.renderArt} />);

    expect(screen.getByRole('dialog', { name: '도둑잡기 규칙' })).toBeInTheDocument();
    expect(screen.getByText('같은 숫자 카드 두 장을 짝지어 버려요.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '조커' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '3번째 설명' }));
    expect(await screen.findAllByRole('img', { name: '카드 뒷면' })).toHaveLength(3);
    expect(screen.getByText(/처음 30초 동안 모두 함께 내 손의 같은 숫자 두 장을 골라 버려요/)).toBeInTheDocument();
  });

  it('모듈 등록 값', () => {
    expect(oldMaidModule).toMatchObject({
      gameType: 'OLD_MAID', name: '도둑잡기', slug: 'old-maid', tagline: '2~6인 · 조커를 피해라!', minPlayers: 2, maxPlayers: 6,
      averageScoreLabel: '평균 순위',
    });
    expect(oldMaidModule.roundScoreText?.(3)).toBe('3등');
  });
});
