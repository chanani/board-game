import { MotionConfig } from 'motion/react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/Toast';
import { SoundProvider } from './lib/sound';
import { GameLobbyPage } from './pages/GameLobbyPage';
import { GameShelfPage } from './pages/GameShelfPage';
import { LoginPage } from './pages/LoginPage';
import { RecordsPage } from './pages/RecordsPage';
import { RoomPage } from './pages/RoomPage';
import { SignupPage } from './pages/SignupPage';

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <SoundProvider>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route element={<RequireAuth />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<GameShelfPage />} />
                  <Route path="/games/:slug" element={<GameLobbyPage />} />
                  <Route path="/rooms/:code" element={<RoomPage />} />
                  <Route path="/records" element={<RecordsPage />} />
                  <Route path="/records/:memberId" element={<RecordsPage />} />
                  <Route path="/settings" element={<Navigate to="/" replace />} />
                </Route>
              </Route>
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </SoundProvider>
    </MotionConfig>
  );
}
