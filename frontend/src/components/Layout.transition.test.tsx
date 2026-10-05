import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Layout } from './Layout';

vi.mock('../realtime/RealtimeContext', () => ({ useRealtime: () => ({ realtime: {}, connected: true }) }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ member: { id: 1, nickname: '앨리스' }, logout: vi.fn() }) }));
vi.mock('./Toast', () => ({ useToast: () => ({ show: vi.fn() }) }));

describe('Layout 페이지 전환', () => {
  it('이동한 페이지는 정확히 한 번만 마운트된다', async () => {
    const mounted = vi.fn();
    function Target() {
      useEffect(() => { mounted(); }, []);
      return <p>대상 페이지</p>;
    }
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Link to="/target">이동</Link>} />
            <Route path="/target" element={<Target />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('link', { name: '이동' }));

    expect(await screen.findByText('대상 페이지')).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(mounted).toHaveBeenCalledTimes(1);
  });
});
