import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ApiError, messageOf } from '../api/http';
import { recordsApi } from '../api/records';
import { roomsApi } from '../api/rooms';
import type { GameStat, Ranking, RoomSummary, RoomTheme } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { BinocularsIcon, CrownIcon, LockIcon, PlusIcon, RefreshIcon } from '../components/icons';
import { Button, Panel, TextInput } from '../components/ui';
import { useToast } from '../components/Toast';
import { entryBySlug } from '../games/catalog';
import { PaperSafariBoxArt } from '../games/PaperSafariBoxArt';
import { usePolling } from '../lib/usePolling';
import { CreateRoomModal } from '../room/CreateRoomModal';
import { PasswordModal } from '../room/PasswordModal';
import { ThemeBadge } from '../room/roomTheme';
import { RankingList } from '../records/RankingList';
import { StatSummary } from '../records/StatSummary';

const POLL_MS = 1000;
type Asking = { code: string; name: string; error: string | null };

/** 방 목록 패널(종이) 안의 카드 격자와 카드 바깥 모양. 카드 내부 구성은 그대로 두고 테두리·그림자·둥글기만 패널에 맞춘다. */
const ROOM_GRID = 'grid gap-2.5 sm:grid-cols-2';
const ROOM_CARD = 'flex items-center justify-between gap-3 rounded-2xl border border-cream-200 bg-cream-50 px-3.5 py-3 shadow-[0_2px_0_var(--color-cream-300),0_6px_12px_rgb(0_0_0/0.08)]';

function RoomListTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="font-bold text-wood-800">{title}</h2>
      <span data-testid="room-count"
        className="min-w-6 rounded-full bg-cream-200 px-2 py-0.5 text-center text-xs font-bold tabular-nums text-wood-700">{count}<span className="sr-only">개</span></span>
    </div>
  );
}

/** 내가 들어가 있는 방이면 참가·관전 대신 돌아가기. */
function ReturnAction({ code }: { code: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="text-xs font-bold text-green-700">참여 중</span>
      <Button onClick={() => navigate(`/rooms/${code}`)}>돌아가기</Button>
    </div>
  );
}

/** 게임 중인 방 카드의 버튼: 내 방은 돌아가기, 비공개는 막힌 버튼, 그 밖에는 관전하기. */
function PlayingRoomAction({ room, mine, onWatch }: { room: RoomSummary; mine: boolean; onWatch: () => void }) {
  if (mine) {
    return <ReturnAction code={room.code} />;
  }
  if (room.locked) {
    return <Button variant="secondary" disabled className="inline-flex items-center gap-1"><LockIcon className="h-4 w-4" />비공개</Button>;
  }
  return <Button variant="secondary" onClick={onWatch}>관전하기</Button>;
}

/** 기다리는 방 카드의 버튼: 내 방은 돌아가기, 그 밖에는 참가(가득 차면 막힘). */
function WaitingRoomAction({ room, mine, onJoin }: { room: RoomSummary; mine: boolean; onJoin: () => void }) {
  if (mine) {
    return <ReturnAction code={room.code} />;
  }
  const full = room.playerCount >= room.maxPlayers;
  return <Button variant="secondary" disabled={full} onClick={onJoin}>{full ? '가득 참' : '참가'}</Button>;
}

function EmptyRooms({ children }: { children: string }) {
  return <p className="rounded-xl bg-cream px-3 py-4 text-center text-sm text-stone-500">{children}</p>;
}

