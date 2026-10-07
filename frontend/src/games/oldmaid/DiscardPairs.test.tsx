import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { OldMaidDiscard } from '../../api/types';
import { DiscardPairs } from './DiscardPairs';
import { card } from './oldMaidFixtures';

const NAMES: Record<number, string> = { 1: '나', 2: '민지', 3: '준호' };
const nicknameOf = (id: number) => NAMES[id] ?? `#${id}`;

const DISCARDS: OldMaidDiscard[] = [
  { playerId: 2, cards: [card('SPADES', 'TWO'), card('HEARTS', 'TWO')] },
  { playerId: 1, cards: [card('CLUBS', 'TEN'), card('DIAMONDS', 'TEN')] },
  { playerId: 3, cards: [card('SPADES', 'KING'), card('CLUBS', 'KING')] },
];

describe('DiscardPairs', () => {
  it('맨 위 짝을 앞면으로 보이고 버린 장수를 쓴다', () => {
    render(<DiscardPairs pairs={[[card('SPADES', 'TWO'), card('HEARTS', 'TWO')], [card('CLUBS', 'TEN'), card('DIAMONDS', 'TEN')]]} count={4} cardWidth={44}
      discards={[]} nicknameOf={nicknameOf} />);

    expect(screen.getByRole('group', { name: '버린 카드 4장, 맨 위 클로버 10·다이아몬드 10' })).toBeInTheDocument();
    expect(screen.getByText('버린 카드 4장')).toBeInTheDocument();
  });

  it('비어 있으면 빈 자리만', () => {
    render(<DiscardPairs pairs={[]} count={0} cardWidth={44} discards={[]} nicknameOf={nicknameOf} />);

    expect(screen.getByRole('group', { name: '버린 카드 없음' })).toBeInTheDocument();
  });

  it('더미를 누르면 버린 짝을 버린 순서대로 누가 버렸는지와 함께 보이고 짝 수 합계를 쓴다', async () => {
    const user = userEvent.setup();
    render(<DiscardPairs pairs={DISCARDS.map((one) => one.cards)} count={6} cardWidth={44} discards={DISCARDS} nicknameOf={nicknameOf} />);

    await user.click(screen.getByRole('button', { name: '버린 카드 보기' }));

    const dialog = screen.getByRole('dialog', { name: '버린 카드' });
    const rows = within(dialog).getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('민지');
    expect(within(rows[0]).getByRole('img', { name: '스페이드 2' })).toBeInTheDocument();
    expect(within(rows[0]).getByRole('img', { name: '하트 2' })).toBeInTheDocument();
    expect(rows[1]).toHaveTextContent('나');
    expect(within(rows[2]).getByRole('img', { name: '클로버 K' })).toBeInTheDocument();
    expect(within(dialog).getByText('짝 3쌍 · 카드 6장')).toBeInTheDocument();
  });

  it('아직 버린 짝이 없으면 안내 문구를 보이고, Esc로 닫으면 포커스가 더미 버튼으로 돌아온다', async () => {
    const user = userEvent.setup();
    render(<DiscardPairs pairs={[]} count={0} cardWidth={44} discards={[]} nicknameOf={nicknameOf} />);

    const opener = screen.getByRole('button', { name: '버린 카드 보기' });
    await user.click(opener);
    expect(within(screen.getByRole('dialog', { name: '버린 카드' })).getByText('아직 버린 카드가 없어요')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await screen.findByRole('button', { name: '버린 카드 보기' });
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });
});
