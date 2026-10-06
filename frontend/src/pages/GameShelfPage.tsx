import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gamesApi } from '../api/games';
import { messageOf } from '../api/http';
import type { GameSummary, GameType } from '../api/types';
import { BookIcon, HourglassIcon } from '../components/icons';
import { usePolling } from '../lib/usePolling';
import { RollingNumber } from '../components/RollingNumber';
import { useToast } from '../components/Toast';
import { WoodRail } from '../components/WoodRail';
import { CATALOG, COMING_SOON_SLOTS, lobbyPath } from '../games/catalog';
import { GameBox } from '../games/GameBox';
import { RulesCarousel } from '../games/papersafari/RulesCarousel';

const POLL_MS = 1000;
const DEFAULT_NAMES: Record<GameType, string> = { PAPER_SAFARI: '페이퍼 사파리' };

function Counts({ summary }: { summary: GameSummary | undefined }) {
  const waiting = summary?.waitingPlayers ?? null;
  const playing = summary?.playingPlayers ?? null;
  return (
    <div className="mt-3 flex justify-center gap-1.5 text-xs font-bold">
      <span aria-label={waiting === null ? '대기 인원 알 수 없음' : `대기 ${waiting}명`}
        className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900 shadow-[0_2px_0_rgb(0_0_0/0.35)]">
        <HourglassIcon className="mr-0.5 inline h-3 w-3 align-[-2px]" />대기 <RollingNumber value={waiting} />
      </span>
      <span aria-label={playing === null ? '플레이 인원 알 수 없음' : `플레이 ${playing}명`}
        className="rounded-full bg-green-200 px-2 py-0.5 text-green-900 shadow-[0_2px_0_rgb(0_0_0/0.35)]">
        <span aria-hidden="true" className="live-dot mr-1 inline-block h-1.5 w-1.5 rounded-full bg-green-600 align-middle" />
        플레이 <RollingNumber value={playing} />
      </span>
    </div>
  );
}

export function GameShelfPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [summaries, setSummaries] = useState<GameSummary[] | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const failedRef = useRef(false);

  usePolling(() => gamesApi
    .list()
    .then((next) => {
      failedRef.current = false;
      setSummaries(next);
    })
    .catch((error) => {
      if (!failedRef.current) {
        toast.show(messageOf(error));
      }
      failedRef.current = true;
      setSummaries(null);
    }), POLL_MS);

  const summaryOf = (gameType: GameType) => summaries?.find((item) => item.gameType === gameType);

  return (
    <div className="mx-auto max-w-4xl pt-6">
      <h1 className="mb-1 text-center text-2xl font-black text-cream-50 drop-shadow">오늘은 뭘 할까요?</h1>
      <p className="mb-8 text-center text-sm text-cream-200/80">목록에서 게임을 골라 주세요</p>
      <div className="flex flex-wrap items-end justify-center gap-10 px-6">
        {CATALOG.map((entry) => {
          const summary = summaryOf(entry.gameType);
          const name = summary?.name ?? DEFAULT_NAMES[entry.gameType];
          return (
            <div key={entry.slug} className="flex flex-col items-center">
              <GameBox entry={entry} name={name} onOpen={() => navigate(lobbyPath(entry.gameType))} />
              <p className="mt-3 text-sm font-bold text-cream-50">{name}</p>
              <p className="text-xs text-cream-200/70">{entry.tagline}</p>
              <button type="button" onClick={() => setRulesOpen(true)}
                className="press-3d mt-3 inline-flex items-center gap-1.5 rounded-full bg-cream-50 px-3 py-1 text-xs font-bold text-wood-800 shadow">
                <BookIcon className="h-4 w-4" />규칙 보기
              </button>
              <Counts summary={summaries ? summary ?? emptySummary(entry.gameType, name) : undefined} />
            </div>
          );
        })}
        {Array.from({ length: COMING_SOON_SLOTS }, (_, index) => (
          <div key={`soon-${index}`} className="flex flex-col items-center opacity-75">
            <GameBox name="준비 중" />
            <p className="mt-3 text-sm font-bold text-cream-200">준비 중</p>
          </div>
        ))}
      </div>
      <WoodRail className="mx-2 mt-4 h-4" />
      <RulesCarousel open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}

function emptySummary(gameType: GameType, name: string): GameSummary {
  return { gameType, name, minPlayers: 0, maxPlayers: 0, waitingPlayers: 0, playingPlayers: 0 };
}