export function GameLobbyPage() {
  const { slug = '' } = useParams();
  const entry = entryBySlug(slug);
  const gameType = entry?.gameType ?? 'PAPER_SAFARI';
  const { member } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [creating, setCreating] = useState(false);
  const [asking, setAsking] = useState<Asking | null>(null);
  const [spins, setSpins] = useState(0);
  const reduceMotion = useReducedMotion();
  const [code, setCode] = useState('');
  const [stat, setStat] = useState<GameStat | null>(null);
  const [statFailed, setStatFailed] = useState(false);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [myCode, setMyCode] = useState<string | null>(null);

  useEffect(() => {
    recordsApi.me().then((stats) => setStat(stats.stats.find((item) => item.gameType === gameType) ?? null)).catch(() => setStatFailed(true));
    recordsApi.rankings(gameType).then(setRankings).catch(() => undefined);
  }, [gameType]);

  const failedRef = useRef(false);
  const minePendingRef = useRef(false);

  // 내 방은 목록과 따로 불러온다(실패해도 목록·알림에 영향 없음). 앞 요청이 끝나지 않았으면 이번 차례는 건너뛴다.
  const loadMine = useCallback(() => {
    if (minePendingRef.current) {
      return;
    }
    minePendingRef.current = true;
    roomsApi
      .mine()
      .then((mine) => setMyCode(mine?.code ?? null))
      .catch(() => undefined)
      .finally(() => { minePendingRef.current = false; });
  }, []);

  const loadRooms = useCallback((manual = false) => {
    loadMine();
    return roomsApi
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
  }, [toast, gameType, loadMine]);

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

  const handleCreate = (name: string, maxPlayers: number, theme: RoomTheme, password?: string) => {
    setCreating(false);
    enter(() => roomsApi.create(name, gameType, maxPlayers, theme, password));
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
      toast.show(rooms.some((room) => room.code === targetCode && room.locked) ? '게임 중인 비공개방이에요.' : '게임 중인 방이에요. 목록에서 관전할 수 있어요.');
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
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex items-center gap-3">
          <div className="h-16 w-12 overflow-hidden rounded shadow-lg"><PaperSafariBoxArt /></div>
          <div>
            <Link to="/" className="text-sm font-semibold text-cream-200 hover:text-cream-50">← 게임 목록</Link>
            <h1 className="text-xl font-black text-cream-50">페이퍼 사파리</h1>
          </div>
        </div>
        <Panel>
          <form className="flex items-end gap-2" onSubmit={handleJoinByCode}>
            <div className="flex-1">
              <TextInput id="roomCode" label="방 코드로 들어가기" placeholder="ABC234" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} required />
            </div>
            <Button type="submit" variant="secondary">입장</Button>
          </form>
        </Panel>
        <div className="space-y-6 pt-2">
          <section className="paper p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <RoomListTitle title="기다리는 방" count={waiting.length} />
              <div className="flex items-center gap-1.5">
                <button type="button" aria-label="새로고침" onClick={refresh} className="rounded-full p-1.5 text-stone-500 hover:bg-cream-200/60 hover:text-wood-800">
                  <motion.span className="block" animate={{ rotate: spins * 360 }} transition={reduceMotion ? { duration: 0 } : { duration: 0.5 }}>
                    <RefreshIcon className="h-5 w-5" />
                  </motion.span>
                </button>
                <Button onClick={() => setCreating(true)} className="inline-flex items-center gap-1"><PlusIcon className="h-4 w-4" />방 만들기</Button>
              </div>
            </div>
            {waiting.length === 0 ? <EmptyRooms>지금은 열린 방이 없어요. 방을 만들어 친구를 불러보세요!</EmptyRooms> : (
              <ul className={ROOM_GRID}>
                {waiting.map((room, index) => (
                  <motion.li
                    key={room.code}
                    className={ROOM_CARD}
                    initial={{ y: -16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 font-medium">
                        {room.name}
                        {room.locked ? <span role="img" aria-label="비공개"><LockIcon className="h-4 w-4 text-stone-500" /></span> : null}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-stone-500">
                        <CrownIcon className="h-3.5 w-3.5" />{room.hostNickname} · {room.playerCount}/{room.maxPlayers}
                      </p>
                      <p className="mt-0.5 text-xs text-stone-500"><ThemeBadge theme={room.theme} /></p>
                    </div>
                    <WaitingRoomAction room={room} mine={room.code === myCode} onJoin={() => joinFromList(room)} />
                  </motion.li>
                ))}
              </ul>
            )}
          </section>
          <section className="paper p-4">
            <div className="mb-3 flex items-center">
              <RoomListTitle title="게임 중인 방" count={playing.length} />
            </div>
            {playing.length === 0 ? <EmptyRooms>지금 진행 중인 게임이 없어요.</EmptyRooms> : (
              <ul className={ROOM_GRID}>
                {playing.map((room) => (
                  <li key={room.code} className={ROOM_CARD}>
                    <div className="min-w-0">
                      <p className="font-medium">{room.name}</p>
                      <p className="text-xs text-stone-500">
                        <span>게임 진행 중</span> · <span>{room.playerCount}명</span> · <span aria-label={`관전 ${room.spectatorCount}명`}><BinocularsIcon className="mr-0.5 inline h-3 w-3 align-[-1px]" />{room.spectatorCount}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-stone-500"><ThemeBadge theme={room.theme} /></p>
                    </div>
                    <PlayingRoomAction room={room} mine={room.code === myCode} onWatch={() => enter(() => roomsApi.watch(room.code))} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
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
      <CreateRoomModal open={creating} defaultName={`${member?.nickname ?? ''}의 방`} onClose={() => setCreating(false)} onCreate={handleCreate} />
      <PasswordModal open={asking !== null} roomName={asking?.name ?? ''} error={asking?.error ?? null}
        onSubmit={(pw) => asking && join(asking.code, asking.name, pw)} onCancel={() => setAsking(null)} />
    </div>
  );
}
