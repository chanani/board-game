import type { PaperSafariView } from '../../api/types';
import { Button, Panel } from '../../components/ui';

type Props = { game: PaperSafariView; meId: number; nicknameOf: (memberId: number) => string; onClose: () => void };

export function GameOverPanel({ game, meId, nicknameOf, onClose }: Props) {
  const won = game.winnerId === meId;
  const standings = Object.entries(game.tokens).sort(([, a], [, b]) => b - a);
  return (
    <Panel className="mx-auto max-w-md text-center">
      <p className="text-4xl">{won ? '🏆' : '🌿'}</p>
      <h2 className="mt-2 text-2xl font-bold">{game.winnerId !== null ? `${nicknameOf(game.winnerId)}님 승리!` : '게임 종료'}</h2>
      <ul className="my-4 space-y-1 text-sm">
        {standings.map(([memberId, tokens]) => (
          <li key={memberId} className="flex justify-between rounded-lg bg-stone-50 px-3 py-1.5">
            <span>{nicknameOf(Number(memberId))}</span>
            <span>토큰 {tokens}개</span>
          </li>
        ))}
      </ul>
      <Button onClick={onClose}>대기실로 돌아가기</Button>
    </Panel>
  );
}
