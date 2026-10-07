import type { ComponentType, ReactNode } from 'react';
import type { GameAction, GameSignal, GameType, PaperSafariView, Room, SessionView } from '../api/types';
import type { LogDraft, LogEntry } from '../lib/eventLog';

export type Nickname = (memberId: number) => string;

/**
 * 화면이 바뀐 한 번. from/to는 세션 화면의 game. 동기화 응답이면 animate = false.
 * 기본 타입 인자는 페이퍼 사파리(PaperSafariTable·useCardMotion·useFinale가 타입 인자 없이 쓴다).
 */
export type ViewTransition<G = PaperSafariView> = { seq: number; from: G | null; to: G; animate: boolean };

/** 게임 테이블 컴포넌트가 받는 props(페이퍼 사파리 테이블 props와 같다). */
export type TableProps<V extends SessionView> = {
  view: V;
  room: Room;
  meId: number;
  log: LogEntry[];
  receivedAt: number;
  now: number;
  errorSeq: number;
  nicknameOf: Nickname;
  send: (action: GameAction) => void;
  onCloseGameOver: () => void;
  onReadyNext: () => void;
  transition?: ViewTransition<V['game']> | null;
  /** 상태를 바꾸지 않는 가벼운 신호(도둑잡기 고르는 카드). 쓰지 않는 게임은 무시한다. */
  signal?: GameSignal | null;
  sendSignal?: (action: GameAction) => void;
  aside?: ReactNode;
  asideFooter?: ReactNode;
};

export type RuleSlideBase = { title: string; body: string[] };

export type GameRules = {
  title: string;
  summary: string[];
  slides: RuleSlideBase[];
  renderArt: (slide: RuleSlideBase) => ReactNode;
};

export type GameModule<V extends SessionView> = {
  gameType: GameType;
  name: string;
  slug: string;
  tagline: string;
  minPlayers: number;
  maxPlayers: number;
  Table: ComponentType<TableProps<V>>;
  describeChanges: (prev: V | null, next: V, nicknameOf: Nickname) => LogDraft[];
  isGameOver: (view: V) => boolean;
  wasParticipant: (view: V, meId: number) => boolean;
  gameOverKey: (code: string, view: V) => string;
  rules: GameRules;
  BoxArt: ComponentType;
  averageScoreLabel: string;
  /** 전적의 라운드 점수 글자. 없으면 "N점". */
  roundScoreText?: (score: number) => string;
  /**
   * 보낸 행동(action, 보낼 때 화면 sent)이 code로 거절됐는데 지금 화면(current)이 이미 그 행동을 지나쳤으면 true.
   * 마감 자동 처리와 겹친 늦은 요청처럼 정상 경합이라 알림을 띄우지 않는다. 없으면 늘 알린다.
   */
  isStaleRejection?: (action: GameAction, sent: V, current: V, code: string) => boolean;
};
