import { useAuth } from '../auth/AuthContext';
import { Panel } from '../components/ui';

export function LobbyPage() {
  const { member } = useAuth();
  return <Panel>{member?.nickname}님, 환영해요!</Panel>;
}
