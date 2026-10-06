import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { ToggleSwitch } from './ToggleSwitch';

function Harness() {
  const [on, setOn] = useState(false);
  return <ToggleSwitch checked={on} onChange={setOn} label="비공개방" />;
}

describe('ToggleSwitch', () => {
  it('누르면 켜지고 다시 누르면 꺼진다', async () => {
    render(<Harness />);
    const toggle = screen.getByRole('switch', { name: '비공개방' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });
});
