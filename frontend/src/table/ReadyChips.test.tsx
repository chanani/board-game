import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RoomMember } from '../api/types';
import { ReadyChips } from './gameOver';

const member = (over: Partial<RoomMember>): RoomMember =>
  ({ id: 1, nickname: '앨리스', host: false, ready: false, ...over }) as RoomMember;

describe('ReadyChips', () => {
  it('컴퓨터는 늘 준비돼 있으니 칩에 올리지 않는다', () => {
    render(<ReadyChips members={[
      member({ id: 1, host: true }),
      member({ id: 2, nickname: '밥' }),
      member({ id: -1, nickname: '컴퓨터 1', ready: true, bot: true }),
    ]} />);

    expect(screen.getAllByTestId('ready-chip')).toHaveLength(1);
  });

  it('사람 손님이 없으면 아무것도 그리지 않는다', () => {
    render(<ReadyChips members={[member({ host: true }), member({ id: -1, bot: true, ready: true })]} />);

    expect(screen.queryByTestId('ready-chips')).not.toBeInTheDocument();
  });
});
