export type ApiErrorBody = { status: number; code: string; message: string };

export type Member = { id: number; loginId: string; nickname: string };

export type GameType = 'PAPER_SAFARI';
export type ResultType = 'WIN' | 'DRAW' | 'LOSE';

export type RoomStatus = 'WAITING' | 'PLAYING';
export type RoomMember = { id: number; nickname: string; host: boolean; connected: boolean; offlineSeconds: number };
export type Room = {
  code: string;
  name: string;
  gameType: GameType;
  gameTypeName: string;
  status: RoomStatus;
  hostId: number;
  maxPlayers: number;
  members: RoomMember[];
};
export type RoomSummary = {
  code: string;
  name: string;
  gameType: GameType;
  gameTypeName: string;
  playerCount: number;
  maxPlayers: number;
  hostNickname: string;
};

export type GameActionType = 'FLIP' | 'DRAW_DECK' | 'DRAW_DISCARD' | 'SWAP' | 'DISCARD' | 'PEEK' | 'READY';
export type GameAction = { type: GameActionType; column?: number; row?: number };

export type CardKind = 'NUMBER' | 'ELEPHANT' | 'TARZAN' | 'FOX' | 'WILD';
export type CardView = { kind: CardKind; value: number };
export type SlotView = { column: number; row: number; faceUp: boolean; known: boolean; card: CardView | null };
export type BoardView = { playerId: number; slots: SlotView[] };
export type HeldView = { playerId: number; source: 'DECK' | 'DISCARD'; card: CardView | null };
export type TurnPhase = 'SETUP_FLIP' | 'DRAW' | 'PLACE' | 'PEEK' | 'ROUND_OVER';
export type RoundView = {
  phase: TurnPhase;
  currentPlayerId: number;
  deckSize: number;
  discardTop: CardView | null;
  held: HeldView | null;
  boards: BoardView[];
};
export type PlayerResultView = { playerId: number; score: number; outcome: ResultType };
export type GameStatus = 'IN_ROUND' | 'ROUND_OVER' | 'GAME_OVER';
export type PaperSafariView = {
  viewerId: number;
  status: GameStatus;
  roundNumber: number;
  round: RoundView;
  tokens: Record<string, number>;
  lastRoundResult: { players: PlayerResultView[] } | null;
  winnerId: number | null;
};
export type PaperSafariSessionView = { game: PaperSafariView; readyPlayerIds: number[] };

export type GameStat = {
  gameType: GameType;
  gameTypeName: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number | null;
  rounds: number;
  roundWins: number;
  roundDraws: number;
  roundLosses: number;
  roundWinRate: number | null;
  averageRoundScore: number | null;
};
export type MemberStats = { memberId: number; nickname: string; stats: GameStat[] };
export type MatchPlayer = { memberId: number; nickname: string; result: ResultType | null; tokens: number };
export type RoundResult = { roundNumber: number; result: ResultType; score: number };
export type RecentMatch = {
  matchId: number;
  gameType: GameType;
  startedAt: string;
  endedAt: string;
  result: ResultType | null;
  tokens: number;
  players: MatchPlayer[];
  rounds: RoundResult[];
};
export type Ranking = {
  rank: number;
  memberId: number;
  nickname: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
};
