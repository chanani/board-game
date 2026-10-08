import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaperSafariSessionView, Room } from '../api/types';
import { setMediaMatches } from '../test/media';
import { OldMaidTable } from '../games/oldmaid/OldMaidTable';
import { oldMaidSession } from '../games/oldmaid/oldMaidFixtures';
import { PaperSafariTable } from '../games/papersafari/PaperSafariTable';
import { UnoTable } from '../games/uno/UnoTable';
import { unoSession } from '../games/uno/unoFixtures';
import type { EmoteId } from './emotes';
import { EmoteContext, type RoomEmotes } from './useRoomEmotes';

const toast = vi.hoisted(() => ({ show: vi.fn() }));
vi.mock('../components/Toast', () => ({ useToast: () => toast }));

const member = (id: number, nickname: string) => ({ id, nickname, host: id === 1, connected: true, offlineSeconds: 0, ready: false });
const roomOf = (gameType: Room['gameType']): Room => ({
  code: 'EMO123', name: '표정 방', gameType, gameTypeName: '게임', status: 'PLAYING', hostId: 1, maxPlayers: 4,
  locked: false, spectators: [], theme: 'WOOD', members: [member(1, '앨리스'), member(2, '밥'), member(3, '캐롤')],
});
const nicknameOf = (id: number) => ['', '앨리스', '밥', '캐롤'][id] ?? '떠난 플레이어';
const common = { meId: 1, log: [], receivedAt: 0, now: 0, errorSeq: 0, nicknameOf, onCloseGameOver: vi.fn(), onReadyNext: vi.fn() };

function emotesOf(bubbles: [number, EmoteId][] = []): RoomEmotes {
  return { bubbles: new Map(bubbles.map(([id, emote], index) => [id, { key: index + 1, emote }])), send: vi.fn(() => true), coolingDown: false };
}

const safari = (): PaperSafariSessionView => {
  const faceDown = [0, 1, 2].flatMap((column) => [0, 1].map((row) => ({ column, row, faceUp: false, known: false, card: null })));
  return {
    game: {
      viewerId: 1, status: 'IN_ROUND', roundNumber: 1, lastRoundResult: null, winnerId: null,
      round: { phase: 'DRAW', currentPlayerId: 2, deckSize: 40, discardTop: { kind: 'NUMBER', value: 4 }, held: null,
        boards: [1, 2, 3].map((playerId) => ({ playerId, slots: faceDown })) },
    },
  };
};

const TABLES: [string, (send: () => void) => ReactNode][] = [
  ['우노', (send) => <UnoTable view={unoSession()} room={roomOf('UNO')} send={send} {...common} />],
  ['도둑잡기', (send) => <OldMaidTable view={oldMaidSession()} room={roomOf('OLD_MAID')} send={send} sendSignal={vi.fn()} signal={null} {...common} />],
  ['페이퍼 사파리', (send) => <PaperSafariTable view={safari()} room={roomOf('PAPER_SAFARI')} send={send} {...common} />],
];

beforeEach(() => setMediaMatches(true));

describe.each(TABLES)('%s 테이블의 감정 표현', (_, table) => {
  it('방 화면 밖(컨텍스트 없음)에서는 감정 표현 버튼이 없다', () => {
    render(table(vi.fn()));

    expect(screen.queryByRole('button', { name: '감정 표현하기' })).not.toBeInTheDocument();
  });

  it('내 자리 모서리 버튼으로 표정 패널을 열어 보내고, 게임 행동은 보내지 않는다', async () => {
    const send = vi.fn();
    const emotes = emotesOf();
    render(<EmoteContext.Provider value={emotes}>{table(send)}</EmoteContext.Provider>);

    await userEvent.click(screen.getByRole('button', { name: '감정 표현하기' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: '감정 표현' })).getByRole('button', { name: '놀람' }));

    expect(emotes.send).toHaveBeenCalledWith('SURPRISED');
    expect(send).not.toHaveBeenCalled();
  });

  it('상대와 내가 보낸 표정이 각자 자리 위에 말풍선으로 뜬다', () => {
    render(<EmoteContext.Provider value={emotesOf([[2, 'ANGRY'], [1, 'SMILE']])}>{table(vi.fn())}</EmoteContext.Provider>);

    expect(screen.getByTestId('emote-bubble-2')).toHaveAccessibleName('감정 표현: 화남');
    expect(within(screen.getByTestId('emote-dock')).getByTestId('emote-bubble-1')).toHaveAccessibleName('감정 표현: 웃음');
    expect(screen.queryByTestId('emote-bubble-3')).not.toBeInTheDocument();
  });
});
