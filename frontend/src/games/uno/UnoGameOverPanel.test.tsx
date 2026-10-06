import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Room, UnoView } from '../../api/types';
import { SILENT_SOUND, SoundContext } from '../../lib/sound';
import { UnoGameOverPanel } from './UnoGameOverPanel';
import { num, skip, unoView, wild } from './unoFixtures';

const room: Room = {
  code: 'UNO123', name: '우노 방', gameType: 'UNO', gameTypeName: '우노', status: 'WAITING', hostId: 1, maxPlayers: 5,
  locked: false, spectators: [], theme: 'WOOD',
  members: [
    { id: 1, nickname: '앨리스', host: true, connected: true, offlineSeconds: 0, ready: false },
    { id: 2, nickname: '밥', host: false, connected: true, offlineSeconds: 0, ready: true },
    { id: 3, nickname: '캐롤', host: false, connected: true, offlineSeconds: 0, ready: false },
  ],
};
const nicknameOf = (id: number) => room.members.find((member) => member.id === id)?.nickname ?? '떠난 플레이어';
const many = Array.from({ length: 12 }, (_, index) => num('GREEN', (index % 9) + 1, 60 + index));
const ended: Partial<UnoView> = {
  status: 'GAME_OVER', stage: null, currentPlayerId: null, winnerId: 1,
  result: { reason: 'EMPTY_HAND', winnerId: 1, points: 47, players: [
    { playerId: 2, cards: [num('RED', 7, 13)], points: 7 },
    { playerId: 3, cards: [...many.slice(0, 11), skip('BLUE', 94), wild(100)], points: 40 },
  ] },
};

function renderPanel(overrides: Partial<UnoView>, meId = 1, play = vi.fn()) {
  const onReady = vi.fn();
  const onClose = vi.fn();
  render(
    <SoundContext.Provider value={{ ...SILENT_SOUND, play }}>
      <UnoGameOverPanel game={unoView(overrides)} room={room} meId={meId} nicknameOf={nicknameOf} onReady={onReady} onClose={onClose} />
    </SoundContext.Provider>,
  );
  return { onReady, onClose, play };
}

describe('UnoGameOverPanel', () => {
  it('내가 이기면 내가 이겼어요와 얻은 점수, 이긴 소리', async () => {
    const { play } = renderPanel(ended);

    const dialog = screen.getByRole('dialog', { name: '게임 결과' });
    expect(within(dialog).getByRole('heading', { name: '내가 이겼어요!' })).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByTestId('won-points')).toHaveTextContent('+47점'));
    expect(play).toHaveBeenCalledWith('roundWin');
  });

  it('남이 이기면 그 사람 이름과 진 소리', () => {
    const { play } = renderPanel(ended, 2);

    expect(screen.getByRole('heading', { name: '앨리스님이 이겼어요!' })).toBeInTheDocument();
    expect(play).toHaveBeenCalledWith('roundLose');
  });

  it('진 사람마다 남은 카드·장수·점수를 점수 큰 순으로, 카드는 10장까지 보여 준다', () => {
    renderPanel(ended);

    const rows = screen.getAllByTestId('uno-result-row');
    expect(rows.map((row) => row.getAttribute('data-player'))).toEqual(['3', '2']);
    expect(rows[0]).toHaveTextContent('캐롤');
    expect(rows[0]).toHaveTextContent('13장');
    expect(rows[0]).toHaveTextContent('40점');
    expect(rows[0]).toHaveTextContent('+3');
    expect(within(rows[0]).getAllByTestId('uno-card')).toHaveLength(10);
    expect(rows[1]).toHaveTextContent('1장');
    expect(rows[1]).toHaveTextContent('7점');
  });

  it('기권으로 끝나면 점수와 표 없이 알린다', () => {
    renderPanel({ ...ended, result: { reason: 'FORFEIT', winnerId: 1, points: 0, players: [] } });

    expect(screen.getByText('상대가 모두 나가서 게임이 끝났어요')).toBeInTheDocument();
    expect(screen.queryByTestId('uno-result-row')).not.toBeInTheDocument();
    expect(screen.queryByTestId('won-points')).not.toBeInTheDocument();
  });

  it('기권해서 나간 내가 보는 결과에는 상대가 모두 나갔다고 쓰지 않는다', () => {
    renderPanel({ ...ended, result: { reason: 'FORFEIT', winnerId: 1, points: 0, players: [] } }, 2);

    expect(screen.queryByText('상대가 모두 나가서 게임이 끝났어요')).not.toBeInTheDocument();
    expect(screen.getByText('앨리스님이 이겼어요!')).toBeInTheDocument();
  });

  it('준비 칩과 다음 게임 준비·대기실로 버튼을 쓴다', async () => {
    const guest = renderPanel(ended, 2);
    expect(screen.getAllByTestId('ready-chip')).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: '다음 게임 준비' }));
    expect(guest.onReady).toHaveBeenCalled();
  });

  it('방장은 대기실로 버튼으로 닫는다', async () => {
    const host = renderPanel(ended, 1);

    await userEvent.click(screen.getByRole('button', { name: '대기실로' }));

    expect(host.onClose).toHaveBeenCalled();
  });
});
