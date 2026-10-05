# 계획 5: 프론트엔드(React) + 배포 준비(Docker Compose) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 지인들이 브라우저로 로그인 → 로비 → 대기실 → 페이퍼 사파리 실시간 플레이 → 전적/순위표 확인까지 할 수 있는 React 화면을 만들고, `docker compose up` 한 번으로 MySQL·백엔드·프론트를 띄울 수 있게 한다.

**Architecture:** `frontend/`는 React 19 + Vite + TypeScript + Tailwind v4 SPA. REST는 같은 출처의 `/api`(개발: Vite 프록시, 배포: nginx 프록시), 실시간은 `@stomp/stompjs`로 `/ws`. 화면 상태는 서버가 보내는 스냅샷(`RoomResponse`, `PaperSafariSessionView`)을 그대로 그리고, 이벤트 로그는 직전 스냅샷과의 차이로 클라이언트에서 만든다. 백엔드는 배포용 `docker` 프로필(MySQL, Secure 쿠키 설정 가능, UTC)과 몇 가지 정리를 더한다.

**Tech Stack:** React 19, react-router-dom 7, @stomp/stompjs 7, Vite 8, TypeScript 5.9, Tailwind CSS 4(@tailwindcss/vite), Vitest 5 + Testing Library + jsdom, nginx, MySQL 8.4, Docker Compose

**Spec:** `docs/superpowers/specs/2026-10-05-board-game-platform-design.md` (§7 UI 전부, §2 배포, §5.5 끊김 표시)

### 로드맵 위치
1~4 완료 · **5. 프론트엔드 + Docker** ← 이 문서(마지막)

### 서버 계약(계획 2~4에서 확정)
- REST: `POST /api/members`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/members/me`; `/api/rooms`(목록 `?gameType=`, `me`, `{code}`, `{code}/join|leave|start`, `{code}/members/{id}/forfeit`); `/api/records/me`, `/api/records/members/{id}`, `/api/records/members/{id}/matches?gameType=&limit=`, `/api/records/rankings?gameType=`
- 에러 본문: `{status, code, message}`
- STOMP `/ws`(세션 쿠키): SEND `/app/rooms/{code}/actions` `{type, column?, row?}`(FLIP·DRAW_DECK·DRAW_DISCARD·SWAP·DISCARD·PEEK·READY), SEND `/app/rooms/{code}/sync`; SUBSCRIBE `/topic/rooms/{code}`(RoomResponse), `/user/queue/game`(PaperSafariSessionView), `/user/queue/errors`(ErrorResponse)
- 화면 규칙: 방 상태와 내가 멤버인지로 화면을 정한다(게임이 끝난 뒤 들어온 사람에게도 이전 판 화면이 올 수 있음). 방 업데이트에 내가 없으면 로비로. 끊긴 지 60초 이상인 다른 멤버에게 "내보내기" 버튼. 승률 `null`은 "-".

## Global Constraints

- 백엔드: Java 21, Spring Boot 3.5.16, 명령 `mvn -q -f backend/pom.xml ...`; 객체지향 생활 체조(들여쓰기 1단계, else 금지 등), 에러 `{status, code, message}`.
- 프론트: Node 24, npm. 명령은 `npm --prefix frontend ...`(또는 `cd frontend && npm ...`). TypeScript `strict`. 라이브러리 버전은 아래 Task 2 Step 1의 범위를 따른다(TypeScript는 **5.9 계열**, 7.x 금지).
- UI(스펙 §7): 미색 배경(`cream`), 흰 카드 패널, 둥근 모서리·옅은 그림자, 강조색은 사파리 녹색 하나, Pretendard 폰트, 애니메이션은 짧게. 카드는 원작 그림 없이 큰 숫자 + 동물 이모지(0🐁 1🐇 2🐒 3🦓 4🦒 5🐆 6🦛 7🐊 8🦏 9🦁, 코끼리🐘, 타잔🧔, 여우🦊, 와일드❓).
- 모든 UI 문구는 한국어. 데스크톱 기준, 모바일(폭 < 640px)에서 상대 판은 가로 스크롤 한 줄.
- 테스트 이름은 한국어 문장. 커밋 메시지 마지막 줄: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Review Focus

1. 게임 도중 새로고침/재접속 → 방 페이지로 돌아와 sync로 현재 화면이 복구됨(로비에서 `GET /api/rooms/me`로 자동 이동 포함) (Task 3, Task 4)
2. 서버가 거부한 행동(차례 아님 등)은 화면이 깨지지 않고 토스트로 안내 (Task 3)
3. 상대의 뒷면 카드와 상대가 든 카드는 값 없이 뒷면으로만 표시, 내가 엿본 카드는 반투명으로 나에게만 표시 (Task 4 테스트)
4. 같은 열 0점 쌍(같은 숫자·와일드)이 강조되고, 예상 점수가 보이는 카드 기준으로 계산됨 (Task 4 테스트)
5. 승률이 없는 사용자(0판)는 "-"로 표시, 순위표는 5판 이상만(서버 기준) (Task 3·5 테스트)

---

## File Structure

```
backend/src/main/java/com/boardgame/common/error/{ErrorCode,GlobalExceptionHandler}.java   (Modify)
backend/src/main/java/com/boardgame/common/websocket/WebSocketConfig.java                  (Modify)
backend/src/main/resources/application.yml                                                  (Modify)
backend/src/main/resources/application-docker.yml
backend/src/test/java/com/boardgame/common/error/GlobalExceptionHandlerTest.java            (Modify)
backend/Dockerfile  backend/.dockerignore
frontend/package.json frontend/index.html frontend/vite.config.ts frontend/tsconfig.json
frontend/Dockerfile frontend/nginx.conf frontend/.dockerignore
frontend/src/main.tsx App.tsx index.css vite-env.d.ts test/setup.ts
frontend/src/api/{http,http.test,types,auth,rooms,records}.ts
frontend/src/auth/{AuthContext,RequireAuth}.tsx
frontend/src/components/{ui,Toast,Layout}.tsx
frontend/src/lib/{format,format.test,eventLog,eventLog.test}.ts
frontend/src/realtime/{Realtime,Realtime.test}.ts frontend/src/realtime/RealtimeContext.tsx
frontend/src/room/{useRoomChannel,WaitingRoom,MemberList}.tsx
frontend/src/records/{StatSummary,RankingList,RecentMatches}.tsx
frontend/src/games/papersafari/{cards,score,score.test}.ts
frontend/src/games/papersafari/{CardFace,CardFace.test,PlayerBoard,PlayerBoard.test,PaperSafariTable,RoundResultModal,GameOverPanel}.tsx
frontend/src/pages/{LoginPage,SignupPage,LobbyPage,RoomPage,RecordsPage,RecordsPage.test}.tsx
docker-compose.yml  README.md  .gitignore (Modify)
```

---

### Task 1: 백엔드 배포 준비

**Files:**
- Modify: `ErrorCode.java`, `GlobalExceptionHandler.java`, `WebSocketConfig.java`, `backend/src/main/resources/application.yml`, `GlobalExceptionHandlerTest.java`
- Create: `backend/src/main/resources/application-docker.yml`, `backend/Dockerfile`, `backend/.dockerignore`

**Interfaces:**
- Produces: `ErrorCode.DATA_CONFLICT`(409) — `DataIntegrityViolationException`(예: 동시 가입 경합) 응답; STOMP 같은 세션의 수신 순서 보장(`setPreserveReceiveOrder(true)`); 환경변수 `APP_WEBSOCKET_ALLOWED_ORIGIN_PATTERNS`, `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `COOKIE_SECURE`; `docker` 프로필; 백엔드 이미지(포트 8080)

- [ ] **Step 1: 실패하는 테스트 작성**

`GlobalExceptionHandlerTest.java` — `ErrorTestController`에 엔드포인트 추가:
```java
        @GetMapping("/conflict")
        public void conflict() {
            throw new org.springframework.dao.DataIntegrityViolationException("duplicate key login_id");
        }
```
테스트 추가:
```java
    @Test
    void 데이터_무결성_충돌은_409_DATA_CONFLICT() throws Exception {
        mockMvc.perform(get("/test/errors/conflict"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DATA_CONFLICT"))
                .andExpect(jsonPath("$.message").value("요청이 다른 요청과 겹쳤습니다. 잠시 후 다시 시도해 주세요."));
    }
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest=GlobalExceptionHandlerTest`
Expected: FAIL — `DATA_CONFLICT` 상수 없음(컴파일 에러) 또는 500 응답

- [ ] **Step 3: 구현**

`ErrorCode.java` — `METHOD_NOT_ALLOWED(` 줄 바로 아래에 추가:
```java
    DATA_CONFLICT(HttpStatus.CONFLICT, "요청이 다른 요청과 겹쳤습니다. 잠시 후 다시 시도해 주세요."),
```
같은 파일의 `INVALID_PASSWORD` 메시지를 다음으로 교체(72바이트 규칙과 맞춤):
```java
    INVALID_PASSWORD(HttpStatus.BAD_REQUEST, "비밀번호는 8~64자로 입력해 주세요. 한글은 24자까지 쓸 수 있습니다."),
```

`GlobalExceptionHandler.java` — 메서드 추가(import `org.springframework.dao.DataIntegrityViolationException`):
```java
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataConflict(DataIntegrityViolationException exception) {
        log.warn("데이터 무결성 충돌: {}", exception.getMostSpecificCause().getMessage());
        return respond(ErrorCode.DATA_CONFLICT);
    }
```

`WebSocketConfig.java` — `registerStompEndpoints`를 다음으로 교체(같은 세션의 SUBSCRIBE → SEND 순서를 서버가 지키도록):
```java
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOriginPatterns(allowedOriginPatterns);
        registry.setPreserveReceiveOrder(true);
    }
```

`backend/src/main/resources/application.yml` — `app.websocket.allowed-origin-patterns` 값을 환경변수로 덮어쓸 수 있게 교체:
```yaml
app:
  websocket:
    allowed-origin-patterns: "${APP_WEBSOCKET_ALLOWED_ORIGIN_PATTERNS:http://localhost:[*],http://127.0.0.1:[*]}"
```

`backend/src/main/resources/application-docker.yml`
```yaml
spring:
  datasource:
    url: ${DB_URL:jdbc:mysql://mysql:3306/boardgame?serverTimezone=UTC&characterEncoding=UTF-8}
    username: ${DB_USERNAME:boardgame}
    password: ${DB_PASSWORD:boardgame}
  jpa:
    hibernate:
      ddl-auto: update
    properties:
      hibernate:
        jdbc:
          time_zone: UTC
  h2:
    console:
      enabled: false

server:
  forward-headers-strategy: native
  servlet:
    session:
      cookie:
        secure: ${COOKIE_SECURE:false}
```

`backend/Dockerfile`
```dockerfile
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/board-game-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

`backend/.dockerignore`
```
target/
data/
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest='GlobalExceptionHandlerTest,AuthApiTest,StompGameFlowTest'`
Expected: PASS

- [ ] **Step 5: 전체 회귀 확인 후 커밋**

Run: `mvn -q -f backend/pom.xml test`
Expected: PASS

```bash
git add backend
git commit -m "feat: 배포 준비(docker 프로필, 무결성 충돌 409, STOMP 수신 순서 보장)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 프론트엔드 골격, API 클라이언트, 로그인/회원가입

