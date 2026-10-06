export type ApiErrorBody = { status: number; code: string; message: string };

export type Member = { id: number; loginId: string; nickname: string };

export type GameType = 'PAPER_SAFARI';
export type ResultType = 'WIN' | 'DRAW' | 'LOSE';

export type RoomStatus = 'WAITING' | 'PLAYING';
export type RoomTheme = 'WOOD' | 'SUNSET' | 'MOONLIT' | 'AURORA' | 'BEACH';
export type RoomMember = { id: number; nickname: string; host: boolean; connected: boolean; offlineSeconds: number; ready: boolean };
export type Room = {
  code: string;
  name: string;
  gameType: GameType;
  gameTypeName: string;
  status: RoomStatus;
  hostId: number;
  maxPlayers: number;
  locked: boolean;
  members: RoomMember[];
  spectators: { id: number; nickname: string }[];
  theme: RoomTheme;
};
export type RoomSummary = {
  code: string;
  name: string;
  gameType: GameType;
  gameTypeName: string;
  playerCount: number;
  maxPlayers: number;
  hostNickname: string;
  status: RoomStatus;
  locked: boolean;
  roundNumber: number | null;
  spectatorCount: number;
  theme: RoomTheme;
};

export type GameActionType = 'FLIP' | 'DRAW_DECK' | 'DRAW_DISCARD' | 'SWAP' | 'DISCARD' | 'PEEK' | 'CANCEL_DRAW';
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
export type GameStatus = 'IN_ROUND' | 'GAME_OVER';
export type PaperSafariView = {
  viewerId: number;
  status: GameStatus;
  roundNumber: number;
  round: RoundView;
  lastRoundResult: { players: PlayerResultView[] } | null;
  winnerId: number | null;
  /** 행동을 기다리는 단계의 마감 시각(epoch ms). 기다리지 않으면 null. */
  deadline?: number | null;
  /** 서버가 이 화면을 만든 시각(epoch ms). deadline과 빼서 시계 차이를 없앤다. */
  serverNow?: number;
  /** 마지막 시간 초과 자동 행동의 대상(시작 뒤집기면 여러 명). */
  lastAutoActorIds?: number[];
  /** 시간 초과 자동 행동이 일어날 때만 1씩 는다. */
  autoActSeq?: number;
};
export type PaperSafariSessionView = { gameType?: 'PAPER_SAFARI'; game: PaperSafariView };
/** /user/queue/game으로 오는 세션 화면. Task 10에서 우노 화면을 더한다. */
export type SessionView = PaperSafariSessionView;

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

export type GameSummary = {
  gameType: GameType;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  waitingPlayers: number;
  playingPlayers: number;
};
