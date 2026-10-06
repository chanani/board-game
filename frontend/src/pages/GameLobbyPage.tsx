import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ApiError, messageOf } from '../api/http';
import { recordsApi } from '../api/records';
import { roomsApi } from '../api/rooms';
import type { GameStat, Ranking, RoomSummary } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { LockIcon, RefreshIcon } from '../components/icons';
import { Felt } from '../components/Felt';
import { Button, Panel, TextInput } from '../components/ui';
import { useToast } from '../components/Toast';
import { entryBySlug } from '../games/catalog';
import { PaperSafariBoxArt } from '../games/PaperSafariBoxArt';
import { usePolling } from '../lib/usePolling';
import { PasswordModal } from '../room/PasswordModal';
import { RankingList } from '../records/RankingList';
import { StatSummary } from '../records/StatSummary';

const POLL_MS = 1000;
const SEAT_OPTIONS = [2, 3, 4, 5];
type Asking = { code: string; name: string; error: string | null };

export function GameLobbyPage() {
  const { slug = '' } = useParams();
  const entry = entryBySlug(slug);
  const gameType = entry?.gameType ?? 'PAPER_SAFARI';
  const { member } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [name, setName] = useState(`${member?.nickname ?? ''}의 방`);
  const [maxPlayers, setMaxPlayers] = useState(5);
  const [priv, setPriv] = useState(false);
  const [password, setPassword] = useState('');
  const [asking, setAsking] = useState<Asking | null>(null);
  const [spins, setSpins] = useState(0);
  const reduceMotion = useReducedMotion();
  const [code, setCode] = useState('');
  const [stat, setStat] = useState<GameStat | null>(null);
  const [statFailed, setStatFailed] = useState(false);
  const [rankings, setRankings] = useState<Ranking[]>([]);

  useEffect(() => {
    recordsApi.me().then((stats) => setStat(stats.stats.find((item) => item.gameType === gameType) ?? null)).catch(() => setStatFailed(true));
    recordsApi.rankings(gameType).then(setRankings).catch(() => undefined);
  }, [gameType]);

  const failedRef = useRef(false);

  const loadRooms = useCallback((manual = false) => roomsApi
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
    }), [toast, gameType]);

  usePolling(() => loadRooms(), POLL_MS);

  const refresh = () => {
    setSpins((count) => count + 1);
    loadRooms(true);
  };

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
    enter(() => roomsApi.create(name, gameType, maxPlayers, priv ? password : undefined));
  };

  const join = async (targetCode: string, targetName: string, pw?: string) => {
    try {
      const room = await roomsApi.join(targetCode, pw);
      setAsking(null);
      navigate(`/rooms/${room.code}`);
    } catch (error) {
      handleJoinError(error, targetCode, targetName, pw);
    }
  };

  const handleJoinError = (error: unknown, targetCode: string, targetName: string, pw?: string) => {
    if (error instanceof ApiError && error.code === 'ROOM_PASSWORD_MISMATCH') {
      setAsking({ code: targetCode, name: targetName, error: pw === undefined ? null : error.message });
      return;
    }
    if (error instanceof ApiError && error.code === 'ROOM_ALREADY_PLAYING') {
      setAsking(null);
      toast.show('게임 중인 방이에요. 목록에서 관전할 수 있어요.');
      return;
    }
    toast.show(messageOf(error));
  };

  const handleJoinByCode = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = code.trim();
    join(trimmed, rooms.find((room) => room.code === trimmed)?.name ?? trimmed);
  };

  const joinFromList = (room: RoomSummary) => {
    if (room.locked) {
      setAsking({ code: room.code, name: room.name, error: null });
      return;
    }
    join(room.code, room.name);
  };

  const waiting = rooms.filter((room) => room.status === 'WAITING');
  const playing = rooms.filter((room) => room.status === 'PLAYING');

  if (!entry) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex items-center gap-3">
          <div className="h-16 w-12 overflow-hidden rounded shadow-lg"><PaperSafariBoxArt /></div>
          <div>
            <Link to="/" className="text-sm font-semibold text-cream-200 hover:text-cream-50">← 게임 목록</Link>
            <h1 className="text-xl font-black text-cream-50">페이퍼 사파리</h1>
          </div>
        </div>
        <Panel>
          <div className="grid gap-4 sm:grid-cols-2">
            <form className="space-y-3" onSubmit={handleCreate}>
              <TextInput id="roomName" label="새 방 만들기" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} required />
              <div>
                <span id="seatLabel" className="text-sm font-semibold text-wood-700">최대 인원</span>
                <div role="radiogroup" aria-labelledby="seatLabel" className="mt-1 flex gap-2">
                  {SEAT_OPTIONS.map((count) => (
                    <button key={count} type="button" role="radio" aria-checked={maxPlayers === count} onClick={() => setMaxPlayers(count)}
                      className={`press-3d h-9 w-9 rounded-full text-sm font-bold shadow ${maxPlayers === count ? 'bg-mustard-400 text-wood-800' : 'bg-cream-50 text-wood-700'}`}>
                      {count}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-wood-700">
                <input type="checkbox" checked={priv} onChange={(e) => setPriv(e.target.checked)} />
                비공개방
              </label>
              {priv ? (
                <TextInput id="createPassword" label="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  minLength={4} maxLength={20} autoComplete="off" placeholder="4~20자" required />
              ) : null}
              <Button type="submit">방 만들기</Button>
            </form>
            <form className="space-y-2" onSubmit={handleJoinByCode}>
              <TextInput id="roomCode" label="방 코드로 들어가기" placeholder="ABC234" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} required />
              <Button type="submit" variant="secondary">입장</Button>
            </form>
          </div>
        </Panel>
        <Felt className="mt-8 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-cream-50">기다리는 방</h2>
            <button type="button" aria-label="새로고침" onClick={refresh} className="rounded-full p-1 text-cream-200 hover:text-cream-50">
              <motion.span className="block" animate={{ rotate: spins * 360 }} transition={reduceMotion ? { duration: 0 } : { duration: 0.5 }}>
                <RefreshIcon className="h-5 w-5" />
              </motion.span>
            </button>
          </div>
          {waiting.length === 0 ? <p className="text-sm text-cream-200">지금은 열린 방이 없어요. 방을 만들어 친구를 불러보세요!</p> : null}
          <ul className="grid gap-2 sm:grid-cols-2">
            {waiting.map((room, index) => {
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
                    <p className="flex items-center gap-1 font-medium">
                      {room.name}
                      {room.locked ? <span role="img" aria-label="비공개"><LockIcon className="h-4 w-4 text-stone-500" /></span> : null}
                    </p>
                    <p className="text-xs text-stone-500">
                      👑 {room.hostNickname} · {room.playerCount}/{room.maxPlayers}
                    </p>
                  </div>
                  <Button variant="secondary" disabled={full} onClick={() => joinFromList(room)}>
                    {full ? '가득 참' : '참가'}
                  </Button>
                </motion.li>
              );
            })}
          </ul>
        </Felt>
        <Felt className="p-4">
          <h2 className="mb-3 font-bold text-cream-50">게임 중인 방</h2>
          {playing.length === 0 ? <p className="text-sm text-cream-200">지금 진행 중인 게임이 없어요.</p> : null}
          <ul className="grid gap-2 sm:grid-cols-2">
            {playing.map((room) => (
              <li key={room.code} className="paper flex items-center justify-between p-3">
                <div>
                  <p className="font-medium">{room.name}</p>
                  <p className="text-xs text-stone-500">
                    <span>{room.roundNumber ?? 1}라운드 진행 중</span> · <span aria-label={`관전 ${room.spectatorCount}명`}>👀 {room.spectatorCount}</span>
                  </p>
                </div>
                {room.locked ? (
                  <Button variant="secondary" disabled className="inline-flex items-center gap-1"><LockIcon className="h-4 w-4" />비공개</Button>
                ) : (
                  <Button variant="secondary" onClick={() => enter(() => roomsApi.watch(room.code))}>관전하기</Button>
                )}
              </li>
            ))}
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
      <PasswordModal open={asking !== null} roomName={asking?.name ?? ''} error={asking?.error ?? null}
        onSubmit={(pw) => asking && join(asking.code, asking.name, pw)} onCancel={() => setAsking(null)} />
    </div>
  );
}