**Files:**
- Create: `frontend/package.json`, `frontend/index.html`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/src/{main.tsx,App.tsx,index.css,vite-env.d.ts}`, `frontend/src/test/setup.ts`
- Create: `frontend/src/api/{http.ts,http.test.ts,types.ts,auth.ts}`, `frontend/src/auth/{AuthContext.tsx,RequireAuth.tsx}`, `frontend/src/components/{ui.tsx,Toast.tsx,Layout.tsx}`, `frontend/src/pages/{LoginPage.tsx,SignupPage.tsx,LobbyPage.tsx}`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `request<T>(path, {method?, body?})`, `ApiError(status, code, message)`, `messageOf(error)`; 모든 서버 응답 타입(`types.ts`); `authApi`; `AuthProvider`/`useAuth()`(`member`, `loading`, `login`, `signup`, `logout`); `ToastProvider`/`useToast().show(message, tone?)`; `RequireAuth`; UI 컴포넌트 `Panel`, `Button`, `TextInput`; 라우트 `/login`, `/signup`, `/`(로비 — Task 3에서 교체)

- [ ] **Step 1: 프로젝트 생성과 의존성 설치**

`frontend/package.json`
```json
{
  "name": "board-game-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "preview": "vite preview"
  }
}
```
Run:
```bash
npm --prefix frontend install react@^19 react-dom@^19 react-router-dom@^7 @stomp/stompjs@^7
npm --prefix frontend install -D vite@^8 @vitejs/plugin-react@^6 typescript@~5.9 @types/react@^19 @types/react-dom@^19 tailwindcss@^4 @tailwindcss/vite@^4 vitest@^5 jsdom @testing-library/react@^16 @testing-library/jest-dom @testing-library/user-event@^14
```

`.gitignore`에는 이미 `frontend/node_modules/`, `frontend/dist/`가 있다. 확인만 한다.

`frontend/index.html`
```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
    <title>보드게임 라운지</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`frontend/vite.config.ts`
```ts
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

`frontend/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

`frontend/src/vite-env.d.ts`
```ts
/// <reference types="vite/client" />
```

`frontend/src/test/setup.ts`
```ts
import '@testing-library/jest-dom/vitest';
```

