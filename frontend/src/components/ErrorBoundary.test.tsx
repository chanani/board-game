import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function Broken(): never {
  throw new Error('그리다 터짐');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React가 잡힌 예외를 콘솔에 남기므로 테스트 출력이 지저분해지지 않게 막는다.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('문제가 없으면 화면을 그대로 그린다', () => {
    render(<ErrorBoundary><p>게임 화면</p></ErrorBoundary>);

    expect(screen.getByText('게임 화면')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('화면을 그리다 예외가 나면 빈 화면 대신 안내와 새로고침 버튼을 보인다', () => {
    const onReload = vi.fn();
    render(<ErrorBoundary onReload={onReload}><Broken /></ErrorBoundary>);

    expect(screen.getByRole('alert')).toHaveTextContent('화면을 그리다 문제가 생겼어요');
    fireEvent.click(screen.getByRole('button', { name: '새로고침' }));

    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('잡은 예외를 콘솔에 남긴다', () => {
    render(<ErrorBoundary><Broken /></ErrorBoundary>);

    expect(console.error).toHaveBeenCalledWith('화면을 그리다 오류가 났어요.', expect.any(Error), expect.any(String));
  });
});
