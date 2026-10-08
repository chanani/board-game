import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Room } from '../api/types';
import { StartCountdownOverlay } from '../room/StartCountdownOverlay';
import { GameEndBanner } from './GameEndBanner';

const counting = {
  code: 'ABC234', name: '방', gameType: 'UNO', gameTypeName: '우노', status: 'WAITING', hostId: 1, maxPlayers: 4,
  locked: false, members: [], spectators: [], theme: 'WOOD', startsAt: 3000, serverNow: 0,
} satisfies Room;

describe('GameEndBanner', () => {
  it('화면 가운데 큰 "게임 끝!"과 아랫줄 안내를 방 안 모두에게 알린다', () => {
    render(<GameEndBanner subtitle="순위를 정하고 있어요" />);

    const banner = screen.getByTestId('game-end-banner');
    expect(banner).toHaveAttribute('role', 'status');
    expect(banner).toHaveAttribute('aria-live', 'assertive');
    expect(screen.getByText('게임 끝!')).toBeInTheDocument();
    expect(screen.getByText('순위를 정하고 있어요')).toBeInTheDocument();
  });

  it('게임 시작 카운트다운과 같은 모습(가운데 덮개·큰 글자)이다', () => {
    const end = render(<GameEndBanner />);
    const endOverlay = screen.getByTestId('game-end-banner').className;
    const endShout = screen.getByText('게임 끝!').className;
    end.unmount();

    render(<StartCountdownOverlay room={counting} />);
    expect(screen.getByTestId('start-countdown').className).toBe(endOverlay);
    expect(screen.getByTestId('start-countdown-number').className).toBe(endShout);
  });
});
