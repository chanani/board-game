import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { Ranking } from '../api/types';
import { RankingList } from './RankingList';

const rankings: Ranking[] = [
  { rank: 1, memberId: 2, nickname: '밥', matches: 10, wins: 7, draws: 1, losses: 2, winRate: 0.7 },
  { rank: 2, memberId: 3, nickname: '앨리스', matches: 20, wins: 11, draws: 1, losses: 8, winRate: 0.55 },
  { rank: 3, memberId: 4, nickname: '캐롤', matches: 10, wins: 4, draws: 0, losses: 6, winRate: 0.4 },
  { rank: 4, memberId: 5, nickname: '데이브', matches: 0, wins: 0, draws: 0, losses: 0, winRate: 0 },
];

function renderList(list = rankings) {
  render(<MemoryRouter><RankingList rankings={list} /></MemoryRouter>);
  return screen.getAllByRole('listitem');
}

describe('RankingList', () => {
  it('1~3위는 메달 원판에 숫자를 넣고 4위부터는 숫자만 쓴다', () => {
    const rows = renderList();

    expect(within(rows[0]).getByTestId('medal-1')).toHaveTextContent('1');
    expect(within(rows[1]).getByTestId('medal-2')).toHaveTextContent('2');
    expect(within(rows[2]).getByTestId('medal-3')).toHaveTextContent('3');
    expect(within(rows[3]).queryByTestId('medal-4')).not.toBeInTheDocument();
    expect(rows[3]).toHaveTextContent('4');
    expect(within(rows[0]).getByTestId('medal-1')).toHaveAttribute('aria-hidden', 'true');
    rows.forEach((row, index) => expect(within(row).getByText(`${index + 1}위`)).toHaveClass('sr-only'));
  });

  it('승·무·패 막대에 그림 역할과 n승 n무 n패 이름이 있다', () => {
    const rows = renderList();

    expect(within(rows[0]).getByRole('img', { name: '7승 1무 2패' })).toBeInTheDocument();
    expect(within(rows[0]).getByText('7승 1무 2패')).toBeInTheDocument();
    expect(within(rows[2]).getByRole('img', { name: '4승 0무 6패' })).toBeInTheDocument();
  });

  it('승률을 큰 숫자로 쓰고 0판인 사람은 "-"다', () => {
    const rows = renderList();

    expect(within(rows[0]).getByText('70.0%')).toBeInTheDocument();
    expect(within(rows[1]).getByText('55.0%')).toBeInTheDocument();
    expect(within(rows[3]).getByText('-')).toBeInTheDocument();
    expect(within(rows[3]).queryByText('0.0%')).not.toBeInTheDocument();
  });

  it('닉네임은 기록 화면으로 가는 링크다', () => {
    renderList();

    expect(screen.getByRole('link', { name: '밥' })).toHaveAttribute('href', '/records/2');
  });

  it('보여줄 사람이 없으면 안내 문구를 쓴다', () => {
    render(<MemoryRouter><RankingList rankings={[]} /></MemoryRouter>);

    expect(screen.getByText('아직 5판 이상 플레이한 사람이 없어요.')).toBeInTheDocument();
  });
});
