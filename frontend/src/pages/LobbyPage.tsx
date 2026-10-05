import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { messageOf } from '../api/http';
import { recordsApi } from '../api/records';
import { roomsApi } from '../api/rooms';
import type { GameStat, Ranking, RoomSummary } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Button, Panel, TextInput } from '../components/ui';
import { useToast } from '../components/Toast';
import { RankingList } from '../records/RankingList';
import { StatSummary } from '../records/StatSummary';

const GAME = 'PAPER_SAFARI' as const;

export function LobbyPage() {
  const { member } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [name, setName] = useState(`${member?.nickname ?? ''}의 방`);
  const [code, setCode] = useState('');
  const [stat, setStat] = useState<GameStat | null>(null);
  const [statFailed, setStatFailed] = useState(false);
  const [rankings, setRankings] = useState<Ranking[]>([]);

  useEffect(() => {
    roomsApi
      .mine()
      .then((room) => {
        if (room) {
          navigate(`/rooms/${room.code}`, { replace: true });
        }
      })
      .catch(() => undefined);
    recordsApi.me().then((stats) => setStat(stats.stats.find((item) => item.gameType === GAME) ?? null)).catch(() => setStatFailed(true));
    recordsApi.rankings(GAME).then(setRankings).catch(() => undefined);
  }, [navigate]);

  const failedRef = useRef(false);

  const loadRooms = useCallback((manual = false) => {
    roomsApi
      .list(GAME)
      .then((next) => {
        failedRef.current = false;
        setRooms(next);
      })
      .catch((error) => {
        if (manual || !failedRef.current) {
          toast.show(messageOf(error));
        }
        failedRef.current = true;
      });
  }, [toast]);

  useEffect(() => {
    loadRooms();
    const timer = window.setInterval(() => loadRooms(), 5000);
    return () => window.clearInterval(timer);
  }, [loadRooms]);

  const enter = async (action: () => Promise<{ code: string }>) => {
    try {
      const room = await action();
      navigate(`/rooms/${room.code}`);
    } catch (error) {
      toast.show(messageOf(error));
    }
  };

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    enter(() => roomsApi.create(name, GAME));
  };

  const handleJoinByCode = (event: FormEvent) => {
    event.preventDefault();
    enter(() => roomsApi.join(code.trim()));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex gap-2">
          <span className="rounded-xl bg-safari-600 px-4 py-2 text-sm font-semibold text-white">🦊 페이퍼 사파리</span>
        </div>
        <Panel>
          <div className="grid gap-4 sm:grid-cols-2">
            <form className="space-y-2" onSubmit={handleCreate}>
              <TextInput id="roomName" label="새 방 만들기" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} required />
              <Button type="submit">방 만들기</Button>
            </form>
            <form className="space-y-2" onSubmit={handleJoinByCode}>
              <TextInput id="roomCode" label="방 코드로 들어가기" placeholder="ABC234" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} required />
              <Button type="submit" variant="secondary">입장</Button>
            </form>
          </div>
        </Panel>
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">기다리는 방</h2>
            <button type="button" onClick={() => loadRooms(true)} className="text-sm text-stone-500 hover:text-stone-800">새로고침</button>
          </div>
          {rooms.length === 0 ? <p className="text-sm text-stone-500">지금은 열린 방이 없어요. 방을 만들어 친구를 불러보세요!</p> : null}
          <ul className="grid gap-2 sm:grid-cols-2">
            {rooms.map((room) => {
              const full = room.playerCount >= room.maxPlayers;
              return (
                <li key={room.code} className="flex items-center justify-between rounded-xl border border-stone-200 px-3 py-2">
                  <div>
                    <p className="font-medium">{room.name}</p>
                    <p className="text-xs text-stone-500">
                      👑 {room.hostNickname} · {room.playerCount}/{room.maxPlayers}명
                    </p>
                  </div>
                  <Button variant="secondary" disabled={full} onClick={() => enter(() => roomsApi.join(room.code))}>
                    {full ? '가득 참' : '참가'}
                  </Button>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
      <div className="space-y-4">
        <Panel>
          <h2 className="mb-2 font-bold">내 전적</h2>
          {stat ? <StatSummary stat={stat} /> : <p className="text-sm text-stone-500">{statFailed ? '전적을 불러오지 못했어요.' : '불러오는 중…'}</p>}
        </Panel>
        <Panel>
          <h2 className="mb-2 font-bold">순위표 TOP 5</h2>
          <RankingList rankings={rankings} limit={5} />
        </Panel>
      </div>
    </div>
  );
}
