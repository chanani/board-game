import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setMediaMatches } from '../../test/media';
import { MyBoard } from './MyBoard';

type Overrides = Partial<Parameters<typeof MyBoard>[0]>;

function board(overrides: Overrides = {}) {
  const onAim = vi.fn();
  const onDrop = vi.fn();
  const element = (extra: Overrides = {}) => (
    <MyBoard width={180} getFrame={() => null} getEffects={() => []} getAutoDropLeftMs={() => null}
      score={0} held={5} out={false} catchingUp={false} interactive onAim={onAim} onDrop={onDrop} {...overrides} {...extra} />
  );
  const view = render(element());
  return { onAim, onDrop, box: screen.getByTestId('my-board'), rerender: (extra: Overrides) => view.rerender(element(extra)) };
}

const aims = (onAim: ReturnType<typeof vi.fn>) => onAim.mock.calls.map(([x]) => x);

describe('MyBoard', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 0, width: 180, height: 270, right: 190, bottom: 270, x: 10, y: 0, toJSON: () => ({}) });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  it('누르고 끌다 떼면 그 자리에 떨어뜨린다', () => {
    const { onAim, onDrop, box } = board();

    fireEvent.pointerDown(box, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(box, { clientX: 145, pointerId: 1 });
    fireEvent.pointerUp(box, { clientX: 145, pointerId: 1 });

    expect(aims(onAim)).toEqual([180, 270, 270]);
    expect(onDrop).toHaveBeenCalledTimes(1);
  });

  it('들고 있지 않을 때 누른 것으로는 떨어뜨리지 않는다', () => {
    const { onDrop, box, rerender } = board({ held: 0 });

    fireEvent.pointerDown(box, { clientX: 100, pointerId: 1 });
    rerender({ held: 3 });
    fireEvent.pointerUp(box, { clientX: 100, pointerId: 1 });

    expect(onDrop).not.toHaveBeenCalled();
  });

  it('pointercancel은 떨어뜨리지 않는다', () => {
    const { onDrop, box } = board();

    fireEvent.pointerDown(box, { clientX: 100, pointerId: 1 });
    fireEvent.pointerCancel(box, { pointerId: 1 });
    fireEvent.pointerUp(box, { clientX: 100, pointerId: 1 });

    expect(onDrop).not.toHaveBeenCalled();
  });

  it('정밀 포인터는 누르지 않아도 조준이 따라간다', () => {
    setMediaMatches(true);
    const fine = board();
    fireEvent.pointerMove(fine.box, { clientX: 55, pointerId: 1 });
    expect(aims(fine.onAim)).toEqual([90]);

    setMediaMatches(false);
    fireEvent.pointerMove(fine.box, { clientX: 100, pointerId: 1 });
    expect(aims(fine.onAim)).toEqual([90]);
  });

  it('키보드로 조준하고 떨어뜨린다', () => {
    const { onAim, onDrop, box } = board();

    fireEvent.keyDown(box, { key: 'ArrowRight' });
    fireEvent.keyDown(box, { key: 'ArrowLeft', shiftKey: true });
    fireEvent.keyDown(box, { key: ' ' });
    fireEvent.keyDown(box, { key: 'Enter' });

    expect(aims(onAim)).toEqual([192, 156]);
    expect(onDrop).toHaveBeenCalledTimes(2);
  });

  it('키보드 조준은 끌어 놓은 자리에서 이어 간다', () => {
    const { onAim, box } = board();
    fireEvent.pointerDown(box, { clientX: 100, pointerId: 1 });
    fireEvent.pointerCancel(box, { pointerId: 1 });

    fireEvent.keyDown(box, { key: 'ArrowRight' });

    expect(aims(onAim)).toEqual([180, 192]);
  });

  it('입력을 받지 않을 때는 아무것도 하지 않는다', () => {
    const { onAim, onDrop, box } = board({ interactive: false });

    fireEvent.pointerDown(box, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(box, { clientX: 120, pointerId: 1 });
    fireEvent.pointerUp(box, { clientX: 120, pointerId: 1 });
    fireEvent.keyDown(box, { key: 'ArrowRight' });
    fireEvent.keyDown(box, { key: ' ' });

    expect(onAim).not.toHaveBeenCalled();
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('따라잡는 중과 탈락 안내', () => {
    const { rerender } = board({ catchingUp: true });
    expect(screen.getByRole('status')).toHaveTextContent('따라잡는 중…');

    rerender({ catchingUp: false, out: true, score: 1250 });
    expect(screen.getByRole('status')).toHaveTextContent('가득 찼어요!');
    expect(screen.getByRole('status')).toHaveTextContent('1,250점');
  });

  it('이름표', () => {
    const { box } = board({ score: 30, held: 5 });

    expect(screen.getByRole('application')).toHaveAccessibleName('내 판. 점수 30점, 들고 있는 과일 감. 좌우 화살표로 자리를 정하고 스페이스로 떨어뜨려요');
    expect(box).toHaveAttribute('data-no-click-sound');
    expect(box).toHaveAttribute('tabindex', '0');
    expect(box).toHaveStyle({ width: '180px', height: '270px' });
  });
});
