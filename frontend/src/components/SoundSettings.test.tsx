import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SILENT_SOUND, SoundContext } from '../lib/sound';
import { SoundSettings } from './SoundSettings';

function ui(overrides = {}) {
  const sound = { ...SILENT_SOUND, play: vi.fn(), setDrawSound: vi.fn(), ...overrides };
  render(<SoundContext.Provider value={sound}><SoundSettings /></SoundContext.Provider>);
  return sound;
}

describe('SoundSettings 카드 가져오는 소리', () => {
  it('네 가지 소리 중 하나를 고르는 라디오 묶음이고, 지금 고른 소리가 선택돼 있다', () => {
    ui({ drawSound: 'pop' });
    const group = screen.getByRole('radiogroup', { name: '카드 가져오는 소리' });
    const radios = Array.from(group.querySelectorAll('[role="radio"]'));
    expect(radios.map((radio) => radio.textContent)).toEqual(['슥', '뽁', '톡', '띵']);
    expect(screen.getByRole('radio', { name: '뽁' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: '슥' })).toHaveAttribute('aria-checked', 'false');
  });

  it('다른 소리를 누르면 그 소리로 바꾼다', async () => {
    const sound = ui();
    await userEvent.click(screen.getByRole('radio', { name: '톡' }));
    expect(sound.setDrawSound).toHaveBeenCalledWith('tock');
  });

  it('효과음이 꺼져 있으면 고를 수 없다', () => {
    ui({ muted: true });
    screen.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled());
  });
});
