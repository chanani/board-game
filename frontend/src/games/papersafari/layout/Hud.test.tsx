import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { LogEntry } from '../../../lib/eventLog';
import { Hud } from './Hud';

const nick = (id: number) => ({ 1: '앨리스', 2: '밥' })[id] ?? '플레이어';
const at = new Date(2026, 9, 6, 14, 2).getTime();
const log: LogEntry[] = [
  { id: 2, kind: 'draw-deck', actorId: 2, text: '밥님이 덱에서 카드를 가져왔어요', at },
  { id: 1, kind: 'undo', actorId: 1, text: '앨리스님이 가져온 카드를 되돌렸어요', at: at - 60_000 },
];

describe('Hud 진행 기록', () => {
  it('마지막 기록을 칩으로 보여주고 행동한 사람을 굵게 쓴다', () => {
    render(<Hud instruction="안내" myTurn={false} log={log} nicknameOf={nick} />);
    const last = screen.getByTestId('last-log');
    expect(last).toHaveTextContent('밥님이 덱에서 카드를 가져왔어요');
    expect(within(last).getByText('밥').tagName).toBe('B');
  });

  it('기록 창은 종류 아이콘과 HH:mm 시간이 있는 타임라인이다', async () => {
    render(<Hud instruction="안내" myTurn={false} log={log} nicknameOf={nick} />);
    await userEvent.click(screen.getByRole('button', { name: /진행 기록/ }));
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('14:02');
    expect(items[1]).toHaveTextContent('14:01');
    expect(items[1].querySelector('[data-kind="undo"]')).not.toBeNull();
    expect(within(items[1]).getByText('앨리스').tagName).toBe('B');
  });

  it('기록이 없으면 안내 문구를 보여주고 마지막 기록 줄은 비어 있다', async () => {
    render(<Hud instruction="안내" myTurn={false} log={[]} />);
    expect(screen.getByTestId('last-log')).toBeEmptyDOMElement();
    await userEvent.click(screen.getByRole('button', { name: /진행 기록/ }));
    expect(screen.getByText('아직 기록이 없어요.')).toBeInTheDocument();
  });
});
