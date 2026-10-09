import { useEffect, useRef, useState } from 'react';
import type { OldMaidView } from '../../api/types';
import { useSound } from '../../lib/sound';

/** "서든데스" 알림을 보이는 시간. */
export const SUDDEN_DEATH_CALLOUT_MS = 1500;
/** 서든데스 동안 심장 소리를 되풀이하는 간격. */
export const HEARTBEAT_MS = 1100;

const cardCountOf = (game: OldMaidView, playerId: number | null) =>
  game.players.find((player) => player.playerId === playerId)?.cardCount ?? 0;

/**
 * 서든데스: 카드 가진 사람이 둘뿐이고 뽑는 사람이 1장, 뽑히는 사람이 2장이라 이번 한 장에 승부가 걸린 때.
 * 짝이 없는 카드는 조커 하나뿐이라 2장 손에 조커가 있다. 장수와 차례만 보므로 누구 화면에서나 같고 조커 위치를 드러내지 않는다.
 */
export function isSuddenDeath(game: OldMaidView): boolean {
  if (game.status !== 'IN_PROGRESS' || game.stage !== 'DRAW') {
    return false;
  }
  const holders = game.players.filter((player) => player.cardCount > 0);
  return holders.length === 2 && cardCountOf(game, game.currentPlayerId) === 1 && cardCountOf(game, game.targetId) === 2;
}

/**
 * 서든데스 연출 상태. active는 서든데스인 동안 내내, callout은 판마다 처음 들어설 때 한 번 1.5초.
 * 서든데스인 동안 심장 소리를 되풀이한다(효과음 끄기·음량을 따른다). 알림이 뜰 때 무거운 울림을 한 번 낸다.
 */
export function useSuddenDeath(game: OldMaidView): { active: boolean; callout: boolean } {
  const { play } = useSound();
  const active = isSuddenDeath(game);
  const announced = useRef<number | null>(null);
  const [showing, setShowing] = useState<number | null>(null);

  useEffect(() => {
    if (!active || announced.current === game.startedAt) {
      return;
    }
    announced.current = game.startedAt;
    setShowing(game.startedAt);
    play('suddenDeath');
  }, [active, game.startedAt, play]);

  // 알림은 서든데스가 곧바로 끝나도(빠른 뽑기) 정한 시간만큼 보이고 사라진다.
  useEffect(() => {
    if (showing === null) {
      return undefined;
    }
    const timer = window.setTimeout(() => setShowing(null), SUDDEN_DEATH_CALLOUT_MS);
    return () => window.clearTimeout(timer);
  }, [showing]);

  useEffect(() => {
    if (!active) {
      return undefined;
    }
    const timer = window.setInterval(() => play('heartbeat'), HEARTBEAT_MS);
    return () => window.clearInterval(timer);
  }, [active, play]);

  return { active, callout: showing !== null && showing === game.startedAt };
}
