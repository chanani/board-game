import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { RoomTheme } from '../api/types';
import { ThemePicker } from './ThemePicker';

function Harness() {
  const [theme, setTheme] = useState<RoomTheme>('WOOD');
  return <ThemePicker value={theme} onChange={setTheme} />;
}

describe('ThemePicker 키보드', () => {
  it('선택된 타일만 Tab으로 들어가고 화살표로 옮기며 고른다(끝에서는 처음으로 돈다)', async () => {
    render(<Harness />);
    const radio = (name: string) => screen.getByRole('radio', { name });

    expect(radio('원목 라운지')).toHaveAttribute('tabindex', '0');
    expect(radio('사바나 노을')).toHaveAttribute('tabindex', '-1');

    await userEvent.tab();
    expect(radio('원목 라운지')).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(radio('사바나 노을')).toHaveFocus();
    expect(radio('사바나 노을')).toHaveAttribute('aria-checked', 'true');
    expect(radio('사바나 노을')).toHaveAttribute('tabindex', '0');
    expect(radio('원목 라운지')).toHaveAttribute('tabindex', '-1');

    await userEvent.keyboard('{ArrowDown}');
    expect(radio('달빛 정글')).toHaveAttribute('aria-checked', 'true');
    await userEvent.keyboard('{ArrowUp}{ArrowLeft}');
    expect(radio('원목 라운지')).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(radio('열대 해변')).toHaveFocus();
    expect(radio('열대 해변')).toHaveAttribute('aria-checked', 'true');
  });

  it('여러 개를 그려도 그룹 이름표 id가 겹치지 않는다', () => {
    render(<><ThemePicker value="WOOD" onChange={() => {}} /><ThemePicker value="WOOD" onChange={() => {}} /></>);
    const groups = screen.getAllByRole('radiogroup', { name: '테마' });

    expect(groups).toHaveLength(2);
    expect(groups[0].getAttribute('aria-labelledby')).not.toBe(groups[1].getAttribute('aria-labelledby'));
  });
});
