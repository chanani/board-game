import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('열리면 대화상자로 보이고 첫 버튼에 포커스가 간다', () => {
    render(<Modal open title="결과"><button type="button">확인</button></Modal>);

    expect(screen.getByRole('dialog', { name: '결과' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '확인' })).toHaveFocus();
  });

  it('initialFocus="dialog"이면 버튼이 아니라 대화상자 자체에 포커스가 간다', async () => {
    const onClose = vi.fn();
    render(<Modal open title="결과" onClose={onClose} initialFocus="dialog"><button type="button">확인</button></Modal>);

    expect(screen.getByRole('dialog', { name: '결과' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('닫을 수 있는 모달은 Esc로 닫힌다', async () => {
    const onClose = vi.fn();
    render(<Modal open title="결과" onClose={onClose}><button type="button">확인</button></Modal>);

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('포커스가 body로 빠져도 Esc로 닫힌다 (눌렀던 버튼이 비활성이 된 경우)', async () => {
    const onClose = vi.fn();
    render(<Modal open title="결과" onClose={onClose}><button type="button">확인</button></Modal>);
    (document.activeElement as HTMLElement).blur();
    expect(document.body).toHaveFocus();

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('다른 곳(모달 밖 입력칸)에 포커스가 있으면 Esc를 가로채지 않는다', async () => {
    const onClose = vi.fn();
    render(<><input aria-label="밖" /><Modal open title="결과" onClose={onClose}><button type="button">확인</button></Modal></>);
    screen.getByRole('textbox', { name: '밖' }).focus();

    await userEvent.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
  });

  it('Tab은 모달 안에서만 돈다', async () => {
    render(<Modal open title="결과"><button type="button">하나</button><button type="button">둘</button></Modal>);

    await userEvent.tab();
    expect(screen.getByRole('button', { name: '둘' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: '하나' })).toHaveFocus();
  });

  it('대화상자 자체에 포커스가 있을 때 Shift+Tab은 마지막 버튼으로 돌아 모달 밖으로 나가지 않는다', async () => {
    render(<><button type="button">밖</button><Modal open title="결과" initialFocus="dialog"><button type="button">하나</button><button type="button">둘</button></Modal></>);
    expect(screen.getByRole('dialog', { name: '결과' })).toHaveFocus();

    await userEvent.tab({ shift: true });

    expect(screen.getByRole('button', { name: '둘' })).toHaveFocus();
  });

  it('닫혀 있으면 아무것도 그리지 않는다', () => {
    render(<Modal open={false} title="결과"><p>내용</p></Modal>);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('onClose가 있으면 ✕ 버튼으로 닫는다', async () => {
    const onClose = vi.fn();
    render(<Modal open title="결과" onClose={onClose}><p>내용</p></Modal>);

    await userEvent.click(screen.getByRole('button', { name: '닫기' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('✕ 버튼은 높이 0인 고정 줄에 눌려 납작해지지 않는다(스크롤 때 동그란 배경이 아이콘을 다 덮게)', () => {
    render(<Modal open title="결과" onClose={() => {}}><p>내용</p></Modal>);

    const row = screen.getByRole('button', { name: '닫기' }).parentElement;

    expect(row).toHaveClass('sticky', 'h-0', 'items-start');
  });

  it('배경을 누르면 닫히고 안쪽을 누르면 닫히지 않는다', async () => {
    const onClose = vi.fn();
    render(<Modal open title="결과" onClose={onClose}><p>내용</p></Modal>);

    await userEvent.click(screen.getByText('내용'));
    await userEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId('modal-backdrop'));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('onClose가 없으면 ✕도 없고 배경을 눌러도 그대로다', async () => {
    render(<Modal open title="결과"><p>내용</p></Modal>);

    expect(screen.queryByRole('button', { name: '닫기' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('modal-backdrop'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('안쪽에서 누르고 배경에서 놓아도 닫히지 않는다', async () => {
    const onClose = vi.fn();
    render(<Modal open title="결과" onClose={onClose}><p>내용</p></Modal>);

    await userEvent.pointer([{ keys: '[MouseLeft>]', target: screen.getByText('내용') }, { keys: '[/MouseLeft]', target: screen.getByTestId('modal-backdrop') }]);

    expect(onClose).not.toHaveBeenCalled();
  });

  describe('닫으면 포커스 돌려주기', () => {
    function Opener() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>열기</button>
          <button type="button">다른 버튼</button>
          <Modal open={open} title="창" onClose={() => setOpen(false)}><button type="button">확인</button></Modal>
        </>
      );
    }

    it('열 때 포커스가 있던 버튼으로 Esc·닫기 버튼으로 닫은 뒤 포커스가 돌아온다', async () => {
      render(<Opener />);
      const opener = screen.getByRole('button', { name: '열기' });

      await userEvent.click(opener);
      expect(screen.getByRole('button', { name: '확인' })).toHaveFocus();
      await userEvent.keyboard('{Escape}');
      expect(opener).toHaveFocus();

      await userEvent.click(opener);
      await userEvent.click(screen.getByRole('button', { name: '닫기' }));
      expect(opener).toHaveFocus();
    });

    it('여는 요소가 사라졌으면 아무 데도 옮기지 않는다', async () => {
      function Vanishing() {
        const [open, setOpen] = useState(false);
        return (
          <>
            {open ? null : <button type="button" onClick={() => setOpen(true)}>열기</button>}
            <Modal open={open} title="창" onClose={() => setOpen(false)}><button type="button">확인</button></Modal>
          </>
        );
      }
      render(<Vanishing />);
      await userEvent.click(screen.getByRole('button', { name: '열기' }));
      await userEvent.keyboard('{Escape}');
      expect(screen.getByRole('button', { name: '열기' })).not.toHaveFocus();
    });
  });
});
