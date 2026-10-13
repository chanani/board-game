import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fruitPlayer } from './fruitStackFixtures';
import { MiniBoard } from './MiniBoard';

type Overrides = Partial<Parameters<typeof MiniBoard>[0]>;

function mini(overrides: Overrides = {}) {
  render(<MiniBoard width={180} player={fruitPlayer(2, 1250)} nickname="P2" getFrame={() => null} hasFrame danger={false} {...overrides} />);
  return screen.getByTestId('mini-board');
}

describe('MiniBoard', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  it('이름과 점수', () => {
    const board = mini();

    expect(board).toHaveTextContent('P2');
    expect(board).toHaveTextContent('1,250점');
    expect(screen.getByRole('img', { name: 'P2님의 판, 1,250점' })).toBeInTheDocument();
    expect(board).toHaveAttribute('data-player', '2');
    expect(board).toHaveAttribute('data-state', 'PLAYING');
    expect(board).not.toHaveAttribute('data-danger');
    expect(screen.queryByText('탈락')).not.toBeInTheDocument();
    expect(screen.queryByText('불러오는 중…')).not.toBeInTheDocument();
  });

  it('위험이면 붉은 테두리와 이름표에 위험', () => {
    const board = mini({ danger: true });

    expect(board).toHaveAttribute('data-danger', 'true');
    expect(screen.getByRole('img', { name: 'P2님의 판, 1,250점, 위험' })).toBeInTheDocument();
  });

  it('탈락이면 배지와 이름표에 탈락', () => {
    const board = mini({ player: fruitPlayer(2, 1250, 'OUT'), danger: true });

    expect(screen.getByText('탈락')).toBeInTheDocument();
    expect(board).toHaveAttribute('data-state', 'OUT');
    expect(board).not.toHaveAttribute('data-danger');
    expect(screen.getByRole('img', { name: 'P2님의 판, 1,250점, 탈락' })).toBeInTheDocument();
  });

  it('신호를 못 받았으면 불러오는 중…', () => {
    mini({ hasFrame: false });

    expect(screen.getByText('불러오는 중…')).toBeInTheDocument();
  });

  it('연결이 끊기면 "연결 끊김 12초"', () => {
    const board = mini({ connected: false, offlineSeconds: 12 });

    expect(board).toHaveTextContent('연결 끊김 12초');
    expect(board).toHaveTextContent('1,250점');
  });

  it('폭과 높이', () => {
    mini();

    expect(screen.getByTestId('board-box')).toHaveStyle({ width: '180px', height: '270px' });
  });
  it('좁은 판(폭 72 미만)은 이름과 점수를 두 줄로 모두 보여 준다', () => {
    mini({ width: 48 });

    expect(screen.getByText('P2')).toBeInTheDocument();
    expect(screen.getByText('1,250점')).toBeInTheDocument();
  });

  it('좁은 판에서 연결이 끊긴 사람은 이름 자리에 끊긴 시간을 쓴다', () => {
    mini({ width: 48, connected: false, offlineSeconds: 12 });

    expect(screen.getByText('끊김 12초')).toBeInTheDocument();
    expect(screen.getByText('1,250점')).toBeInTheDocument();
  });
});
