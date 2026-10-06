import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { messageOf } from '../api/http';
import { recordsApi } from '../api/records';
import { roomsApi } from '../api/rooms';
import type { GameStat, Ranking, RoomSummary } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Felt } from '../components/Felt';
import { Button, Panel, TextInput } from '../components/ui';
import { useToast } from '../components/Toast';
import { entryBySlug } from '../games/catalog';
import { PaperSafariBoxArt } from '../games/PaperSafariBoxArt';
import { RankingList } from '../records/RankingList';
import { StatSummary } from '../records/StatSummary';

export function GameLobbyPage() {
  const { slug = '' } = useParams();
  const entry = entryBySlug(slug);
  const gameType = entry?.gameType ?? 'PAPER_SAFARI';
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
    recordsApi.me().then((stats) => setStat(stats.stats.find((item) => item.gameType === gameType) ?? null)).catch(() => setStatFailed(true));
    recordsApi.rankings(gameType).then(setRankings).catch(() => undefined);
  }, [navigate, gameType]);

  const failedRef = useRef(false);

  const loadRooms = useCallback((manual = false) => {
    roomsApi
      .list(gameType)
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
  }, [toast, gameType]);

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
    enter(() => roomsApi.create(name, gameType));
  };

  const handleJoinByCode = (event: FormEvent) => {
    event.preventDefault();
    enter(() => roomsApi.join(code.trim()));
  };

  if (!entry) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex items-center gap-3">
          <div className="h-16 w-12 overflow-hidden rounded shadow-lg"><PaperSafariBoxArt /></div>
          <div>
            <Link to="/" className="text-sm font-semibold text-cream-200 hover:text-cream-50">← 게임 선반</Link>
            <h1 className="text-xl font-black text-cream-50">페이퍼 사파리</h1>
          </div>
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
        <Felt className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-cream-50">기다리는 방</h2>
            <button type="button" onClick={() => loadRooms(true)} className="text-sm text-cream-200 hover:text-cream-50">새로고침</button>
          </div>
          {rooms.length === 0 ? <p className="text-sm text-cream-200">지금은 열린 방이 없어요. 방을 만들어 친구를 불러보세요!</p> : null}
          <ul className="grid gap-2 sm:grid-cols-2">
            {rooms.map((room, index) => {
              const full = room.playerCount >= room.maxPlayers;
              return (
                <motion.li
                  key={room.code}
                  className="paper flex items-center justify-between p-3"
                  initial={{ y: -16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div>
                    <p className="font-medium">{room.name}</p>
                    <p className="text-xs text-stone-500">
                      👑 {room.hostNickname}{' '}
                      <span aria-label={`${room.playerCount}/${room.maxPlayers}명`}>
                        {'●'.repeat(Math.min(room.playerCount, room.maxPlayers)) + '○'.repeat(Math.max(0, room.maxPlayers - room.playerCount))}
                      </span>
                    </p>
                  </div>
                  <Button variant="secondary" disabled={full} onClick={() => enter(() => roomsApi.join(room.code))}>
                    {full ? '가득 참' : '참가'}
                  </Button>
                </motion.li>
              );
            })}
          </ul>
        </Felt>
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
