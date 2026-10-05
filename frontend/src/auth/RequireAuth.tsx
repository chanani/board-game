import { Navigate, Outlet } from 'react-router-dom';
import { RealtimeProvider } from '../realtime/RealtimeContext';
import { useAuth } from './AuthContext';

export function RequireAuth() {
  const { member, loading } = useAuth();
  if (loading) {
    return <p className="p-10 text-center text-stone-500">불러오는 중…</p>;
  }
  if (!member) {
    return <Navigate to="/login" replace />;
  }
  return (
    <RealtimeProvider>
      <Outlet />
    </RealtimeProvider>
  );
}
