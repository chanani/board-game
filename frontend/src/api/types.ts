export type ApiErrorBody = { status: number; code: string; message: string };

/** avatar: 프로필 그림 키(CAT 등). 서버가 늘 채워 주지만 예전 응답·테스트를 위해 없을 수 있고, 그때는 id로 정한 기본 그림. */
export type Member = { id: number; loginId: string; nickname: string; avatar?: string };

export type GameType = 'PAPER_SAFARI' | 'UNO' | 'OLD_MAID';
export type ResultType = 'WIN' | 'DRAW' | 'LOSE';

export type RoomStatus = 'WAITING' | 'PLAYING';
export type RoomTheme = 'WOOD' | 'SUNSET' | 'MOONLIT' | 'AURORA' | 'BEACH';
export type BotDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type RoomMember = { id: number; nickname: string; avatar?: string; host: boolean; connected: boolean; offlineSeconds: number; ready: boolean; bot?: boolean; difficulty?: BotDifficulty | null };
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
  spectators: { id: number; nickname: string; avatar?: string }[];
  theme: RoomTheme;
  /** 컴퓨터가 낀 연습 경기(전적에 넣지 않는다). */
  practice?: boolean;
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
export type UnoActionType = 'PLAY' | 'DRAW' | 'KEEP' | 'CHOOSE_COLOR' | 'CHALLENGE' | 'ACCEPT' | 'CALL_UNO' | 'CATCH_UNO';
export type OldMaidActionType = 'SHUFFLE' | 'PEEK' | 'DISCARD_ALL';
export type GameAction = {
  type: GameActionType | UnoActionType | OldMaidActionType;
  column?: number;
  row?: number;
  cardId?: number;
  color?: UnoColor;
  targetId?: number;
  index?: number | null;
  /** 도둑잡기 DISCARD: 짝으로 버릴 서로 다른 두 장. */
  cardIds?: number[];
};

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

export type UnoColor = 'RED' | 'YELLOW' | 'GREEN' | 'BLUE';
export type UnoCardKind = 'NUMBER' | 'SKIP' | 'REVERSE' | 'DRAW_TWO' | 'WILD' | 'WILD_DRAW_FOUR';
export type UnoCard = { id: number; kind: UnoCardKind; color: UnoColor | null; number: number | null };
export type UnoStage = 'PLAY' | 'DRAWN' | 'CHOOSE_COLOR' | 'CHALLENGE';
export type UnoDirection = 'CLOCKWISE' | 'COUNTER_CLOCKWISE';
export type UnoPlayerView = { playerId: number; cardCount: number; unoDeclared: boolean };
export type UnoEventType = 'START' | 'FIRST_CARD_REDRAWN' | 'PLAY' | 'COLOR' | 'DRAW' | 'PASS' | 'SKIP' | 'REVERSE'
  | 'PENALTY' | 'CHALLENGE' | 'UNO_CALL' | 'UNO_CAUGHT' | 'RESHUFFLE' | 'GAME_END';
export type UnoEventReason = 'KEEP' | 'NO_PLAYABLE' | 'EMPTY_PILE' | 'DRAW_TWO' | 'WILD_DRAW_FOUR' | 'CHALLENGE_FAILED'
  | 'CHALLENGE_GUILTY' | 'UNO_CAUGHT' | 'GUILTY' | 'INNOCENT' | 'EMPTY_HAND' | 'FORFEIT';
export type UnoEvent = {
  seq: number; type: UnoEventType; actorId: number | null; targetId: number | null; card: UnoCard | null;
  color: UnoColor | null; count: number | null; reason: UnoEventReason | null; auto: boolean;
};
/** previousColor: +4를 내기 직전의 색. 도전 판정은 고른 색이 아니라 이 색 기준이다. */
export type UnoReveal = { playerId: number; cards: UnoCard[]; guilty: boolean; previousColor: UnoColor | null };
export type UnoResultPlayer = { playerId: number; cards: UnoCard[]; points: number };
export type UnoResult = { reason: 'EMPTY_HAND' | 'FORFEIT'; winnerId: number; points: number; players: UnoResultPlayer[] };
export type UnoView = {
  viewerId: number;
  status: 'IN_PROGRESS' | 'GAME_OVER';
  /** 게임 시작 시각(epoch ms). 결과 창 닫음 기억 키(D26)와 새 게임 판단에 쓴다. */
  startedAt: number;
  stage: UnoStage | null;
  currentPlayerId: number | null;
  direction: UnoDirection;
  currentColor: UnoColor | null;
  discardTop: UnoCard;
  discardCount: number;
  drawPileCount: number;
  participantIds: number[];
  players: UnoPlayerView[];
  /** 남은 참가자면 내 손패(받은 순서), 아니면 null. */
  hand: UnoCard[] | null;
  playableCardIds: number[];
  wildDrawFourRisky: boolean;
  drawnCardId: number | null;
  canCallUno: boolean;
  unoCatch: { playerId: number } | null;
  canCatch: boolean;
  /** previousColor: +4를 내기 직전의 색(도전 판정 기준). */
  challenge: { byId: number; targetId: number; previousColor: UnoColor | null } | null;
  reveal: UnoReveal | null;
  result: UnoResult | null;
  winnerId: number | null;
  deadline: number | null;
  serverNow: number;
  lastAutoActorIds: number[];
  autoActSeq: number;
  events: UnoEvent[];
};
export type UnoSessionView = { gameType: 'UNO'; game: UnoView };

