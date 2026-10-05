import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('열리면 대화상자로 보이고 첫 버튼에 포커스가 간다', () => {
    render(<Modal open title="결과"><button type="button">확인</button></Modal>);

    expect(screen.getByRole('dialog', { name: '결과' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '확인' })).toHaveFocus();
  });

  it('닫을 수 있는 모달은 Esc로 닫힌다', async () => {
    const onClose = vi.fn();
    render(<Modal open title="결과" onClose={onClose}><button type="button">확인</button></Modal>);

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('Tab은 모달 안에서만 돈다', async () => {
    render(<Modal open title="결과"><button type="button">하나</button><button type="button">둘</button></Modal>);

    await userEvent.tab();
    expect(screen.getByRole('button', { name: '둘' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: '하나' })).toHaveFocus();
  });

  it('닫혀 있으면 아무것도 그리지 않는다', () => {
    render(<Modal open={false} title="결과"><p>내용</p></Modal>);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
