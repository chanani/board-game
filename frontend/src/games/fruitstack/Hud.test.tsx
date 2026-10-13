import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Hud } from './Hud';

const NOW = 1_791_900_000_000;

describe('Hud', () => {
  it('점수·다음 과일·남은 시간', () => {
    render(<Hud score={128} next={5} deadline={NOW + 61_000} serverNow={NOW} />);
    const hud = screen.getByTestId('fruit-hud');

    expect(hud).toHaveTextContent('점수');
    expect(hud).toHaveTextContent('128');
    expect(hud).toHaveTextContent('다음');
    expect(screen.getByRole('img', { name: '감' })).toBeInTheDocument();
    expect(hud).toHaveTextContent('남은 시간');
    expect(screen.getByTestId('match-clock')).toHaveTextContent('1:01');
    expect(screen.getByTestId('match-clock')).not.toHaveAttribute('data-urgent');
    expect(hud).not.toHaveAttribute('data-vertical');
  });

  it('천 점부터 쉼표', () => {
    render(<Hud score={1234} next={1} deadline={NOW + 61_000} serverNow={NOW} />);

    expect(screen.getByTestId('fruit-hud')).toHaveTextContent('1,234');
  });

  it('마지막 10초는 급함 표시', () => {
    render(<Hud score={0} next={1} deadline={NOW + 9_000} serverNow={NOW} />);

    expect(screen.getByTestId('match-clock')).toHaveAttribute('data-urgent', 'true');
    expect(screen.getByTestId('match-clock')).toHaveTextContent('0:09');
  });

  it('끝난 경기는 0:00이고 급함 표시가 없다', () => {
    render(<Hud score={10} next={null} deadline={null} serverNow={NOW} />);

    expect(screen.getByTestId('match-clock')).toHaveTextContent('0:00');
    expect(screen.getByTestId('match-clock')).not.toHaveAttribute('data-urgent');
    expect(screen.getByTestId('fruit-hud')).not.toHaveTextContent('다음');
  });

  it('관전자는 "관전 중"', () => {
    render(<Hud score={null} next={null} deadline={NOW + 61_000} serverNow={NOW} />);
    const hud = screen.getByTestId('fruit-hud');

    expect(hud).toHaveTextContent('관전 중');
    expect(hud).not.toHaveTextContent('점수');
    expect(hud).not.toHaveTextContent('다음');
    expect(hud).toHaveTextContent('남은 시간');
  });

  it('과일 순서 버튼은 겨루는 사람에게도 관전자에게도 있다', () => {
    const { rerender } = render(<Hud score={128} next={5} deadline={NOW + 61_000} serverNow={NOW} />);
    expect(within(screen.getByTestId('fruit-hud')).getByRole('button', { name: '과일 순서 보기' })).toBeInTheDocument();

    rerender(<Hud score={128} next={null} deadline={NOW + 61_000} serverNow={NOW} />);
    expect(within(screen.getByTestId('fruit-hud')).getByRole('button', { name: '과일 순서 보기' })).toBeInTheDocument();

    rerender(<Hud score={null} next={null} deadline={NOW + 61_000} serverNow={NOW} />);
    expect(within(screen.getByTestId('fruit-hud')).getByRole('button', { name: '과일 순서 보기' })).toBeInTheDocument();
  });

  it('작은 판 옆 점수 칸: 남은 폭을 다 쓰고 두 칸씩 놓이며(넓으면 네 칸 한 줄) 내용은 같다', () => {
    render(<Hud score={1234} next={5} deadline={NOW + 61_000} serverNow={NOW} block />);
    const hud = screen.getByTestId('fruit-hud');

    expect(hud).toHaveAttribute('data-block', 'true');
    expect(hud).toHaveClass('@container', 'min-w-0', 'flex-1');
    expect(hud.firstElementChild).toHaveClass('grid', 'grid-cols-2', '@[15rem]:grid-cols-4');
    expect(hud.firstElementChild?.children).toHaveLength(4);
    expect(hud).toHaveTextContent('점수');
    expect(hud).toHaveTextContent('1,234');
    expect(screen.getByRole('img', { name: '감' })).toBeInTheDocument();
    expect(screen.getByTestId('match-clock')).toHaveTextContent('1:01');
    expect(within(hud).getByRole('button', { name: '과일 순서 보기' })).toBeInTheDocument();
  });

  it('세로 띠와 낮은 한 줄', () => {
    const { rerender } = render(<Hud score={0} next={1} deadline={NOW + 61_000} serverNow={NOW} vertical />);
    expect(screen.getByTestId('fruit-hud')).toHaveAttribute('data-vertical', 'true');

    rerender(<Hud score={0} next={null} deadline={NOW + 61_000} serverNow={NOW} compact />);
    expect(screen.getByTestId('fruit-hud')).toHaveAttribute('data-compact', 'true');
  });
});
