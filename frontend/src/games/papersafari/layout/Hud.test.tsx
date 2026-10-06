import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { LogEntry } from '../../../lib/eventLog';
import { setMediaMatches } from '../../../test/media';
import { LogPopover } from './Hud';
import { TurnBar } from './TurnBar';

const nick = (id: number) => ({ 1: '앨리스', 2: '밥' })[id] ?? '플레이어';
const at = new Date(2026, 9, 6, 14, 2).getTime();
const log: LogEntry[] = [
  { id: 2, kind: 'draw-deck', actorId: 2, text: '밥님이 덱에서 카드를 가져왔어요', at },
  { id: 1, kind: 'undo', actorId: 1, text: '앨리스님이 가져온 카드를 되돌렸어요', at: at - 60_000 },
];

describe('차례 안내 바', () => {
  it('마지막 기록을 한 줄로 보여주고 행동한 사람을 굵게 쓴다', () => {
    render(<TurnBar instruction="안내" myTurn={false} log={log} nicknameOf={nick} deadline={null} serverNow={0} />);
    const last = screen.getByTestId('last-log');
    expect(last).toHaveTextContent('밥님이 덱에서 카드를 가져왔어요');
    expect(within(last).getByText('밥').tagName).toBe('B');
    expect(last.querySelector('[data-kind="draw-deck"] svg')).not.toBeNull();
  });

  it('기록이 없으면 마지막 기록 칸은 비어 있다', () => {
    render(<TurnBar instruction="안내" myTurn={false} log={[]} deadline={null} serverNow={0} />);
    expect(screen.getByTestId('last-log')).toBeEmptyDOMElement();
  });
});

describe('진행 기록 팝오버', () => {
  it('기록 창은 종류 아이콘과 HH:mm 시간이 있는 타임라인이다', async () => {
    render(<LogPopover log={log} nicknameOf={nick} />);
    await userEvent.click(screen.getByRole('button', { name: /진행 기록/ }));
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('14:02');
    expect(items[1]).toHaveTextContent('14:01');
    expect(items[1].querySelector('[data-kind="undo"] svg')).not.toBeNull();
    expect(within(items[1]).getByText('앨리스').tagName).toBe('B');
  });

  it('기록이 없으면 안내 문구를 보여준다', async () => {
    render(<LogPopover log={[]} />);
    await userEvent.click(screen.getByRole('button', { name: /진행 기록/ }));
    expect(screen.getByText('아직 기록이 없어요.')).toBeInTheDocument();
  });

  it('위에서 내려오며 열리고, 닫힘 애니메이션이 끝나면 사라진다', async () => {
    render(<LogPopover log={log} nicknameOf={nick} />);
    const button = screen.getByRole('button', { name: /진행 기록/ });
    expect(button.querySelector('svg')).not.toBeNull();

    await userEvent.click(button);
    const popover = screen.getByTestId('log-popover');
    expect(popover).toHaveStyle({ transformOrigin: 'top right' });
    expect(button).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(button);
    await waitFor(() => expect(screen.queryByTestId('log-popover')).not.toBeInTheDocument());
  });
});

describe('진행 기록 창', () => {
  it('모바일에서는 화면 안 대화상자로 열리고 팝오버는 쓰지 않는다', async () => {
    setMediaMatches(false);
    render(<LogPopover log={log} nicknameOf={nick} />);
    await userEvent.click(screen.getByRole('button', { name: /진행 기록/ }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog).toBeVisible());
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByTestId('log-popover')).not.toBeInTheDocument();
    expect(within(dialog).getAllByRole('list')[0]).toHaveClass('max-h-[70vh]', 'overflow-y-auto');
  });

  it('PC에서는 팝오버가 열린다', async () => {
    setMediaMatches(true);
    render(<LogPopover log={log} nicknameOf={nick} />);
    await userEvent.click(screen.getByRole('button', { name: /진행 기록/ }));
    expect(screen.getByTestId('log-popover')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([true, false])('최근 진행 한 줄을 누르면 전체 기록 대화상자가 열린다 (PC=%s)', async (pc) => {
    setMediaMatches(pc);
    render(<TurnBar instruction="안내" myTurn={false} log={log} nicknameOf={nick} deadline={null} serverNow={0} />);
    await userEvent.click(screen.getByRole('button', { name: '진행 기록 보기' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(2);
  });

  it('기록이 없으면 최근 진행 줄은 버튼이 아니다', () => {
    render(<TurnBar instruction="안내" myTurn={false} log={[]} deadline={null} serverNow={0} />);
    expect(screen.queryByRole('button', { name: '진행 기록 보기' })).not.toBeInTheDocument();
  });
});