export type Suit = 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';
export type PlayingRank = 'ACE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE' | 'SIX' | 'SEVEN' | 'EIGHT' | 'NINE' | 'TEN'
  | 'JACK' | 'QUEEN' | 'KING' | 'JOKER';
/** 조커는 suit = null, rank = 'JOKER', id = 52. */
export type PlayingCard = { id: number; suit: Suit | null; rank: PlayingRank };
/** openingDone: 처음 버리기 단계에서 손에 짝이 남지 않았는지("다 버림"). 다른 단계에서는 늘 true. */
export type OldMaidPlayerView = { playerId: number; cardCount: number; rank: number | null; forfeited: boolean; openingDone: boolean };
export type OldMaidPlacement = 'FINISHED' | 'THIEF' | 'LAST_STANDING' | 'FORFEITED';
export type OldMaidRankEntry = { playerId: number; rank: number; placement: OldMaidPlacement };
export type OldMaidResult = { reason: 'NORMAL' | 'FORFEIT'; ranking: OldMaidRankEntry[]; thiefId: number | null };
export type OldMaidEventType = 'DEAL' | 'START' | 'DRAW' | 'PAIR' | 'FINISH' | 'SHUFFLE' | 'FORFEIT' | 'GAME_END';
export type OldMaidEvent = {
  seq: number; type: OldMaidEventType; actorId: number | null; targetId: number | null; cards: PlayingCard[];
  count: number | null; reason: 'NORMAL' | 'FORFEIT' | null; auto: boolean;
};
/** 버린 짝 한 쌍과 버린 사람(공개 정보, 버린 순서대로). */
export type OldMaidDiscard = { playerId: number; cards: PlayingCard[] };
/** 처음 버리기(모두 동시에) -> 뽑기 <-> 짝 버리기(뽑은 카드로 짝이 된 뽑은 사람). */
export type OldMaidStage = 'OPENING_DISCARD' | 'DRAW' | 'DISCARD';
export type OldMaidView = {
  viewerId: number;
  status: 'IN_PROGRESS' | 'GAME_OVER';
  /** 게임 중 단계(끝나면 null). 처음 버리기 단계에는 currentPlayerId·targetId·peek이 null이고 turnSeq = 0. */
  stage: OldMaidStage | null;
  startedAt: number;
  currentPlayerId: number | null;
  targetId: number | null;
  turnSeq: number;
  participantIds: number[];
  players: OldMaidPlayerView[];
  hand: PlayingCard[] | null;
  peek: { index: number | null; seq: number } | null;
  canShuffle: boolean;
  /** 내가 지금 짝을 골라 버릴 수 있는지(처음 버리기 단계에 내 손에 짝이 있거나, 짝 버리기 단계의 뽑은 사람). */
  canDiscard: boolean;
  discardCount: number;
  recentPairs: PlayingCard[][];
  /** 처음부터 지금까지 버린 짝 전체(오래된 것부터). 버린 카드 목록 창이 쓴다. */
  discards: OldMaidDiscard[];
  result: OldMaidResult | null;
  winnerId: number | null;
  deadline: number | null;
  serverNow: number;
  lastAutoActorIds: number[];
  autoActSeq: number;
  events: OldMaidEvent[];
};
export type OldMaidSessionView = { gameType: 'OLD_MAID'; game: OldMaidView };
/** /user/queue/signal: 뽑는 사람이 고르는 카드(스펙 4.3). index = null이면 고르지 않음. */
export type OldMaidPeekSignal = {
  gameType: 'OLD_MAID'; type: 'PEEK'; startedAt: number; turnSeq: number; drawerId: number; targetId: number;
  index: number | null; seq: number;
};
export type GameSignal = OldMaidPeekSignal;
/** /user/queue/game으로 오는 세션 화면. */
export type SessionView = PaperSafariSessionView | UnoSessionView | OldMaidSessionView;

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
export type MemberStats = { memberId: number; nickname: string; avatar?: string; stats: GameStat[] };
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
  avatar?: string;
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