`frontend/src/index.css`
```css
@import "tailwindcss";

@theme {
  --font-sans: "Pretendard", system-ui, -apple-system, sans-serif;
  --color-cream: #faf6ee;
  --color-safari-50: #eef7ef;
  --color-safari-100: #d7ecd9;
  --color-safari-300: #8cc597;
  --color-safari-500: #3f8f4f;
  --color-safari-600: #347a42;
  --color-safari-700: #2b6436;
}

body {
  @apply bg-cream text-stone-800 antialiased;
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`frontend/src/api/http.test.ts`
```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, messageOf, request } from './http';

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('request', () => {
  afterEach(() => vi.restoreAllMocks());

  it('성공 응답의 JSON을 돌려준다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ id: 1 }, 200));

    await expect(request('/api/x')).resolves.toEqual({ id: 1 });
  });

  it('204 응답은 undefined를 돌려준다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

    await expect(request('/api/x')).resolves.toBeUndefined();
  });

  it('서버 에러 본문을 ApiError로 바꾼다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ status: 409, code: 'ROOM_FULL', message: '방이 가득 찼습니다.' }, 409),
    );

    await expect(request('/api/x')).rejects.toMatchObject({ status: 409, code: 'ROOM_FULL', message: '방이 가득 찼습니다.' });
  });

  it('JSON이 아닌 에러 응답은 UNKNOWN 코드가 된다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>bad gateway</html>', { status: 502 }));

    await expect(request('/api/x')).rejects.toMatchObject({ status: 502, code: 'UNKNOWN' });
  });

  it('본문이 있으면 JSON으로 보내고 쿠키를 포함한다', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}, 200));

    await request('/api/rooms', { method: 'POST', body: { name: '방' } });

    expect(fetchSpy).toHaveBeenCalledWith('/api/rooms', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '방' }),
    });
  });

  it('메시지는 ApiError면 서버 메시지, 아니면 네트워크 안내다', () => {
    expect(messageOf(new ApiError(400, 'X', '잘못됨'))).toBe('잘못됨');
    expect(messageOf(new TypeError('fetch failed'))).toBe('네트워크 오류가 발생했어요. 잠시 후 다시 시도해 주세요.');
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm --prefix frontend test`
Expected: FAIL — `Failed to resolve import "./http"`

- [ ] **Step 4: API·인증·공통 UI 구현**

`frontend/src/api/http.ts`
```ts
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type RequestOptions = { method?: string; body?: unknown };

const NETWORK_MESSAGE = '네트워크 오류가 발생했어요. 잠시 후 다시 시도해 주세요.';

function parse(text: string): unknown {
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function toApiError(status: number, data: unknown): ApiError {
  const body = data as { status?: number; code?: unknown; message?: string } | undefined;
  if (body && typeof body.code === 'string') {
    return new ApiError(body.status ?? status, body.code, body.message ?? NETWORK_MESSAGE);
  }
  return new ApiError(status, 'UNKNOWN', '알 수 없는 오류가 발생했어요.');
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const hasBody = options.body !== undefined;
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: hasBody ? { 'Content-Type': 'application/json' } : {},
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });
  if (response.status === 204) {
    return undefined as T;
  }
  const data = parse(await response.text());
  if (!response.ok) {
    throw toApiError(response.status, data);
  }
  return data as T;
}

export function messageOf(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return NETWORK_MESSAGE;
}
```

주의: 테스트의 `toHaveBeenCalledWith`는 본문이 있을 때의 옵션 객체를 그대로 비교한다. 본문이 없는 GET은 `headers: {}`, `body: undefined`로 호출된다.

`frontend/src/api/types.ts`
```ts
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
```

`frontend/src/api/auth.ts`
```ts
import { ApiError, request } from './http';
import type { Member } from './types';

export const authApi = {
  async me(): Promise<Member | null> {
    try {
      return await request<Member>('/api/members/me');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return null;
      }
      throw error;
    }
  },
  login: (loginId: string, password: string) =>
    request<Member>('/api/auth/login', { method: 'POST', body: { loginId, password } }),
  signup: (loginId: string, nickname: string, password: string) =>
    request<Member>('/api/members', { method: 'POST', body: { loginId, nickname, password } }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
};
```

`frontend/src/auth/AuthContext.tsx`
```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { Member } from '../api/types';

type AuthState = {
  member: Member | null;
  loading: boolean;
  login: (loginId: string, password: string) => Promise<void>;
  signup: (loginId: string, nickname: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .me()
      .then(setMember)
      .catch(() => setMember(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (loginId: string, password: string) => {
    setMember(await authApi.login(loginId, password));
  }, []);

  const signup = useCallback(async (loginId: string, nickname: string, password: string) => {
    await authApi.signup(loginId, nickname, password);
    setMember(await authApi.login(loginId, password));
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setMember(null);
  }, []);

  const value = useMemo(() => ({ member, loading, login, signup, logout }), [member, loading, login, signup, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('AuthProvider 안에서만 쓸 수 있어요.');
  }
  return context;
}
```

`frontend/src/auth/RequireAuth.tsx`
```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function RequireAuth() {
  const { member, loading } = useAuth();
  if (loading) {
    return <p className="p-10 text-center text-stone-500">불러오는 중…</p>;
  }
  if (!member) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
```

`frontend/src/components/ui.tsx`
```tsx
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200 ${className}`}>{children}</section>;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' };

const VARIANTS = {
  primary: 'bg-safari-600 text-white hover:bg-safari-700',
  secondary: 'bg-white text-stone-700 ring-1 ring-stone-300 hover:bg-stone-50',
  danger: 'bg-white text-red-600 ring-1 ring-red-200 hover:bg-red-50',
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string };

export function TextInput({ label, hint, id, ...props }: TextInputProps) {
  return (
    <label className="block space-y-1" htmlFor={id}>
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <input
        id={id}
        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 outline-none focus:border-safari-500 focus:ring-2 focus:ring-safari-100"
        {...props}
      />
      {hint ? <span className="block text-xs text-stone-500">{hint}</span> : null}
    </label>
  );
}
```

`frontend/src/components/Toast.tsx`
```tsx
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type Tone = 'error' | 'info';
type ToastItem = { id: number; message: string; tone: Tone };
type ToastApi = { show: (message: string, tone?: Tone) => void };

const ToastContext = createContext<ToastApi | null>(null);

const TONES: Record<Tone, string> = {
  error: 'bg-red-600 text-white',
  info: 'bg-stone-800 text-white',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const show = useCallback((message: string, tone: Tone = 'error') => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3000);
  }, []);

  const api = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} role="status" className={`rounded-xl px-4 py-2 text-sm shadow-lg ${TONES[toast.tone]}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('ToastProvider 안에서만 쓸 수 있어요.');
  }
  return context;
}
```

`frontend/src/components/Layout.tsx`
```tsx
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { messageOf } from '../api/http';
import { useToast } from './Toast';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm ${isActive ? 'bg-safari-50 font-semibold text-safari-700' : 'text-stone-600 hover:bg-stone-100'}`;

export function Layout() {
  const { member, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.show(messageOf(error));
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold text-safari-700">🌿 보드게임 라운지</span>
            <nav className="flex gap-1">
              <NavLink to="/" end className={linkClass}>로비</NavLink>
              <NavLink to="/records" className={linkClass}>내 전적</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium">{member?.nickname}</span>
            <button type="button" onClick={handleLogout} className="text-stone-500 hover:text-stone-800">
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
```

`frontend/src/pages/LoginPage.tsx`
```tsx
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { messageOf } from '../api/http';
import { useAuth } from '../auth/AuthContext';
import { Button, Panel, TextInput } from '../components/ui';
import { useToast } from '../components/Toast';

export function LoginPage() {
  const { member, login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (member) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(loginId, password);
      navigate('/', { replace: true });
    } catch (error) {
      toast.show(messageOf(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Panel className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-safari-700">🌿 보드게임 라운지</h1>
        <p className="mb-6 text-sm text-stone-500">친구들과 함께하는 보드게임</p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <TextInput id="loginId" label="아이디" value={loginId} onChange={(e) => setLoginId(e.target.value)} autoComplete="username" required />
          <TextInput id="password" label="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          <Button type="submit" className="w-full" disabled={submitting}>로그인</Button>
        </form>
        <p className="mt-4 text-center text-sm text-stone-500">
          처음이신가요? <Link to="/signup" className="font-semibold text-safari-700">회원가입</Link>
        </p>
      </Panel>
    </div>
  );
}
```

`frontend/src/pages/SignupPage.tsx`
```tsx
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { messageOf } from '../api/http';
import { useAuth } from '../auth/AuthContext';
import { Button, Panel, TextInput } from '../components/ui';
import { useToast } from '../components/Toast';

export function SignupPage() {
  const { member, signup } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [loginId, setLoginId] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (member) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await signup(loginId, nickname, password);
      navigate('/', { replace: true });
    } catch (error) {
      toast.show(messageOf(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Panel className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-bold text-safari-700">회원가입</h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <TextInput id="loginId" label="아이디" hint="4~20자 영문과 숫자" value={loginId} onChange={(e) => setLoginId(e.target.value)} autoComplete="username" required />
          <TextInput id="nickname" label="닉네임" hint="2~10자" value={nickname} onChange={(e) => setNickname(e.target.value)} required />
          <TextInput id="password" label="비밀번호" type="password" hint="8자 이상" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
          <Button type="submit" className="w-full" disabled={submitting}>가입하고 시작하기</Button>
        </form>
        <p className="mt-4 text-center text-sm text-stone-500">
          이미 계정이 있나요? <Link to="/login" className="font-semibold text-safari-700">로그인</Link>
        </p>
      </Panel>
    </div>
  );
}
```

`frontend/src/pages/LobbyPage.tsx` (Task 3에서 전체 교체되는 임시 화면)
```tsx
import { useAuth } from '../auth/AuthContext';
import { Panel } from '../components/ui';

export function LobbyPage() {
  const { member } = useAuth();
  return <Panel>{member?.nickname}님, 환영해요!</Panel>;
}
```

`frontend/src/App.tsx`
```tsx
import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/Toast';
import { LobbyPage } from './pages/LobbyPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route path="/" element={<LobbyPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
```

`frontend/src/main.tsx`
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

- [ ] **Step 5: 테스트·빌드 통과 확인**

Run: `npm --prefix frontend test && npm --prefix frontend run build`
Expected: 테스트 6개 PASS, 빌드 성공(`dist/` 생성)

- [ ] **Step 6: 커밋**

```bash
git add .gitignore frontend
git commit -m "feat: React 프론트엔드 골격, API 클라이언트, 로그인·회원가입" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
(`frontend/node_modules/`, `frontend/dist/`는 `.gitignore`로 제외된다. `package-lock.json`은 커밋한다.)

---

### Task 3: 실시간 연결, 로비, 대기실

**Files:**
- Create: `frontend/src/realtime/{Realtime.ts,Realtime.test.ts,RealtimeContext.tsx}`, `frontend/src/api/{rooms.ts,records.ts}`, `frontend/src/lib/{format.ts,format.test.ts,eventLog.ts,eventLog.test.ts}`
- Create: `frontend/src/room/{useRoomChannel.ts,WaitingRoom.tsx,MemberList.tsx}`, `frontend/src/records/{StatSummary.tsx,RankingList.tsx}`, `frontend/src/pages/RoomPage.tsx`
- Modify: `frontend/src/pages/LobbyPage.tsx`(전체 교체), `frontend/src/auth/RequireAuth.tsx`, `frontend/src/App.tsx`

**Interfaces:**
- Consumes: Task 2 `request`, `messageOf`, `types.ts`, `useAuth`, `useToast`, `Panel/Button/TextInput`
- Produces:
  - `class Realtime(factory?)` — `start()`, `stop()`, `subscribe(destination, handler) => unsubscribe`, `publish(destination, body) => boolean`, `onConnectionChange(listener) => unsubscribe`, `isConnected()`
  - `RealtimeProvider`, `useRealtime() => { realtime, connected }`
  - `roomsApi`(list/mine/get/create/join/leave/start/forfeit), `recordsApi`(me/member/matches/rankings)
  - `percent`, `decimal`, `dateTime`, `resultLabel`, `offlineSecondsNow`, `canForfeit`
  - `describeChanges(prev, next, nicknameOf) => string[]`
  - `useRoomChannel(code) => { room, receivedAt, view, log, missing, send }`
  - 컴포넌트 `WaitingRoom`, `MemberList`, `StatSummary`, `RankingList`, 페이지 `LobbyPage`, `RoomPage`(게임 영역은 Task 4에서 `PaperSafariTable`로 교체)

- [ ] **Step 1: 실패하는 테스트 작성**

`frontend/src/lib/format.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { canForfeit, decimal, offlineSecondsNow, percent, resultLabel } from './format';
import type { RoomMember } from '../api/types';

const offline = (seconds: number): RoomMember => ({ id: 2, nickname: '밥', host: false, connected: false, offlineSeconds: seconds });

describe('format', () => {
  it('승률은 퍼센트로, null은 - 로 보여준다', () => {
    expect(percent(0.6667)).toBe('66.7%');
    expect(percent(null)).toBe('-');
    expect(decimal(14)).toBe('14.0');
    expect(decimal(null)).toBe('-');
  });

  it('결과를 한 글자로 보여준다', () => {
    expect(resultLabel('WIN')).toBe('승');
    expect(resultLabel('DRAW')).toBe('무');
    expect(resultLabel('LOSE')).toBe('패');
    expect(resultLabel(null)).toBe('-');
  });

  it('받은 뒤 지난 시간을 더해 끊긴 시간을 계산한다', () => {
    expect(offlineSecondsNow(offline(30), 1_000, 11_000)).toBe(40);
    expect(offlineSecondsNow({ ...offline(30), connected: true }, 1_000, 11_000)).toBe(0);
  });

  it('60초 이상 끊긴 다른 사람만 내보낼 수 있다', () => {
    expect(canForfeit(offline(59), 1, 0, 0)).toBe(false);
    expect(canForfeit(offline(60), 1, 0, 0)).toBe(true);
    expect(canForfeit(offline(90), 2, 0, 0)).toBe(false);
  });
});
```

`frontend/src/lib/eventLog.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { describeChanges } from './eventLog';
import type { PaperSafariView } from '../api/types';

const nick = (id: number) => ({ 1: '앨리스', 2: '밥' })[id] ?? '플레이어';

function view(overrides: Partial<PaperSafariView> & { round?: Partial<PaperSafariView['round']> }): PaperSafariView {
  const base: PaperSafariView = {
    viewerId: 1,
    status: 'IN_ROUND',
    roundNumber: 1,
    round: { phase: 'DRAW', currentPlayerId: 1, deckSize: 30, discardTop: null, held: null, boards: [] },
    tokens: { '1': 0, '2': 0 },
    lastRoundResult: null,
    winnerId: null,
  };
  return { ...base, ...overrides, round: { ...base.round, ...overrides.round } };
}

describe('describeChanges', () => {
  it('처음 받은 화면은 기록하지 않는다', () => {
    expect(describeChanges(null, view({}), nick)).toEqual([]);
  });

  it('카드를 가져오고 내려놓는 것을 기록한다', () => {
    const drawn = view({ round: { phase: 'PLACE', held: { playerId: 1, source: 'DECK', card: null } } });
    expect(describeChanges(view({}), drawn, nick)).toEqual(['앨리스님이 덱에서 카드를 가져왔어요']);
    const placed = view({ round: { phase: 'DRAW', currentPlayerId: 2 } });
    expect(describeChanges(drawn, placed, nick)).toEqual(['앨리스님이 카드를 내려놓았어요']);
  });

  it('준비 단계가 끝나면 시작 플레이어를 알린다', () => {
    const setup = view({ round: { phase: 'SETUP_FLIP', currentPlayerId: 2 } });
    const started = view({ round: { phase: 'DRAW', currentPlayerId: 2 } });
    expect(describeChanges(setup, started, nick)).toEqual(['밥님부터 시작해요']);
  });

  it('코끼리 엿보기를 알린다', () => {
    const placing = view({ round: { phase: 'PLACE', held: { playerId: 1, source: 'DECK', card: null } } });
    const peeking = view({ round: { phase: 'PEEK' } });
    expect(describeChanges(placing, peeking, nick)).toEqual(['앨리스님이 카드를 내려놓았어요', '앨리스님이 코끼리로 카드를 엿보고 있어요']);
  });

  it('라운드 결과와 게임 승자를 알린다', () => {
    const over = view({
      status: 'GAME_OVER',
      winnerId: 1,
      round: { phase: 'ROUND_OVER' },
      lastRoundResult: { players: [{ playerId: 1, score: 1, outcome: 'WIN' }, { playerId: 2, score: 9, outcome: 'LOSE' }] },
    });
    expect(describeChanges(view({}), over, nick)).toEqual(['앨리스님이 1라운드에서 이겼어요', '앨리스님이 게임에서 승리했어요! 🎉']);
  });

  it('무승부 라운드와 새 라운드 시작을 알린다', () => {
    const draw = view({
      status: 'ROUND_OVER',
      round: { phase: 'ROUND_OVER' },
      lastRoundResult: { players: [{ playerId: 1, score: 3, outcome: 'DRAW' }, { playerId: 2, score: 3, outcome: 'DRAW' }] },
    });
    expect(describeChanges(view({}), draw, nick)).toEqual(['1라운드는 무승부예요']);
    const next = view({ roundNumber: 2, round: { phase: 'SETUP_FLIP' } });
    expect(describeChanges(draw, next, nick)).toEqual(['2라운드를 시작해요']);
  });
});
```

`frontend/src/realtime/Realtime.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { Realtime, type StompLike } from './Realtime';

class FakeStomp implements StompLike {
  connected = false;
  onConnect: () => void = () => {};
  onWebSocketClose: () => void = () => {};
  subscriptions: { destination: string; callback: (message: { body: string }) => void; active: boolean }[] = [];
  published: { destination: string; body: string }[] = [];

  activate() {}
  deactivate() {}
  subscribe(destination: string, callback: (message: { body: string }) => void) {
    const entry = { destination, callback, active: true };
    this.subscriptions.push(entry);
    return { unsubscribe: () => { entry.active = false; } };
  }
  publish(frame: { destination: string; body: string }) {
    this.published.push(frame);
  }
  connect() {
    this.connected = true;
    this.onConnect();
  }
  drop() {
    this.connected = false;
    this.onWebSocketClose();
  }
}

describe('Realtime', () => {
  it('연결되면 등록된 구독을 붙이고 메시지를 JSON으로 넘긴다', () => {
    const fake = new FakeStomp();
    const realtime = new Realtime(() => fake);
    const received: unknown[] = [];
    realtime.subscribe('/topic/rooms/ABCDEF', (body) => received.push(body));

    fake.connect();
    fake.subscriptions[0].callback({ body: '{"code":"ABCDEF"}' });

    expect(fake.subscriptions.map((s) => s.destination)).toEqual(['/topic/rooms/ABCDEF']);
    expect(received).toEqual([{ code: 'ABCDEF' }]);
  });

  it('재연결되면 구독을 다시 붙이고 해제한 구독은 붙이지 않는다', () => {
    const fake = new FakeStomp();
    const realtime = new Realtime(() => fake);
    realtime.subscribe('/user/queue/game', () => {});
    const off = realtime.subscribe('/user/queue/errors', () => {});
    fake.connect();
    off();

    fake.drop();
    fake.connect();

    expect(fake.subscriptions.map((s) => s.destination)).toEqual(['/user/queue/game', '/user/queue/errors', '/user/queue/game']);
  });

  it('연결 상태를 알리고 끊겨 있으면 보내지 않는다', () => {
    const fake = new FakeStomp();
    const realtime = new Realtime(() => fake);
    const states: boolean[] = [];
    realtime.onConnectionChange((connected) => states.push(connected));

    expect(realtime.publish('/app/x', {})).toBe(false);
    fake.connect();
    expect(realtime.publish('/app/x', { type: 'READY' })).toBe(true);
    fake.drop();

    expect(fake.published).toEqual([{ destination: '/app/x', body: '{"type":"READY"}', headers: { 'content-type': 'application/json' } }]);
    expect(states).toEqual([true, false]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm --prefix frontend test`
Expected: FAIL — `Failed to resolve import "./format"` 등

- [ ] **Step 3: 실시간·API·포맷·로그 구현**

`frontend/src/realtime/Realtime.ts`
```ts
import { Client } from '@stomp/stompjs';

type Message = { body: string };
type Subscription = { unsubscribe: () => void };

export interface StompLike {
  connected: boolean;
  onConnect: () => void;
  onWebSocketClose: () => void;
  activate(): void;
  deactivate(): void;
  subscribe(destination: string, callback: (message: Message) => void): Subscription;
  publish(frame: { destination: string; body: string; headers?: Record<string, string> }): void;
}

type Handler = (body: unknown) => void;
type Entry = { destination: string; handler: Handler; subscription?: Subscription };

export function createStompClient(): StompLike {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return new Client({
    brokerURL: `${protocol}://${window.location.host}/ws`,
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
  }) as unknown as StompLike;
}

export class Realtime {
  private readonly client: StompLike;
  private readonly entries = new Map<number, Entry>();
  private readonly listeners = new Set<(connected: boolean) => void>();
  private nextId = 1;

  constructor(factory: () => StompLike = createStompClient) {
    this.client = factory();
    this.client.onConnect = () => {
      this.entries.forEach((entry) => this.attach(entry));
      this.emit(true);
    };
    this.client.onWebSocketClose = () => this.emit(false);
  }

  start(): void {
    this.client.activate();
  }

  stop(): void {
    this.client.deactivate();
  }

  isConnected(): boolean {
    return this.client.connected;
  }

  subscribe(destination: string, handler: Handler): () => void {
    const id = this.nextId++;
    const entry: Entry = { destination, handler };
    this.entries.set(id, entry);
    if (this.client.connected) {
      this.attach(entry);
    }
    return () => {
      entry.subscription?.unsubscribe();
      this.entries.delete(id);
    };
  }

  publish(destination: string, body: unknown): boolean {
    if (!this.client.connected) {
      return false;
    }
    this.client.publish({ destination, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
    return true;
  }

  onConnectionChange(listener: (connected: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private attach(entry: Entry): void {
    entry.subscription = this.client.subscribe(entry.destination, (message) => entry.handler(JSON.parse(message.body)));
  }

  private emit(connected: boolean): void {
    this.listeners.forEach((listener) => listener(connected));
  }
}
```

`frontend/src/realtime/RealtimeContext.tsx`
```tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Realtime } from './Realtime';

type RealtimeState = { realtime: Realtime; connected: boolean };

const RealtimeContext = createContext<RealtimeState | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [realtime] = useState(() => new Realtime());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const off = realtime.onConnectionChange(setConnected);
    realtime.start();
    return () => {
      off();
      realtime.stop();
    };
  }, [realtime]);

  const value = useMemo(() => ({ realtime, connected }), [realtime, connected]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeState {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('RealtimeProvider 안에서만 쓸 수 있어요.');
  }
  return context;
}
```

`frontend/src/api/rooms.ts`
```ts
import { request } from './http';
import type { GameType, Room, RoomSummary } from './types';

const path = (code: string) => `/api/rooms/${encodeURIComponent(code)}`;

export const roomsApi = {
  list: (gameType: GameType) => request<RoomSummary[]>(`/api/rooms?gameType=${gameType}`),
  async mine(): Promise<Room | null> {
    const room = await request<Room | undefined>('/api/rooms/me');
    return room ?? null;
  },
  get: (code: string) => request<Room>(path(code)),
  create: (name: string, gameType: GameType) => request<Room>('/api/rooms', { method: 'POST', body: { name, gameType } }),
  join: (code: string) => request<Room>(`${path(code)}/join`, { method: 'POST' }),
  leave: (code: string) => request<void>(`${path(code)}/leave`, { method: 'POST' }),
  start: (code: string) => request<Room>(`${path(code)}/start`, { method: 'POST' }),
  forfeit: (code: string, memberId: number) => request<void>(`${path(code)}/members/${memberId}/forfeit`, { method: 'POST' }),
};
```

`frontend/src/api/records.ts`
```ts
import { request } from './http';
import type { GameType, MemberStats, Ranking, RecentMatch } from './types';

export const recordsApi = {
  me: () => request<MemberStats>('/api/records/me'),
  member: (memberId: number) => request<MemberStats>(`/api/records/members/${memberId}`),
  matches: (memberId: number, gameType: GameType, limit = 10) =>
    request<RecentMatch[]>(`/api/records/members/${memberId}/matches?gameType=${gameType}&limit=${limit}`),
  rankings: (gameType: GameType) => request<Ranking[]>(`/api/records/rankings?gameType=${gameType}`),
};
```

`frontend/src/lib/format.ts`
```ts
import type { ResultType, RoomMember } from '../api/types';

export const FORFEIT_GRACE_SECONDS = 60;

export function percent(rate: number | null): string {
  if (rate === null) {
    return '-';
  }
  return `${(rate * 100).toFixed(1)}%`;
}

export function decimal(value: number | null): string {
  if (value === null) {
    return '-';
  }
  return value.toFixed(1);
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const RESULT_LABELS: Record<ResultType, string> = { WIN: '승', DRAW: '무', LOSE: '패' };

export function resultLabel(result: ResultType | null): string {
  if (result === null) {
    return '-';
  }
  return RESULT_LABELS[result];
}

export function offlineSecondsNow(member: RoomMember, receivedAt: number, now: number): number {
  if (member.connected) {
    return 0;
  }
  return member.offlineSeconds + Math.floor((now - receivedAt) / 1000);
}

export function canForfeit(member: RoomMember, meId: number, receivedAt: number, now: number): boolean {
  return member.id !== meId && !member.connected && offlineSecondsNow(member, receivedAt, now) >= FORFEIT_GRACE_SECONDS;
}
```

`frontend/src/lib/eventLog.ts`
```ts
import type { PaperSafariView } from '../api/types';

type Nickname = (memberId: number) => string;

const SOURCE_LABELS = { DECK: '덱', DISCARD: '버린 카드 더미' } as const;

function heldChanges(prev: PaperSafariView, next: PaperSafariView, nicknameOf: Nickname): string[] {
  const before = prev.round.held;
  const after = next.round.held;
  if (!before && after) {
    return [`${nicknameOf(after.playerId)}님이 ${SOURCE_LABELS[after.source]}에서 카드를 가져왔어요`];
  }
  if (before && !after && next.roundNumber === prev.roundNumber) {
    return [`${nicknameOf(before.playerId)}님이 카드를 내려놓았어요`];
  }
  return [];
}

function phaseChanges(prev: PaperSafariView, next: PaperSafariView, nicknameOf: Nickname): string[] {
  if (prev.round.phase === 'SETUP_FLIP' && next.round.phase === 'DRAW' && prev.roundNumber === next.roundNumber) {
    return [`${nicknameOf(next.round.currentPlayerId)}님부터 시작해요`];
  }
  if (prev.round.phase !== 'PEEK' && next.round.phase === 'PEEK') {
    return [`${nicknameOf(next.round.currentPlayerId)}님이 코끼리로 카드를 엿보고 있어요`];
  }
  return [];
}

function roundResult(prev: PaperSafariView, next: PaperSafariView, nicknameOf: Nickname): string[] {
  if (prev.round.phase === 'ROUND_OVER' || next.round.phase !== 'ROUND_OVER' || !next.lastRoundResult) {
    return [];
  }
  const winner = next.lastRoundResult.players.find((player) => player.outcome === 'WIN');
  if (!winner) {
    return [`${next.roundNumber}라운드는 무승부예요`];
  }
  return [`${nicknameOf(winner.playerId)}님이 ${next.roundNumber}라운드에서 이겼어요`];
}

function gameResult(prev: PaperSafariView, next: PaperSafariView, nicknameOf: Nickname): string[] {
  if (prev.status === 'GAME_OVER' || next.status !== 'GAME_OVER' || next.winnerId === null) {
    return [];
  }
  return [`${nicknameOf(next.winnerId)}님이 게임에서 승리했어요! 🎉`];
}

function newRound(prev: PaperSafariView, next: PaperSafariView): string[] {
  if (next.roundNumber <= prev.roundNumber) {
    return [];
  }
  return [`${next.roundNumber}라운드를 시작해요`];
}

export function describeChanges(prev: PaperSafariView | null, next: PaperSafariView, nicknameOf: Nickname): string[] {
  if (!prev) {
    return [];
  }
  return [
    ...newRound(prev, next),
    ...heldChanges(prev, next, nicknameOf),
    ...phaseChanges(prev, next, nicknameOf),
    ...roundResult(prev, next, nicknameOf),
    ...gameResult(prev, next, nicknameOf),
  ];
}
```

- [ ] **Step 4: 방 채널 훅과 로비·대기실 구현**

`frontend/src/room/useRoomChannel.ts`
```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '../api/http';
import { roomsApi } from '../api/rooms';
import type { ApiErrorBody, GameAction, PaperSafariSessionView, Room } from '../api/types';
import { useToast } from '../components/Toast';
import { describeChanges } from '../lib/eventLog';
import { useRealtime } from '../realtime/RealtimeContext';

const MAX_LOG = 5;
const SYNC_RETRY_MS = 1000;
const SYNC_MAX_TRIES = 5;

export function useRoomChannel(code: string) {
  const { realtime, connected } = useRealtime();
  const toast = useToast();
  const [room, setRoom] = useState<Room | null>(null);
  const [receivedAt, setReceivedAt] = useState(0);
  const [view, setView] = useState<PaperSafariSessionView | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [missing, setMissing] = useState(false);
  const viewRef = useRef<PaperSafariSessionView | null>(null);
  const roomRef = useRef<Room | null>(null);

  const acceptRoom = useCallback((next: Room) => {
    roomRef.current = next;
    setRoom(next);
    setReceivedAt(Date.now());
  }, []);

  const nicknameOf = useCallback(
    (memberId: number) => roomRef.current?.members.find((member) => member.id === memberId)?.nickname ?? '떠난 플레이어',
    [],
  );

  const acceptView = useCallback(
    (next: PaperSafariSessionView) => {
      const lines = describeChanges(viewRef.current?.game ?? null, next.game, nicknameOf);
      viewRef.current = next;
      setView(next);
      if (lines.length > 0) {
        setLog((current) => [...lines.reverse(), ...current].slice(0, MAX_LOG));
      }
    },
    [nicknameOf],
  );

  useEffect(() => {
    roomsApi
      .get(code)
      .then(acceptRoom)
      .catch((error) => {
        toast.show(messageOf(error));
        setMissing(true);
      });
  }, [code, acceptRoom, toast]);

  useEffect(() => {
    const offs = [
      realtime.subscribe(`/topic/rooms/${code}`, (body) => acceptRoom(body as Room)),
      realtime.subscribe('/user/queue/game', (body) => acceptView(body as PaperSafariSessionView)),
      realtime.subscribe('/user/queue/errors', (body) => toast.show((body as ApiErrorBody).message)),
    ];
    return () => offs.forEach((off) => off());
  }, [code, realtime, acceptRoom, acceptView, toast]);

  useEffect(() => {
    if (!connected) {
      return;
    }
    let tries = 0;
    const sync = () => {
      tries += 1;
      realtime.publish(`/app/rooms/${code}/sync`, {});
    };
    sync();
    const timer = window.setInterval(() => {
      if (viewRef.current || tries >= SYNC_MAX_TRIES) {
        window.clearInterval(timer);
        return;
      }
      sync();
    }, SYNC_RETRY_MS);
    return () => window.clearInterval(timer);
  }, [code, connected, realtime]);

  const send = useCallback(
    (action: GameAction) => {
      if (!realtime.publish(`/app/rooms/${code}/actions`, action)) {
        toast.show('연결이 끊겨 있어요. 잠시 후 다시 시도해 주세요.');
      }
    },
    [code, realtime, toast],
  );

  return { room, receivedAt, view, log, missing, send };
}
```

`frontend/src/room/MemberList.tsx`
```tsx
import type { RoomMember } from '../api/types';
import { canForfeit, offlineSecondsNow } from '../lib/format';
import { Button } from '../components/ui';

type Props = {
  members: RoomMember[];
  meId: number;
  receivedAt: number;
  now: number;
  onForfeit: (memberId: number) => void;
};

export function MemberList({ members, meId, receivedAt, now, onForfeit }: Props) {
  return (
    <ul className="divide-y divide-stone-100">
      {members.map((member) => (
        <li key={member.id} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${member.connected ? 'bg-safari-500' : 'bg-stone-300'}`} />
            <span className="font-medium">{member.nickname}</span>
            {member.host ? <span title="방장">👑</span> : null}
            {member.id === meId ? <span className="text-xs text-stone-400">(나)</span> : null}
            {!member.connected ? (
              <span className="text-xs text-stone-400">연결 끊김 {offlineSecondsNow(member, receivedAt, now)}초</span>
            ) : null}
          </div>
          {canForfeit(member, meId, receivedAt, now) ? (
            <Button variant="danger" className="px-3 py-1 text-xs" onClick={() => onForfeit(member.id)}>
              내보내기
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
```

`frontend/src/room/WaitingRoom.tsx`
```tsx
import type { Room } from '../api/types';
import { Button, Panel } from '../components/ui';
import { useToast } from '../components/Toast';
import { MemberList } from './MemberList';

type Props = {
  room: Room;
  meId: number;
  receivedAt: number;
  now: number;
  onStart: () => void;
  onForfeit: (memberId: number) => void;
};

export function WaitingRoom({ room, meId, receivedAt, now, onStart, onForfeit }: Props) {
  const toast = useToast();
  const isHost = room.hostId === meId;
  const canStart = isHost && room.members.length >= 2;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      toast.show('방 코드를 복사했어요.', 'info');
    } catch {
      toast.show(`방 코드: ${room.code}`, 'info');
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel className="lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">참가자 {room.members.length}/{room.maxPlayers}</h2>
          <button type="button" onClick={copyCode} className="rounded-lg bg-safari-50 px-3 py-1 font-mono text-sm font-semibold text-safari-700">
            코드 {room.code} 📋
          </button>
        </div>
        <MemberList members={room.members} meId={meId} receivedAt={receivedAt} now={now} onForfeit={onForfeit} />
        <div className="mt-4 flex justify-end">
          {isHost ? (
            <Button onClick={onStart} disabled={!canStart}>
              {canStart ? '게임 시작' : '2명 이상 모이면 시작할 수 있어요'}
            </Button>
          ) : (
            <span className="text-sm text-stone-500">방장이 게임을 시작하길 기다리는 중…</span>
          )}
        </div>
      </Panel>
      <Panel>
        <details open>
          <summary className="cursor-pointer font-bold">페이퍼 사파리 규칙</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-600">
            <li>각자 카드 6장(3열×2줄)을 받고 1장을 뒤집어요.</li>
            <li>차례마다 덱이나 버린 카드 더미에서 1장을 가져와 교체하거나 버려요.</li>
            <li>같은 열 위·아래가 같은 숫자면 0점, 와일드(❓)가 있어도 0점.</li>
            <li>🐘 코끼리: 교체하면 내 뒷면 카드 1장을 엿봐요.</li>
            <li>🧔 타잔: 반드시 교체하고, 빠진 카드는 왼쪽 사람의 같은 칸으로!</li>
            <li>누군가 6장을 모두 공개하면 라운드 종료. 합이 가장 낮으면 토큰 1개.</li>
            <li>토큰 3개를 먼저 모으면 승리!</li>
          </ul>
        </details>
      </Panel>
    </div>
  );
}
```

`frontend/src/records/StatSummary.tsx`
```tsx
import type { GameStat } from '../api/types';
import { decimal, percent } from '../lib/format';

export function StatSummary({ stat }: { stat: GameStat }) {
  return (
    <div className="space-y-2 text-sm">
      <p className="font-bold">{stat.gameTypeName}</p>
      <p>
        게임 <strong>{stat.matches}전 {stat.wins}승 {stat.draws}무 {stat.losses}패</strong>
        <span className="ml-2 text-safari-700">승률 {percent(stat.winRate)}</span>
      </p>
      <p className="text-stone-600">
        라운드 {stat.rounds}판 {stat.roundWins}승 {stat.roundDraws}무 {stat.roundLosses}패 · 라운드 승률 {percent(stat.roundWinRate)} · 평균 점수{' '}
        {decimal(stat.averageRoundScore)}
      </p>
    </div>
  );
}
```

`frontend/src/records/RankingList.tsx`
```tsx
import { Link } from 'react-router-dom';
import type { Ranking } from '../api/types';
import { percent } from '../lib/format';

export function RankingList({ rankings, limit }: { rankings: Ranking[]; limit?: number }) {
  const shown = limit ? rankings.slice(0, limit) : rankings;
  if (shown.length === 0) {
    return <p className="text-sm text-stone-500">아직 5판 이상 플레이한 사람이 없어요.</p>;
  }
  return (
    <ol className="space-y-1 text-sm">
      {shown.map((ranking) => (
        <li key={ranking.memberId} className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-stone-50">
          <span>
            <span className="mr-2 inline-block w-6 font-bold text-safari-700">{ranking.rank}</span>
            <Link to={`/records/${ranking.memberId}`} className="hover:underline">{ranking.nickname}</Link>
          </span>
          <span className="text-stone-500">
            {ranking.matches}전 {ranking.wins}승 · {percent(ranking.winRate)}
          </span>
        </li>
      ))}
    </ol>
  );
}
```

`frontend/src/pages/LobbyPage.tsx` (전체 교체)
```tsx
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { messageOf } from '../api/http';
import { recordsApi } from '../api/records';
import { roomsApi } from '../api/rooms';
import type { GameStat, Ranking, RoomSummary } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Button, Panel, TextInput } from '../components/ui';
import { useToast } from '../components/Toast';
import { RankingList } from '../records/RankingList';
import { StatSummary } from '../records/StatSummary';

const GAME = 'PAPER_SAFARI' as const;

export function LobbyPage() {
  const { member } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [name, setName] = useState(`${member?.nickname ?? ''}의 방`);
  const [code, setCode] = useState('');
  const [stat, setStat] = useState<GameStat | null>(null);
  const [rankings, setRankings] = useState<Ranking[]>([]);

  useEffect(() => {
    roomsApi
      .mine()
      .then((room) => {
        if (room) {
          navigate(`/rooms/${room.code}`, { replace: true });
        }
      })
      .catch(() => undefined);
    recordsApi.me().then((stats) => setStat(stats.stats.find((item) => item.gameType === GAME) ?? null)).catch(() => undefined);
    recordsApi.rankings(GAME).then(setRankings).catch(() => undefined);
  }, [navigate]);

  const loadRooms = useCallback(() => {
    roomsApi.list(GAME).then(setRooms).catch((error) => toast.show(messageOf(error)));
  }, [toast]);

  useEffect(() => {
    loadRooms();
    const timer = window.setInterval(loadRooms, 5000);
    return () => window.clearInterval(timer);
  }, [loadRooms]);

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
    enter(() => roomsApi.create(name, GAME));
  };

  const handleJoinByCode = (event: FormEvent) => {
    event.preventDefault();
    enter(() => roomsApi.join(code.trim()));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex gap-2">
          <span className="rounded-xl bg-safari-600 px-4 py-2 text-sm font-semibold text-white">🦊 페이퍼 사파리</span>
        </div>
        <Panel>
          <div className="grid gap-4 sm:grid-cols-2">
            <form className="space-y-2" onSubmit={handleCreate}>
              <TextInput id="roomName" label="새 방 만들기" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} required />
              <Button type="submit">방 만들기</Button>
            </form>
            <form className="space-y-2" onSubmit={handleJoinByCode}>
              <TextInput id="roomCode" label="방 코드로 들어가기" placeholder="ABC234" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} required />
              <Button type="submit" variant="secondary">입장</Button>
            </form>
          </div>
        </Panel>
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">기다리는 방</h2>
            <button type="button" onClick={loadRooms} className="text-sm text-stone-500 hover:text-stone-800">새로고침</button>
          </div>
          {rooms.length === 0 ? <p className="text-sm text-stone-500">지금은 열린 방이 없어요. 방을 만들어 친구를 불러보세요!</p> : null}
          <ul className="grid gap-2 sm:grid-cols-2">
            {rooms.map((room) => {
              const full = room.playerCount >= room.maxPlayers;
              return (
                <li key={room.code} className="flex items-center justify-between rounded-xl border border-stone-200 px-3 py-2">
                  <div>
                    <p className="font-medium">{room.name}</p>
                    <p className="text-xs text-stone-500">
                      👑 {room.hostNickname} · {room.playerCount}/{room.maxPlayers}명
                    </p>
                  </div>
                  <Button variant="secondary" disabled={full} onClick={() => enter(() => roomsApi.join(room.code))}>
                    {full ? '가득 참' : '참가'}
                  </Button>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
      <div className="space-y-4">
        <Panel>
          <h2 className="mb-2 font-bold">내 전적</h2>
          {stat ? <StatSummary stat={stat} /> : <p className="text-sm text-stone-500">불러오는 중…</p>}
        </Panel>
        <Panel>
          <h2 className="mb-2 font-bold">순위표 TOP 5</h2>
          <RankingList rankings={rankings} limit={5} />
        </Panel>
      </div>
    </div>
  );
}
```

`frontend/src/pages/RoomPage.tsx`
```tsx
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { messageOf } from '../api/http';
import { roomsApi } from '../api/rooms';
import { useAuth } from '../auth/AuthContext';
import { Button, Panel } from '../components/ui';
import { useToast } from '../components/Toast';
import { useRoomChannel } from '../room/useRoomChannel';
import { WaitingRoom } from '../room/WaitingRoom';

export function RoomPage() {
  const { code = '' } = useParams();
  const { member } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { room, receivedAt, view, log, missing, send } = useRoomChannel(code);
  const [now, setNow] = useState(() => Date.now());
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [dismissedGameOver, setDismissedGameOver] = useState(false);
  const meId = member?.id ?? 0;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (room?.status === 'PLAYING') {
      setDismissedGameOver(false);
    }
  }, [room?.status]);

  useEffect(() => {
    if (room && !room.members.some((roomMember) => roomMember.id === meId)) {
      toast.show('방에서 나왔어요.', 'info');
      navigate('/', { replace: true });
    }
  }, [room, meId, navigate, toast]);

  if (missing) {
    return <Navigate to="/" replace />;
  }
  if (!room) {
    return <Panel>방 정보를 불러오는 중…</Panel>;
  }

  const playing = room.status === 'PLAYING';
  const wasPlayer = view !== null && Object.hasOwn(view.game.tokens, String(meId));
  const showGameOver = !playing && view?.game.status === 'GAME_OVER' && wasPlayer && !dismissedGameOver;
  const showGame = view !== null && (playing || showGameOver);

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
    } catch (error) {
      toast.show(messageOf(error));
    }
  };

  const leave = () => {
    if (playing && !confirmLeave) {
      setConfirmLeave(true);
      return;
    }
    run(async () => {
      await roomsApi.leave(code);
      navigate('/', { replace: true });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{room.name}</h1>
          <p className="text-sm text-stone-500">{room.gameTypeName} · {playing ? '게임 중' : '대기 중'}</p>
        </div>
        <Button variant="danger" onClick={leave}>
          {confirmLeave ? '정말 나갈까요? (기권 처리)' : '나가기'}
        </Button>
      </div>
      {showGame ? (
        <Panel>게임이 진행 중이에요.</Panel>
      ) : (
        <WaitingRoom
          room={room}
          meId={meId}
          receivedAt={receivedAt}
          now={now}
          onStart={() => run(() => roomsApi.start(code))}
          onForfeit={(memberId) => run(() => roomsApi.forfeit(code, memberId))}
        />
      )}
      {log.length > 0 && !showGame ? null : null}
      <span className="hidden">{send.length}{String(setDismissedGameOver.length)}</span>
    </div>
  );
}
```
(마지막 두 줄은 Task 4에서 게임 영역으로 교체되며, `noUnusedLocals`를 통과시키기 위한 임시 참조다. Task 4가 이 파일의 `showGame ? (...)` 분기와 임시 줄을 교체한다.)

`frontend/src/auth/RequireAuth.tsx` — 로그인된 경우 실시간 연결을 감싸도록 교체:
```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { RealtimeProvider } from '../realtime/RealtimeContext';
import { useAuth } from './AuthContext';

export function RequireAuth() {
  const { member, loading } = useAuth();
  if (loading) {
    return <p className="p-10 text-center text-stone-500">불러오는 중…</p>;
  }
  if (!member) {
    return <Navigate to="/login" replace />;
  }
  return (
    <RealtimeProvider>
      <Outlet />
    </RealtimeProvider>
  );
}
```

`frontend/src/App.tsx` — 로비 라우트 아래에 방 라우트를 추가(import `RoomPage`):
```tsx
              <Route path="/" element={<LobbyPage />} />
              <Route path="/rooms/:code" element={<RoomPage />} />
```

- [ ] **Step 5: 테스트·빌드 통과 확인**

Run: `npm --prefix frontend test && npm --prefix frontend run build`
Expected: 모든 테스트 PASS(http 6, format 4, eventLog 6, Realtime 3), 빌드 성공

- [ ] **Step 6: 커밋**

```bash
git add frontend
git commit -m "feat: 실시간 연결, 로비, 대기실, 이벤트 로그" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 페이퍼 사파리 게임 화면

**Files:**
- Create: `frontend/src/games/papersafari/{cards.ts,score.ts,score.test.ts,CardFace.tsx,CardFace.test.tsx,PlayerBoard.tsx,PlayerBoard.test.tsx,PaperSafariTable.tsx,RoundResultModal.tsx,GameOverPanel.tsx}`
- Modify: `frontend/src/pages/RoomPage.tsx`

**Interfaces:**
- Consumes: Task 3 `useRoomChannel`의 `view`, `log`, `send`; `types.ts`
- Produces: `cardLabel/cardEmoji`, `columnScore`, `isZeroPair`, `estimateBoard`, `CardFace`, `PlayerBoard`, `PaperSafariTable`, `RoundResultModal`, `GameOverPanel`

- [ ] **Step 1: 실패하는 테스트 작성**

`frontend/src/games/papersafari/score.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import type { BoardView, CardView } from '../../api/types';
import { columnScore, estimateBoard, isZeroPair } from './score';

const n = (value: number): CardView => ({ kind: 'NUMBER', value });
const elephant: CardView = { kind: 'ELEPHANT', value: 10 };
const tarzan: CardView = { kind: 'TARZAN', value: 10 };
const fox: CardView = { kind: 'FOX', value: -2 };
const wild: CardView = { kind: 'WILD', value: 0 };

function board(cards: (CardView | null)[]): BoardView {
  const positions = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]];
  return {
    playerId: 1,
    slots: positions.map(([column, row], index) => ({ column, row, faceUp: cards[index] !== null, known: false, card: cards[index] })),
  };
}

describe('score', () => {
  it('다른 숫자는 더하고 같은 숫자와 와일드는 0점이다', () => {
    expect(columnScore(n(3), n(5))).toBe(8);
    expect(columnScore(n(7), n(7))).toBe(0);
    expect(columnScore(elephant, tarzan)).toBe(0);
    expect(columnScore(fox, fox)).toBe(0);
    expect(columnScore(fox, n(4))).toBe(2);
    expect(columnScore(wild, n(9))).toBe(0);
  });

  it('두 장이 모두 보일 때만 0점 쌍으로 강조한다', () => {
    expect(isZeroPair(n(7), n(7))).toBe(true);
    expect(isZeroPair(wild, n(3))).toBe(true);
    expect(isZeroPair(n(7), null)).toBe(false);
    expect(isZeroPair(n(7), n(8))).toBe(false);
  });

  it('보이는 카드로 예상 점수를 계산하고 가려진 장수를 센다', () => {
    expect(estimateBoard(board([n(3), n(7), wild, n(5), n(7), null]))).toEqual({ score: 8, hidden: 1 });
    expect(estimateBoard(board([null, null, n(9), null, null, null]))).toEqual({ score: 9, hidden: 5 });
  });
});
```

`frontend/src/games/papersafari/CardFace.test.tsx`
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardFace } from './CardFace';

describe('CardFace', () => {
  it('값이 없으면 뒷면으로 그린다', () => {
    render(<CardFace card={null} faceUp={false} known={false} />);

    expect(screen.getByLabelText('뒷면 카드')).toBeInTheDocument();
  });

  it('숫자 카드는 이모지와 숫자를 보여준다', () => {
    render(<CardFace card={{ kind: 'NUMBER', value: 7 }} faceUp known={false} />);

    expect(screen.getByLabelText('7 카드')).toHaveTextContent('🐊');
    expect(screen.getByLabelText('7 카드')).toHaveTextContent('7');
  });

  it('특수 카드는 이름을 보여준다', () => {
    render(<CardFace card={{ kind: 'TARZAN', value: 10 }} faceUp known={false} />);

    expect(screen.getByLabelText('타잔 10 카드')).toHaveTextContent('타잔');
  });

  it('엿본 카드는 엿봄 표시를 한다', () => {
    render(<CardFace card={{ kind: 'FOX', value: -2 }} faceUp={false} known />);

    expect(screen.getByLabelText('여우 -2 카드 (엿봄)')).toHaveTextContent('👁');
  });
});
```

`frontend/src/games/papersafari/PlayerBoard.test.tsx`
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BoardView } from '../../api/types';
import { PlayerBoard } from './PlayerBoard';

const board: BoardView = {
  playerId: 2,
  slots: [
    { column: 0, row: 0, faceUp: true, known: false, card: { kind: 'NUMBER', value: 7 } },
    { column: 1, row: 0, faceUp: false, known: false, card: null },
    { column: 2, row: 0, faceUp: true, known: false, card: { kind: 'WILD', value: 0 } },
    { column: 0, row: 1, faceUp: true, known: false, card: { kind: 'NUMBER', value: 7 } },
    { column: 1, row: 1, faceUp: false, known: false, card: null },
    { column: 2, row: 1, faceUp: true, known: false, card: { kind: 'NUMBER', value: 4 } },
  ],
};

describe('PlayerBoard', () => {
  it('0점 쌍인 열의 카드를 표시하고 상대의 뒷면 카드는 값이 없다', () => {
    render(<PlayerBoard board={board} nickname="밥" tokens={1} active={false} />);

    const slots = screen.getAllByTestId('slot');
    expect(slots.filter((slot) => slot.dataset.zeroPair === 'true')).toHaveLength(4);
    expect(screen.getAllByLabelText('뒷면 카드')).toHaveLength(2);
    expect(screen.getByText('밥')).toBeInTheDocument();
    expect(screen.getByLabelText('토큰 1개')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm --prefix frontend test`
Expected: FAIL — `Failed to resolve import "./score"` 등

- [ ] **Step 3: 카드·점수·판 구현**

`frontend/src/games/papersafari/cards.ts`
```ts
import type { CardView } from '../../api/types';

const NUMBER_EMOJI = ['🐁', '🐇', '🐒', '🦓', '🦒', '🐆', '🦛', '🐊', '🦏', '🦁'];
const SPECIAL = {
  ELEPHANT: { emoji: '🐘', name: '코끼리' },
  TARZAN: { emoji: '🧔', name: '타잔' },
  FOX: { emoji: '🦊', name: '여우' },
  WILD: { emoji: '❓', name: '와일드' },
} as const;

export function cardEmoji(card: CardView): string {
  if (card.kind === 'NUMBER') {
    return NUMBER_EMOJI[card.value] ?? '🃏';
  }
  return SPECIAL[card.kind].emoji;
}

export function cardName(card: CardView): string | null {
  if (card.kind === 'NUMBER') {
    return null;
  }
  return SPECIAL[card.kind].name;
}

export function cardLabel(card: CardView): string {
  const name = cardName(card);
  if (card.kind === 'WILD') {
    return '와일드';
  }
  return name ? `${name} ${card.value}` : String(card.value);
}
```

`frontend/src/games/papersafari/score.ts`
```ts
import type { BoardView, CardView } from '../../api/types';

export function columnScore(top: CardView, bottom: CardView): number {
  if (top.kind === 'WILD' || bottom.kind === 'WILD') {
    return 0;
  }
  if (top.value === bottom.value) {
    return 0;
  }
  return top.value + bottom.value;
}

export function isZeroPair(top: CardView | null, bottom: CardView | null): boolean {
  if (!top || !bottom) {
    return false;
  }
  return columnScore(top, bottom) === 0 && (top.kind === 'WILD' || bottom.kind === 'WILD' || top.value === bottom.value);
}

export function cardAt(board: BoardView, column: number, row: number): CardView | null {
  return board.slots.find((slot) => slot.column === column && slot.row === row)?.card ?? null;
}

function partialScore(card: CardView | null): number {
  if (!card || card.kind === 'WILD') {
    return 0;
  }
  return card.value;
}

export function estimateBoard(board: BoardView): { score: number; hidden: number } {
  let score = 0;
  for (const column of [0, 1, 2]) {
    const top = cardAt(board, column, 0);
    const bottom = cardAt(board, column, 1);
    score += top && bottom ? columnScore(top, bottom) : partialScore(top) + partialScore(bottom);
  }
  const hidden = board.slots.filter((slot) => slot.card === null).length;
  return { score, hidden };
}
```
주의: 한 장만 보이는 열에서 와일드는 짝과 상관없이 0점이므로 `partialScore`가 0을 돌려주고, 다른 쪽이 가려져 있어도 와일드 열은 0이다. `partialScore(top) + partialScore(bottom)`에서 하나가 와일드면 나머지는 가려진(null) 카드라 0이 되어 결과가 0이 된다.

`frontend/src/games/papersafari/CardFace.tsx`
```tsx
import type { CardView } from '../../api/types';
import { cardEmoji, cardLabel, cardName } from './cards';

type Props = {
  card: CardView | null;
  faceUp: boolean;
  known: boolean;
  size?: 'sm' | 'md';
  highlight?: boolean;
  onClick?: () => void;
};

const SIZES = { sm: 'h-14 w-10 text-lg', md: 'h-24 w-16 text-3xl' };

export function CardFace({ card, faceUp, known, size = 'md', highlight = false, onClick }: Props) {
  const ring = highlight ? 'ring-2 ring-safari-300' : 'ring-1 ring-stone-200';
  const clickable = onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : '';
  const base = `relative flex select-none flex-col items-center justify-center rounded-xl shadow-sm transition ${SIZES[size]} ${ring} ${clickable}`;

  if (!card) {
    return (
      <button type="button" aria-label="뒷면 카드" disabled={!onClick} onClick={onClick}
        className={`${base} bg-safari-600 text-white disabled:cursor-default`}>
        <span className="opacity-60">🌿</span>
      </button>
    );
  }

  const label = `${cardLabel(card)} 카드${known && !faceUp ? ' (엿봄)' : ''}`;
  const name = cardName(card);
  return (
    <button type="button" aria-label={label} disabled={!onClick} onClick={onClick}
      className={`${base} bg-white disabled:cursor-default ${known && !faceUp ? 'opacity-70' : ''}`}>
      <span>{cardEmoji(card)}</span>
      <span className="text-xs font-bold text-stone-700">{card.kind === 'WILD' ? '?' : card.value}</span>
      {name && size === 'md' ? <span className="text-[10px] text-stone-500">{name}</span> : null}
      {known && !faceUp ? <span className="absolute right-1 top-1 text-xs">👁</span> : null}
    </button>
  );
}
```

`frontend/src/games/papersafari/PlayerBoard.tsx`
```tsx
import type { BoardView, SlotView } from '../../api/types';
import { CardFace } from './CardFace';
import { cardAt, isZeroPair } from './score';

type Props = {
  board: BoardView;
  nickname: string;
  tokens: number;
  active: boolean;
  size?: 'sm' | 'md';
  onSlotClick?: (slot: SlotView) => void;
  canClick?: (slot: SlotView) => boolean;
};

const TOKENS_TO_WIN = 3;

export function PlayerBoard({ board, nickname, tokens, active, size = 'md', onSlotClick, canClick }: Props) {
  const ordered = [...board.slots].sort((a, b) => a.row - b.row || a.column - b.column);
  const zeroColumns = new Set(
    [0, 1, 2].filter((column) => isZeroPair(cardAt(board, column, 0), cardAt(board, column, 1))),
  );

  return (
    <div className={`rounded-2xl p-3 ${active ? 'bg-safari-50 ring-2 ring-safari-300' : 'bg-white ring-1 ring-stone-200'}`}>
      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold">{nickname}</span>
        <span aria-label={`토큰 ${tokens}개`} className="tracking-widest text-safari-600">
          {'●'.repeat(Math.min(tokens, TOKENS_TO_WIN))}{'○'.repeat(Math.max(TOKENS_TO_WIN - tokens, 0))}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {ordered.map((slot) => {
          const clickable = Boolean(onSlotClick && canClick?.(slot));
          return (
            <div key={`${slot.column}-${slot.row}`} data-testid="slot" data-zero-pair={zeroColumns.has(slot.column)}>
              <CardFace
                card={slot.card}
                faceUp={slot.faceUp}
                known={slot.known}
                size={size}
                highlight={zeroColumns.has(slot.column)}
                onClick={clickable ? () => onSlotClick?.(slot) : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 게임 테이블·결과 화면 구현과 방 페이지 연결**

`frontend/src/games/papersafari/RoundResultModal.tsx`
```tsx
import type { PaperSafariSessionView } from '../../api/types';
import { Button } from '../../components/ui';
import { resultLabel } from '../../lib/format';
import { PlayerBoard } from './PlayerBoard';
import { cardAt, columnScore } from './score';

type Props = {
  view: PaperSafariSessionView;
  meId: number;
  nicknameOf: (memberId: number) => string;
  onReady: () => void;
};

export function RoundResultModal({ view, meId, nicknameOf, onReady }: Props) {
  const game = view.game;
  const results = [...(game.lastRoundResult?.players ?? [])].sort((a, b) => a.score - b.score);
  const seated = game.round.boards.some((board) => board.playerId === meId);
  const ready = view.readyPlayerIds.includes(meId);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold">{game.roundNumber}라운드 결과</h2>
        <ul className="mb-4 space-y-1">
          {results.map((result) => (
            <li key={result.playerId} className="flex justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm">
              <span className="font-medium">{nicknameOf(result.playerId)}</span>
              <span>
                {result.score}점 · <strong className={result.outcome === 'WIN' ? 'text-safari-700' : ''}>{resultLabel(result.outcome)}</strong>
              </span>
            </li>
          ))}
        </ul>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          {game.round.boards.map((board) => (
            <div key={board.playerId}>
              <PlayerBoard board={board} nickname={nicknameOf(board.playerId)} tokens={game.tokens[String(board.playerId)] ?? 0} active={false} size="sm" />
              <p className="mt-1 text-center text-xs text-stone-500">
                열 점수{' '}
                {[0, 1, 2]
                  .map((column) => {
                    const top = cardAt(board, column, 0);
                    const bottom = cardAt(board, column, 1);
                    return top && bottom ? columnScore(top, bottom) : '?';
                  })
                  .join(' + ')}
              </p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-500">
            준비: {view.readyPlayerIds.map(nicknameOf).join(', ') || '아직 없음'}
          </span>
          {game.status === 'ROUND_OVER' && seated ? (
            <Button onClick={onReady} disabled={ready}>{ready ? '다른 사람을 기다리는 중…' : '다음 라운드 준비'}</Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
```

`frontend/src/games/papersafari/GameOverPanel.tsx`
```tsx
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
```

`frontend/src/games/papersafari/PaperSafariTable.tsx`
```tsx
import type { GameAction, PaperSafariSessionView, Room, SlotView } from '../../api/types';
import { Button, Panel } from '../../components/ui';
import { CardFace } from './CardFace';
import { GameOverPanel } from './GameOverPanel';
import { PlayerBoard } from './PlayerBoard';
import { RoundResultModal } from './RoundResultModal';
import { estimateBoard } from './score';

type Props = {
  view: PaperSafariSessionView;
  room: Room;
  meId: number;
  log: string[];
  send: (action: GameAction) => void;
  onCloseGameOver: () => void;
};

function instruction(phase: string, myTurn: boolean, needsFlip: boolean, currentName: string): string {
  if (phase === 'SETUP_FLIP') {
    return needsFlip ? '내 카드 1장을 골라 뒤집어 주세요.' : '다른 사람이 카드를 뒤집기를 기다리는 중…';
  }
  if (phase === 'ROUND_OVER') {
    return '라운드가 끝났어요!';
  }
  if (!myTurn) {
    return `${currentName}님의 차례예요.`;
  }
  if (phase === 'DRAW') {
    return '덱 또는 버린 카드 더미에서 카드를 가져오세요.';
  }
  if (phase === 'PLACE') {
    return '교체할 내 카드를 누르거나, 버리기를 누르세요.';
  }
  return '엿볼 내 뒷면 카드를 고르세요.';
}

export function PaperSafariTable({ view, room, meId, log, send, onCloseGameOver }: Props) {
  const game = view.game;
  const round = game.round;
  const nicknameOf = (memberId: number) => room.members.find((member) => member.id === memberId)?.nickname ?? '떠난 플레이어';

  if (game.status === 'GAME_OVER') {
    return <GameOverPanel game={game} meId={meId} nicknameOf={nicknameOf} onClose={onCloseGameOver} />;
  }

  const myBoard = round.boards.find((board) => board.playerId === meId);
  const others = round.boards.filter((board) => board.playerId !== meId);
  const myTurn = round.currentPlayerId === meId;
  const needsFlip = round.phase === 'SETUP_FLIP' && Boolean(myBoard) && !myBoard?.slots.some((slot) => slot.faceUp);
  const held = round.held;
  const canDiscard = myTurn && round.phase === 'PLACE' && held !== null && held.source === 'DECK' && held.card?.kind !== 'TARZAN';
  const estimate = myBoard ? estimateBoard(myBoard) : null;
  const tokensOf = (memberId: number) => game.tokens[String(memberId)] ?? 0;

  const canClickSlot = (slot: SlotView): boolean => {
    if (needsFlip) {
      return !slot.faceUp;
    }
    if (!myTurn) {
      return false;
    }
    if (round.phase === 'PLACE') {
      return true;
    }
    return round.phase === 'PEEK' && !slot.faceUp;
  };

  const clickSlot = (slot: SlotView) => {
    const position = { column: slot.column, row: slot.row };
    if (needsFlip) {
      send({ type: 'FLIP', ...position });
      return;
    }
    if (round.phase === 'PLACE') {
      send({ type: 'SWAP', ...position });
      return;
    }
    send({ type: 'PEEK', ...position });
  };

  const drawable = myTurn && round.phase === 'DRAW';

  return (
    <div className="space-y-4">
      <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
        {others.map((board) => (
          <div key={board.playerId} className="min-w-56">
            <PlayerBoard board={board} nickname={nicknameOf(board.playerId)} tokens={tokensOf(board.playerId)}
              active={round.currentPlayerId === board.playerId} size="sm" />
          </div>
        ))}
      </div>

      <Panel className="flex flex-col items-center gap-3">
        <p className="text-sm text-stone-500">{game.roundNumber}라운드</p>
        <div className="flex items-end gap-6">
          <div className="text-center">
            <button type="button" aria-label="덱에서 뽑기" disabled={!drawable} onClick={() => send({ type: 'DRAW_DECK' })}
              className="flex h-24 w-16 items-center justify-center rounded-xl bg-safari-600 text-2xl text-white shadow ring-1 ring-safari-700 transition enabled:hover:-translate-y-0.5 disabled:opacity-60">
              🌿
            </button>
            <p className="mt-1 text-xs text-stone-500">덱 {round.deckSize}장</p>
          </div>
          <div className="text-center">
            {round.discardTop ? (
              <CardFace card={round.discardTop} faceUp known={false}
                onClick={drawable ? () => send({ type: 'DRAW_DISCARD' }) : undefined} />
            ) : (
              <div className="h-24 w-16 rounded-xl border-2 border-dashed border-stone-300" />
            )}
            <p className="mt-1 text-xs text-stone-500">버린 카드</p>
          </div>
        </div>
        <p className="font-medium">{instruction(round.phase, myTurn, needsFlip, nicknameOf(round.currentPlayerId))}</p>
      </Panel>

      {myBoard ? (
        <div className="mx-auto max-w-md space-y-3">
          {held ? (
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm text-stone-500">
                {held.playerId === meId ? '들고 있는 카드' : `${nicknameOf(held.playerId)}님이 ${held.source === 'DECK' ? '덱' : '버린 카드 더미'}에서 가져온 카드`}
              </span>
              <CardFace card={held.card} faceUp={held.card !== null} known={false} size="sm" />
            </div>
          ) : null}
          <PlayerBoard board={myBoard} nickname={`${nicknameOf(meId)} (나)`} tokens={tokensOf(meId)} active={myTurn}
            onSlotClick={clickSlot} canClick={canClickSlot} />
          <div className="flex items-center justify-between">
            <Button variant="secondary" disabled={!canDiscard} onClick={() => send({ type: 'DISCARD' })}>버리기</Button>
            {estimate ? (
              <span className="text-sm text-stone-600">
                현재 예상 점수 <strong className="text-lg text-safari-700">{estimate.score}</strong>
                {estimate.hidden > 0 ? <span className="text-stone-400"> (+ 가려진 {estimate.hidden}장)</span> : null}
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <Panel className="text-center text-sm text-stone-500">이번 게임을 지켜보는 중이에요.</Panel>
      )}

      <Panel>
        <h3 className="mb-1 text-sm font-bold">진행 기록</h3>
        <ul className="space-y-0.5 text-sm text-stone-600">
          {log.length === 0 ? <li className="text-stone-400">아직 기록이 없어요.</li> : null}
          {log.map((line, index) => (
            <li key={`${index}-${line}`}>{line}</li>
          ))}
        </ul>
      </Panel>

      {round.phase === 'ROUND_OVER' ? (
        <RoundResultModal view={view} meId={meId} nicknameOf={nicknameOf} onReady={() => send({ type: 'READY' })} />
      ) : null}
    </div>
  );
}
```

`frontend/src/pages/RoomPage.tsx` — 게임 영역 분기와 임시 줄을 교체한다. import 추가: `import { PaperSafariTable } from '../games/papersafari/PaperSafariTable';`

다음 블록을
```tsx
      {showGame ? (
        <Panel>게임이 진행 중이에요.</Panel>
      ) : (
```
아래로 바꾸고,
```tsx
      {showGame && view ? (
        <PaperSafariTable
          view={view}
          room={room}
          meId={meId}
          log={log}
          send={send}
          onCloseGameOver={() => setDismissedGameOver(true)}
        />
      ) : (
```
그리고 임시 두 줄
```tsx
      {log.length > 0 && !showGame ? null : null}
      <span className="hidden">{send.length}{String(setDismissedGameOver.length)}</span>
```
을 삭제한다.

- [ ] **Step 5: 테스트·빌드 통과 확인**

Run: `npm --prefix frontend test && npm --prefix frontend run build`
Expected: 모든 테스트 PASS(score 3, CardFace 4, PlayerBoard 1 추가), 빌드 성공

- [ ] **Step 6: 커밋**

```bash
git add frontend
git commit -m "feat: 페이퍼 사파리 게임 화면(카드, 판, 예상 점수, 라운드 결과, 게임 종료)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 전적 페이지

**Files:**
- Create: `frontend/src/records/RecentMatches.tsx`, `frontend/src/pages/RecordsPage.tsx`, `frontend/src/pages/RecordsPage.test.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `recordsApi`, `StatSummary`, `RankingList`, `format`
- Produces: 라우트 `/records`(내 전적), `/records/:memberId`(다른 회원), 탭 "전적"/"순위표"

- [ ] **Step 1: 실패하는 테스트 작성**

`frontend/src/pages/RecordsPage.test.tsx`
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordsApi } from '../api/records';
import { ToastProvider } from '../components/Toast';
import { RecordsPage } from './RecordsPage';

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ member: { id: 1, loginId: 'alice01', nickname: '앨리스' } }),
}));

describe('RecordsPage', () => {
  beforeEach(() => {
    vi.spyOn(recordsApi, 'me').mockResolvedValue({
      memberId: 1,
      nickname: '앨리스',
      stats: [{
        gameType: 'PAPER_SAFARI', gameTypeName: '페이퍼 사파리', matches: 3, wins: 2, draws: 0, losses: 1,
        winRate: 2 / 3, rounds: 3, roundWins: 2, roundDraws: 0, roundLosses: 1, roundWinRate: 2 / 3, averageRoundScore: 14,
      }],
    });
    vi.spyOn(recordsApi, 'matches').mockResolvedValue([{
      matchId: 9, gameType: 'PAPER_SAFARI', startedAt: '2026-10-05T10:00:00Z', endedAt: '2026-10-05T10:20:00Z',
      result: 'WIN', tokens: 3,
      players: [{ memberId: 1, nickname: '앨리스', result: 'WIN', tokens: 3 }, { memberId: 2, nickname: '밥', result: 'LOSE', tokens: 1 }],
      rounds: [{ roundNumber: 1, result: 'WIN', score: 1 }, { roundNumber: 2, result: 'LOSE', score: 20 }],
    }]);
    vi.spyOn(recordsApi, 'rankings').mockResolvedValue([
      { rank: 1, memberId: 2, nickname: '밥', matches: 6, wins: 5, draws: 0, losses: 1, winRate: 5 / 6 },
    ]);
  });

  function renderPage() {
    return render(
      <ToastProvider>
        <MemoryRouter initialEntries={['/records']}>
          <Routes>
            <Route path="/records" element={<RecordsPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );
  }

  it('내 통계와 최근 경기를 보여준다', async () => {
    renderPage();

    expect(await screen.findByText(/3전 2승 0무 1패/)).toBeInTheDocument();
    expect(screen.getByText('승률 66.7%')).toBeInTheDocument();
    expect(await screen.findByText('밥')).toBeInTheDocument();
    expect(screen.getByText('승 패')).toBeInTheDocument();
  });

  it('순위표 탭으로 바꿀 수 있다', async () => {
    renderPage();
    await screen.findByText(/3전 2승 0무 1패/);

    await userEvent.click(screen.getByRole('button', { name: '순위표' }));

    expect(await screen.findByText(/6전 5승/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm --prefix frontend test`
Expected: FAIL — `Failed to resolve import "./RecordsPage"`

- [ ] **Step 3: 구현**

`frontend/src/records/RecentMatches.tsx`
```tsx
import { Link } from 'react-router-dom';
import type { RecentMatch } from '../api/types';
import { dateTime, resultLabel } from '../lib/format';

export function RecentMatches({ matches, ownerId }: { matches: RecentMatch[]; ownerId: number }) {
  if (matches.length === 0) {
    return <p className="text-sm text-stone-500">아직 끝난 경기가 없어요.</p>;
  }
  return (
    <ul className="divide-y divide-stone-100 text-sm">
      {matches.map((match) => (
        <li key={match.matchId} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <span className="w-24 text-stone-500">{dateTime(match.endedAt)}</span>
          <span className="flex-1">
            {match.players
              .filter((player) => player.memberId !== ownerId)
              .map((player, index) => (
                <span key={player.memberId}>
                  {index > 0 ? ', ' : 'vs '}
                  <Link to={`/records/${player.memberId}`} className="hover:underline">{player.nickname}</Link>
                </span>
              ))}
          </span>
          <span className={`w-10 font-bold ${match.result === 'WIN' ? 'text-safari-700' : 'text-stone-600'}`}>{resultLabel(match.result)}</span>
          <span className="w-16 text-stone-500">토큰 {match.tokens}</span>
          <span className="w-28 text-xs text-stone-400">{match.rounds.map((round) => resultLabel(round.result)).join(' ')}</span>
        </li>
      ))}
    </ul>
  );
}
```

`frontend/src/pages/RecordsPage.tsx`
```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { messageOf } from '../api/http';
import { recordsApi } from '../api/records';
import type { MemberStats, Ranking, RecentMatch } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Panel } from '../components/ui';
import { useToast } from '../components/Toast';
import { RankingList } from '../records/RankingList';
import { RecentMatches } from '../records/RecentMatches';
import { StatSummary } from '../records/StatSummary';

const GAME = 'PAPER_SAFARI' as const;
type Tab = 'records' | 'ranking';

export function RecordsPage() {
  const params = useParams();
  const { member } = useAuth();
  const toast = useToast();
  const memberId = params.memberId ? Number(params.memberId) : (member?.id ?? 0);
  const isMe = !params.memberId || memberId === member?.id;
  const [tab, setTab] = useState<Tab>('records');
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [matches, setMatches] = useState<RecentMatch[]>([]);
  const [rankings, setRankings] = useState<Ranking[]>([]);

  useEffect(() => {
    const load = isMe ? recordsApi.me() : recordsApi.member(memberId);
    load.then(setStats).catch((error) => toast.show(messageOf(error)));
    recordsApi.matches(memberId, GAME, 10).then(setMatches).catch((error) => toast.show(messageOf(error)));
    recordsApi.rankings(GAME).then(setRankings).catch((error) => toast.show(messageOf(error)));
  }, [memberId, isMe, toast]);

  const tabClass = (value: Tab) =>
    `rounded-lg px-3 py-1.5 text-sm ${tab === value ? 'bg-safari-600 font-semibold text-white' : 'bg-white text-stone-600 ring-1 ring-stone-200'}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{isMe ? '내 전적' : `${stats?.nickname ?? ''}님의 전적`}</h1>
        <div className="flex gap-2">
          <button type="button" className={tabClass('records')} onClick={() => setTab('records')}>전적</button>
          <button type="button" className={tabClass('ranking')} onClick={() => setTab('ranking')}>순위표</button>
        </div>
      </div>
      {tab === 'records' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {stats?.stats.map((stat) => (
              <Panel key={stat.gameType}>
                <StatSummary stat={stat} />
              </Panel>
            ))}
          </div>
          <Panel>
            <h2 className="mb-2 font-bold">최근 경기</h2>
            <RecentMatches matches={matches} ownerId={memberId} />
          </Panel>
        </>
      ) : (
        <Panel>
          <h2 className="mb-2 font-bold">페이퍼 사파리 순위표 (5판 이상)</h2>
          <RankingList rankings={rankings} />
        </Panel>
      )}
    </div>
  );
}
```

`frontend/src/App.tsx` — 방 라우트 아래에 추가(import `RecordsPage`):
```tsx
              <Route path="/records" element={<RecordsPage />} />
              <Route path="/records/:memberId" element={<RecordsPage />} />
```

- [ ] **Step 4: 테스트·빌드 통과 확인**

Run: `npm --prefix frontend test && npm --prefix frontend run build`
Expected: 모든 테스트 PASS, 빌드 성공

- [ ] **Step 5: 커밋**

```bash
git add frontend
git commit -m "feat: 전적 페이지(게임별 통계, 최근 경기, 순위표)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Docker Compose 배포와 실행 문서

**Files:**
- Create: `frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/.dockerignore`, `docker-compose.yml`, `README.md`

**Interfaces:**
- Consumes: Task 1 백엔드 이미지·`docker` 프로필, Task 2~5 프론트 빌드
- Produces: `docker compose up -d --build` → http://localhost:8000 에서 전체 서비스

- [ ] **Step 1: 파일 작성**

`frontend/nginx.conf`
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://backend:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header Origin $http_origin;
        proxy_read_timeout 3600s;
    }

    location / {
        try_files $uri /index.html;
    }
}
```

`frontend/Dockerfile`
```dockerfile
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

`frontend/.dockerignore`
```
node_modules/
dist/
```

`docker-compose.yml`
```yaml
services:
  mysql:
    image: mysql:8.4
    environment:
      MYSQL_DATABASE: boardgame
      MYSQL_USER: boardgame
      MYSQL_PASSWORD: ${DB_PASSWORD:-boardgame}
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD:-rootpassword}
      TZ: UTC
    command: ["--character-set-server=utf8mb4", "--collation-server=utf8mb4_0900_ai_ci"]
    volumes:
      - mysql-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-uroot", "-p${DB_ROOT_PASSWORD:-rootpassword}"]
      interval: 5s
      timeout: 5s
      retries: 30

  backend:
    build: ./backend
    environment:
      SPRING_PROFILES_ACTIVE: docker
      DB_URL: jdbc:mysql://mysql:3306/boardgame?serverTimezone=UTC&characterEncoding=UTF-8
      DB_USERNAME: boardgame
      DB_PASSWORD: ${DB_PASSWORD:-boardgame}
      COOKIE_SECURE: ${COOKIE_SECURE:-false}
      APP_WEBSOCKET_ALLOWED_ORIGIN_PATTERNS: ${ALLOWED_ORIGINS:-http://localhost:[*],http://127.0.0.1:[*]}
    depends_on:
      mysql:
        condition: service_healthy

  frontend:
    build: ./frontend
    ports:
      - "${PORT:-8000}:80"
    depends_on:
      - backend

volumes:
  mysql-data:
```

`README.md`
```markdown
# 🌿 보드게임 라운지

지인들과 웹에서 함께하는 보드게임. 첫 게임은 **페이퍼 사파리**(2~5인).

## 기능
- 아이디/비밀번호 회원가입·로그인 (세션 쿠키)
- 로비: 방 만들기, 방 목록, 6자리 방 코드로 입장, 내 전적 요약, 순위표 TOP 5
- 대기실: 참가자·접속 상태, 방장 시작, 60초 이상 끊긴 사람 내보내기
- 실시간 게임(STOMP WebSocket): 서버가 규칙을 판정하고 각자에게 자기 시점 화면만 전송
- 전적: 게임/라운드 승·무·패, 승률, 평균 점수, 최근 경기 10개, 순위표(5판 이상)

## 바로 실행 (Docker)
```bash
docker compose up -d --build
# http://localhost:8000
```
- 다른 포트: `PORT=9000 docker compose up -d --build`
- HTTPS 리버스 프록시 뒤에서 운영할 때: `COOKIE_SECURE=true`, `ALLOWED_ORIGINS=https://your.domain` 지정
- 종료: `docker compose down` (데이터 유지) / `docker compose down -v` (DB 삭제)

## 개발 환경에서 실행
필요: Java 21, Maven 3.9+, Node 24

```bash
# 백엔드 (H2 파일 DB: backend/data/)
mvn -f backend/pom.xml spring-boot:run
# H2 콘솔이 필요하면: mvn -f backend/pom.xml spring-boot:run -Dspring-boot.run.profiles=local  → http://localhost:8080/h2-console

# 프론트엔드 (다른 터미널)
npm --prefix frontend install
npm --prefix frontend run dev
# http://localhost:5173  (/api, /ws 는 8080으로 프록시)
```
친구 두 명을 한 컴퓨터에서 흉내 내려면 `http://localhost:5173`와 `http://127.0.0.1:5173`을 각각 다른 계정으로 여세요(쿠키가 분리됩니다).

## 테스트
```bash
mvn -f backend/pom.xml test
npm --prefix frontend test
```

## 구조
- `backend/` Spring Boot 3.5 (Java 21): `papersafari`(규칙 엔진), `game`(게임 공통 계약·이벤트), `room`(방·실시간), `member`(회원), `record`(전적)
- `frontend/` React 19 + Vite + Tailwind
- `docs/superpowers/` 설계 스펙과 구현 계획
```

- [ ] **Step 2: 빌드와 기동 확인**

Run:
```bash
docker compose build
docker compose up -d
for i in $(seq 1 60); do curl -sf -o /dev/null http://localhost:8000/ && break; sleep 2; done
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/
curl -s -w "\n%{http_code}\n" http://localhost:8000/api/members/me
curl -s -c /tmp/bg-cookies -H 'Content-Type: application/json' -d '{"loginId":"dockertest1","nickname":"도커","password":"password1"}' http://localhost:8000/api/members
curl -s -c /tmp/bg-cookies -b /tmp/bg-cookies -H 'Content-Type: application/json' -d '{"loginId":"dockertest1","password":"password1"}' http://localhost:8000/api/auth/login
curl -s -b /tmp/bg-cookies http://localhost:8000/api/records/me
docker compose logs backend | grep -iE "error|exception" | head -20
```
Expected: `/` 200; `/api/members/me` 401 JSON(`UNAUTHORIZED`); 가입 201 JSON(이미 있으면 409 `DUPLICATE_LOGIN_ID`); 로그인 200; 전적 200 JSON(`stats[0].matches` 0 이상); 백엔드 로그에 스키마 생성 오류 없음(MySQL에서 테이블 생성 확인)

- [ ] **Step 3: 정리와 커밋**

Run: `docker compose down`

```bash
git add frontend/Dockerfile frontend/nginx.conf frontend/.dockerignore docker-compose.yml README.md
git commit -m "feat: Docker Compose 배포(MySQL·백엔드·nginx 프론트)와 실행 문서" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## 계획 5 완료 기준

- `mvn -q -f backend/pom.xml test`, `npm --prefix frontend test`, `npm --prefix frontend run build` 모두 통과
- `docker compose up -d --build` 후 http://localhost:8000 에서 가입·로그인·로비·방·게임·전적 흐름 동작(최종 확인은 브라우저 두 개로 한 판 플레이)
