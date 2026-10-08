import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OldMaidResult, PaperSafariView, Room, UnoView } from '../api/types';
import { OldMaidGameOverPanel } from '../games/oldmaid/OldMaidGameOverPanel';
import { oldMaidView } from '../games/oldmaid/oldMaidFixtures';
import { GameOverPanel } from '../games/papersafari/GameOverPanel';
import { UnoGameOverPanel } from '../games/uno/UnoGameOverPanel';
import { num, unoView } from '../games/uno/unoFixtures';
import { PracticeNote } from './PracticeNote';

const NOTE = '컴퓨터와 한 연습 경기라 전적에 넣지 않아요';
const members = [
  { id: 1, nickname: '앨리스', host: true, connected: true, offlineSeconds: 0, ready: false },
  { id: 2, nickname: '밥', host: false, connected: true, offlineSeconds: 0, ready: true },
];
const base: Room = { code: 'ABC234', name: '방', gameType: 'UNO', gameTypeName: '우노', status: 'WAITING', hostId: 1, maxPlayers: 4, locked: false, spectators: [], theme: 'WOOD', members };
const practice: Room = { ...base, practice: true };
const nicknameOf = (id: number) => members.find((member) => member.id === id)?.nickname ?? '떠난 플레이어';

describe('PracticeNote', () => {
  it('practice가 참이면 안내 한 줄, 아니면 없음', () => {
    const { rerender } = render(<PracticeNote room={practice} />);
    expect(screen.getByTestId('practice-note')).toHaveTextContent(NOTE);

    rerender(<PracticeNote room={base} />);
    expect(screen.queryByTestId('practice-note')).toBeNull();
  });

  it('세 결과 창 모두 room.practice일 때 문구가 보인다', () => {
    const unoOver: Partial<UnoView> = {
      status: 'GAME_OVER', stage: null, currentPlayerId: null, winnerId: 1,
      result: { reason: 'EMPTY_HAND', winnerId: 1, points: 7, players: [{ playerId: 2, cards: [num('RED', 7, 13)], points: 7 }] },
    };
    const uno = render(<UnoGameOverPanel game={unoView(unoOver)} room={practice} meId={1} nicknameOf={nicknameOf} onReady={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByTestId('practice-note')).toHaveTextContent(NOTE);
    uno.unmount();

    const result: OldMaidResult = { reason: 'NORMAL', thiefId: 2, ranking: [{ playerId: 1, rank: 1, placement: 'FINISHED' }, { playerId: 2, rank: 2, placement: 'THIEF' }] };
    const old = render(<OldMaidGameOverPanel game={oldMaidView({ status: 'GAME_OVER', currentPlayerId: null, targetId: null, peek: null, result, winnerId: 1 })}
      room={practice} meId={1} nicknameOf={nicknameOf} onReady={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByTestId('practice-note')).toHaveTextContent(NOTE);
    old.unmount();

    const slots = [0, 1, 2].flatMap((column) => [0, 1].map((row) => ({ column, row, faceUp: true, known: false, card: { kind: 'NUMBER' as const, value: column + 1 } })));
    const safari: PaperSafariView = {
      viewerId: 1, status: 'GAME_OVER', roundNumber: 1, winnerId: 1,
      lastRoundResult: { players: [{ playerId: 2, score: 25, outcome: 'LOSE' }, { playerId: 1, score: 12, outcome: 'WIN' }] },
      round: { phase: 'ROUND_OVER', currentPlayerId: 1, deckSize: 10, discardTop: null, held: null, boards: [{ playerId: 1, slots }, { playerId: 2, slots }] },
    };
    render(<GameOverPanel game={safari} room={practice} meId={1} nicknameOf={nicknameOf} onReady={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByTestId('practice-note')).toHaveTextContent(NOTE);
  });
});
