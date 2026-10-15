import type { ComponentType, ReactNode } from 'react';
import type { ChatMessage } from '../api/chat';
import type { GameAction, GameSignal, GameType, PaperSafariView, Room, SessionView } from '../api/types';
import type { LogDraft, LogEntry } from '../lib/eventLog';

export type Nickname = (memberId: number) => string;

/**
 * 화면이 바뀐 한 번. from/to는 세션 화면의 game. 동기화 응답이면 animate = false.
 * 기본 타입 인자는 페이퍼 사파리(PaperSafariTable·useCardMotion·useFinale가 타입 인자 없이 쓴다).
 */
export type ViewTransition<G = PaperSafariView> = { seq: number; from: G | null; to: G; animate: boolean };

/** 방 채팅. latest는 지금 막 받은 메시지(기록 불러오기로는 바뀌지 않는다). */
export type TableChat = { messages: ChatMessage[]; onSend: (text: string) => boolean; latest: ChatMessage | null };

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
  /** 잦은 신호(수박게임 판 모습)를 React 상태를 거치지 않고 바로 받는다. 구독자가 있는 동안 signal은 바뀌지 않는다. 돌려준 함수로 끊는다. */
  subscribeSignal?: (listener: (signal: GameSignal) => void) => () => void;
  aside?: ReactNode;
  asideFooter?: ReactNode;
  /** 방 나가기(게임 중이면 확인 창을 거친다)와 방 채팅. 세로 휴대폰의 방 상태 바·채팅을 스스로 그리는 게임(ownsPhoneChrome)이 쓴다. */
  onLeave?: () => void;
  chat?: TableChat;
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
  /** 컴퓨터 플레이어를 받는지. 없으면 받는다. 수박게임만 false(서버도 거절한다). */
  supportsBots?: boolean;
  Table: ComponentType<TableProps<V>>;
  /**
   * 세로 휴대폰에서도 방 상태 바(aside)와 채팅(asideFooter)을 방 화면이 그리지 않고 테이블에 넘길지(수박게임).
   * 판이 화면을 가득 써야 하는 게임이 켜고, 테이블이 onLeave·chat으로 나가기와 채팅을 작게 그린다. 없으면 방 화면이 위아래에 그린다.
   */
  ownsPhoneChrome?: boolean;
  describeChanges: (prev: V | null, next: V, nicknameOf: Nickname) => LogDraft[];
  isGameOver: (view: V) => boolean;
  wasParticipant: (view: V, meId: number) => boolean;
  /** 그 사람이 이미 자기 판을 끝내, 게임 중에 나가도 기권이 아닌지(수박게임에서 탈락한 사람). 없으면 게임 중에 나간 사람은 모두 기권으로 알린다. */
  leavesWithoutForfeit?: (view: V, memberId: number) => boolean;
  gameOverKey: (code: string, view: V) => string;
  rules: GameRules;
  BoxArt: ComponentType;
  averageScoreLabel: string;
  /** 전적의 라운드 점수 글자. 없으면 "N점". */
  roundScoreText?: (score: number) => string;
  /**
   * 지금 기다리는 한 걸음(판·차례·단계·마감)을 가리키는 글자. 보낸 행동이 거절됐을 때 그사이 이 값이 바뀌었으면
   * (마감 자동 처리·남의 행동·게임 끝과 겹친 늦은 요청) 화면이 이미 그 행동을 지나친 정상 경합이라 알림을 띄우지 않는다.
   * 같은 걸음 안의 화면 갱신(남의 감정 표현·우노 외침 등)으로는 바뀌지 않아야, 지금 화면에 대한 진짜 거절은 그대로 알린다.
   */
  stepKey: (view: V) => string;
  /**
   * 걸음은 그대로인데도 보낸 행동(action, 보낼 때 화면 sent)이 code로 거절된 것이 정상 경합이면 true
   * (지금 화면 current가 이미 그 행동을 지나친 경우. 예: 도둑잡기에서 고른 카드가 이미 손에 없다). 없으면 걸음만 본다.
   */
  isStaleRejection?: (action: GameAction, sent: V, current: V, code: string) => boolean;
};
