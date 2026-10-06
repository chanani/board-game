# 라운지 개선 20건 설계 (관전·비공개방·중복 로그인·화면 다듬기)

- 작성일: 2026-10-06
- 기반: `2026-10-06-tabletop-ui-redesign-design.md` (master aac6235)
- 요청 원문: 사용자 메시지 20개 항목. 이 문서의 번호 `#N`은 그 항목 번호다.

## 1. 결정 사항

| 항목 | 결정 |
|---|---|
| #20 중복 로그인 | 새 로그인이 기존 세션을 끊는다. 기존 탭은 "다른 곳에서 로그인해서 로그아웃됐어요" 안내와 함께 로그인 화면으로 |
| #19 비공개방 | 목록에 🔒로 보이고, 참가·코드 입장 시 비밀번호 필요 |
| #1 게임 중인 방 | 목록에 "게임 중인 방" 섹션으로 노출. **공개방은 관전 입장 가능**, 비공개방은 입장 불가 |
| #14 라운지 이동 | 방에 있어도 라운지·목록·전적을 자유롭게 보고, 화면 하단에 "참여 중인 방으로 돌아가기" 바. 결과 모달은 한 번 닫으면 같은 게임에서 다시 안 뜸 |
| #17 최대 인원 | 방장이 2~5명 중 선택(기본 5) |

범위 제외: 비밀번호 시도 횟수 제한, 관전자 채팅, 게임 목록 실시간 푸시, 관전 중 좌석 교체.

## 2. 백엔드

모든 Java 코드는 `/Users/ichanhan/CLAUDE.md`의 객체지향 생활 체조(들여쓰기 1단계, `else` 금지, VO, 한 줄 점 하나, 일급 컬렉션, 필드 3개 이하, `BusinessException(ErrorCode)`)를 지킨다. 규칙 엔진(`papersafari`)은 아래 2.4의 진행 라운드 조회 하나만 추가한다.

### 2.1 방 설정: 최대 인원(#17), 비공개방(#19)

도메인 구조(필드 3개 이하 유지):
- `RoomProfile(RoomCode code, RoomName name, RoomSettings settings)` — 기존 `gameType` 필드를 `settings`로 옮긴다.
- `RoomSettings(GameType gameType, Capacity capacity, RoomLock lock)`
- `Capacity`: 게임의 `minPlayers..maxPlayers` 범위 정수 VO. 범위 밖이면 `INVALID_CAPACITY`(400, "최대 인원은 2~5명 중에서 골라 주세요.").
- `RoomLock`: 공개(`RoomLock.open()`) 또는 비밀번호 해시를 가진 잠금. `matches(RawRoomPassword, PasswordEncryptor)`; 공개면 항상 통과.
- `RawRoomPassword`: 4~20자 VO. 위반 시 `INVALID_ROOM_PASSWORD`(400, "방 비밀번호는 4~20자로 입력해 주세요.").
- 비밀번호는 기존 `PasswordEncryptor`(BCrypt)로 해시해 메모리(방 객체)에만 둔다. 응답에 해시나 원문을 절대 넣지 않는다.
- 정원 검사(`RoomMembers.add`)는 `GameType.maxPlayers()` 대신 방의 `Capacity`를 쓴다.

API:
- `POST /api/rooms` body: `{ "name": "...", "gameType": "PAPER_SAFARI", "maxPlayers": 4, "password": "1234" }`
  - `maxPlayers` 생략 시 게임 최대 인원. `password`가 null·빈 문자열이면 공개방.
- `POST /api/rooms/{code}/join` body(선택): `{ "password": "..." }`
  - 잠긴 방인데 비밀번호가 없거나 틀리면 403 `ROOM_PASSWORD_MISMATCH`("비밀번호가 맞지 않아요.").
  - 이미 그 방의 참가자면 비밀번호 없이 통과(새로고침·재입장). 관전자가 "자리에 앉기"로 참가할 때(2.3)도 비밀번호 검사 대상이 아니다(관전은 공개방만 가능하므로).
- `RoomResponse`에 `maxPlayers`(방 정원), `locked: boolean` 추가.

### 2.2 방 목록에 게임 중인 방(#1)

- `GET /api/rooms?gameType=` 이 대기 중 + 게임 중 방을 모두 돌려준다(코드 순 정렬 유지, 대기 방이 먼저).
- `RoomSummaryResponse`에 추가: `status`("WAITING"|"PLAYING"), `locked`, `maxPlayers`(방 정원), `roundNumber`(게임 중일 때 현재 라운드, 아니면 null), `spectatorCount`.
- 기존 `RoomService.waitingRooms`는 `rooms(gameType)`로 이름을 바꾸고 프론트 `roomsApi.list`도 맞춘다.

### 2.3 관전(#1 변경분)

- `Room`의 사람들을 `RoomOccupants(RoomMembers players, Spectators spectators)`로 묶는다. `Room` 필드는 `profile`, `occupants`, `game` 3개.
- `Spectators`: 일급 컬렉션(`Participant` 목록). 추가·제거·포함 여부·목록.
- `POST /api/rooms/{code}/watch`:
  - 방이 게임 중이고 공개방일 때만. 잠긴 방이면 403 `ROOM_PRIVATE`("비공개방은 관전할 수 없어요."), 대기 중이면 409 `ROOM_NOT_PLAYING`("게임 중인 방만 관전할 수 있어요. 참가하기를 눌러 주세요.").
  - 이미 다른 방(참가·관전)에 있으면 기존 `ALREADY_IN_ROOM`. 이미 이 방의 참가자·관전자면 그대로 성공.
- `RoomRegistry`의 회원→방 색인은 참가자와 관전자 모두를 포함한다(한 사람 한 방 규칙). 방이 비었는지 판단(`isEmpty`)은 **참가자 기준**: 참가자가 0명이면 관전자가 있어도 방을 없앤다(관전자 색인도 함께 정리).
- `leave`: 관전자면 관전자에서만 빠진다(기권·결과 영향 없음).
- `POST /api/rooms/{code}/seat`(자리에 앉기): 관전자가 대기 상태의 방에서 참가자로 옮긴다. 정원 초과면 `ROOM_FULL`. 게임 중이면 `ROOM_ALREADY_PLAYING`.
- 권한:
  - `act`, `start`, `forfeit`(요청자·대상) — 참가자만(기존 `NOT_IN_ROOM`).
  - `get`, `sync`, 방 토픽 구독 — 참가자 또는 관전자.
  - `sync`에서 관전자에게는 `room.viewFor(spectatorId)`를 보낸다. 엔진은 자리 없는 시청자에게 공개 정보만 준다(뒷면 카드 `card=null`; `SlotView.of`) — 기존 동작 그대로.
- 연결 상태(Presence)·60초 기권은 참가자에게만 적용. 관전자 연결은 추적하지 않는다.
- `RoomResponse`에 `spectators: [{id, nickname}]` 추가.
- 게임 목록 인원(`GET /api/games`)은 참가자만 센다(변경 없음).
- 방 토픽 구독 보안(신규): `/topic/rooms/{code}` 구독은 그 방의 참가자·관전자만 허용한다. `InboundDestinationGuard` 또는 별도 `ChannelInterceptor`에서 Principal의 회원 ID로 `RoomService.isOccupant(code, memberId)`를 확인하고, 아니면 거부한다. 지금은 코드만 알면 누구나 구독할 수 있어 비공개방 참가자 목록이 새는 문제를 막는다.

### 2.4 진행 라운드

- `GameSession`에 `int roundNumber()`(진행 중 라운드 번호) 추가. `PaperSafariSession`은 `game`의 현재 라운드 번호를 돌려준다. `Room.roundNumber()`는 게임이 진행 중일 때만 `Optional`로.

### 2.5 중복 로그인 차단(#20)

- `ActiveSessions`(common.security): 회원 ID → 현재 HTTP 세션을 기억한다(`ConcurrentHashMap<Long, HttpSession>`). 필드는 활성 맵과 `ReplacedSessions` 두 개.
- `SessionLogin.establish` 마지막에 `activeSessions.replace(memberId, newSession)`: 이전 세션이 있고 새 세션과 다르면
  1. 이전 세션 ID를 `ReplacedSessions`에 기록(최대 1,000개, 30분 지나면 제거).
  2. 이전 세션을 `invalidate()`.
  3. 이전 세션 ID로 열린 WebSocket 연결을 닫는다(2.5.1).
- 로그아웃·세션 만료 시 맵에서 제거(`HttpSessionListener` 또는 로그아웃 핸들러). 제거는 "그 회원의 현재 세션이 바로 그 세션일 때만".
- 401 응답 구분: `JsonAuthenticationEntryPoint`는 요청의 `requestedSessionId`가 `ReplacedSessions`에 있으면 `SESSION_REPLACED`(401, "다른 곳에서 로그인해서 로그아웃됐어요.")를, 아니면 기존 `UNAUTHORIZED`를 쓴다.

#### 2.5.1 WebSocket 끊기

- 핸드셰이크 인터셉터(`HttpSessionHandshakeInterceptor`)로 HTTP 세션 ID를 WebSocket 세션 속성에 넣는다.
- `WebSocketHandlerDecoratorFactory`로 열린 `WebSocketSession`을 HTTP 세션 ID별로 기억하는 `WebSocketSessions` 컴포넌트를 둔다(닫히면 제거).
- 세션 교체 시 해당 HTTP 세션 ID의 WebSocket들을 `CloseStatus(4001, "SESSION_REPLACED")`로 닫는다.

## 3. 프론트엔드

### 3.1 게임 목록(#2, #4, #5)

- 문구: 상단 메뉴·제목의 "게임 선반" → **"게임 목록"**. 부제 → **"목록에서 게임을 골라 주세요"**. (페이지 이름·경로 `/`는 그대로)
- 게임 상자 아래에 "규칙 보기" 버튼(책 SVG 아이콘 + 텍스트). 누르면 `RulesCarousel` 모달:
  - 7장 슬라이드: ①목표(낮은 점수, 토큰 3개) ②준비(6장 3×2, 1장 뒤집기) ③내 차례(덱 또는 버린 카드 더미에서 1장) ④교체·버리기(더미에서 가져온 카드·타잔은 버릴 수 없음) ⑤같은 열 같은 숫자 = 0점, 와일드 = 그 열 0점 ⑥특수 카드(코끼리 엿보기, 타잔 왼쪽 사람에게 밀어내기, 여우 -2) ⑦라운드 종료(누군가 6장 공개 → 즉시 종료, 최저점 토큰, 동점 무승부)·3토큰 승리.
  - 각 장에 해당 카드 일러스트(`CardFace`/`CardArt`)를 크게 넣는다.
  - 조작: 이전/다음 버튼(첫 장 이전·마지막 장 다음은 비활성), 점 표시기(눌러서 이동, `aria-current`), 키보드 ←/→, 터치 스와이프(가로 50px 이상). 슬라이드 전환은 가로 슬라이드 애니메이션(동작 줄이기면 페이드 없이 즉시).
  - 규칙 문구는 `games/papersafari/rules.ts` 한 곳에 두고 대기실 규칙(#8)과 슬라이드가 함께 쓴다.

### 3.2 게임 로비(#3, #6, #7, #17, #18, #19, #1)

- #3 방 만들기 영역과 방 목록 섹션 사이 간격 확대(최소 24px, 모바일 포함).
- #17·#19 방 만들기 폼: 방 이름, 최대 인원(2~5 선택 버튼 그룹, 기본 5), "비공개방" 체크박스 → 체크 시 비밀번호 입력(4~20자) 표시.
- #1 목록 두 섹션: "기다리는 방"(참가 버튼; 🔒면 비밀번호 모달), "게임 중인 방"(N라운드 진행 중, 인원, 👀 관전 N; 공개방은 "관전하기", 🔒은 비활성 "비공개").
- 코드로 입장: 서버가 `ROOM_PASSWORD_MISMATCH`를 돌려주면 비밀번호 모달을 띄워 다시 시도. 게임 중인 방 코드로 입장 시도 시 `ROOM_ALREADY_PLAYING`이면 공개방은 관전 입장을 제안한다.
- `PasswordModal`: 비밀번호 입력, 확인/취소, 틀리면 모달 안에 오류 문구.
- #6 내 전적 요약: 항목을 세로 목록으로(라벨 왼쪽, 값 오른쪽): 게임 n판 / 승·무·패 / 승률 / 라운드 n판 / 라운드 승률 / 평균 점수.
- #7 방 목록 폴링 1초(`ROOMS_POLL_MS = 1000`), 게임 목록 인원 폴링도 1초. 요청이 끝나기 전에 다음 폴링이 겹치지 않게(진행 중이면 건너뜀).
- #18 새로고침: 원형 화살표 SVG 아이콘 버튼(`aria-label="새로고침"`), 누르면 360° 회전.

### 3.3 방 이동과 결과 모달(#14)

- 게임 목록·로비의 "이미 방에 있으면 방으로 자동 이동"을 없앤다. 대신 `Layout` 하단에 `ActiveRoomBar`: 내가 방(참가·관전)에 있고 현재 경로가 그 방이 아니면 "🎲 참여 중인 방으로 돌아가기 (방 이름)" 고정 바 표시, 누르면 방으로. 방 정보는 `GET /api/rooms/me`로 경로 변경 시 + 5초마다 확인.
- 로그인 직후(로그인·회원가입 성공 시)만 방에 있으면 그 방으로 이동(기존 유지).
- 결과 모달(게임 종료) 닫음 기록: `sessionStorage['bg.dismissedGameOver']`에 `"<방코드>:<winnerId>:<tokens JSON>"` 형식의 식별자를 저장한다(서버 응답에 matchKey가 없으므로, 같은 게임 결과면 같은 값이 되는 조합을 쓴다). 읽기/쓰기는 try/catch.

### 3.4 대기실(#8)

- 규칙 패널: `details` 아코디언 제거, 항상 펼침(`rules.ts` 요약 문구 사용).
- 좁은 화면에서 의자 패널과 규칙 패널이 세로로 쌓일 때 간격 24px 이상.
- 관전자 목록: "👀 관전 중: 닉네임들". 내가 관전자면 "자리에 앉기" 버튼(정원 남았을 때, 대기 상태에서만).

### 3.5 게임 화면(#9, #10, #11, #12)

- #9 PC가 아닌 배치(`TableRail`): 내 판 오른쪽에 세로 칸 — "버리기" 버튼 위, 예상 점수 아래. 컨테이너 폭이 좁으면(컨테이너 쿼리 `@container`, 폭 < 340px) "(+ 가려진 N장)"을 숨기고 점수 글자를 한 단계 작게.
- #10 `TableRail` 상대 줄: 가운데 정렬(`justify-center`), 상대 간격 6px(넘치면 가로 스크롤은 유지하되 스크롤 시작점이 잘리지 않게 `justify-[safe_center]`).
- #11 상대 판 확대: 상대 `Seat`(두 배치 모두)의 판을 누르면 `OpponentBoardModal`: 닉네임, 토큰, 연결 상태, `lg` 카드 판, 예상 점수(`estimateBoard`, "+ 가려진 N장"). 작은 판에도 예상 점수 배지(`예상 N점`). 판 전체가 버튼(`aria-label="밥님의 판 크게 보기"`); 판 안의 카드는 상대 판이라 원래 클릭 불가이므로 충돌 없음.
- #12 안내 문구 흔들림: `Hud` 안내 영역을 고정 높이(두 줄, `min-h`+`line-clamp-2`)로 예약. PC가 아닌 배치에서는 짧은 문구 사용:
  - "덱 또는 버린 카드 더미에서 카드를 가져오세요." → "덱이나 버린 카드에서 가져오세요"
  - "교체할 내 카드를 누르거나, 버리기를 누르세요." → "바꿀 카드를 누르거나 버리세요"
  - "교체할 내 카드를 눌러 주세요. (이 카드는 버릴 수 없어요)" → "바꿀 카드를 눌러 주세요 (버리기 불가)"
  - "내 카드 1장을 골라 뒤집어 주세요." → "카드 1장을 뒤집어 주세요"
  - 나머지는 원문 유지.
- 관전자 화면: 모든 플레이어를 상대 자리로 보여주고 내 판 자리에 "👀 관전 중이에요". 상단에 "👀 관전 N명".

### 3.6 결과 창(#13)

- 라운드 결과·게임 종료 모달 모두: 결과 목록 항목 간격(최소 8px), 판 그리드 간격(최소 16px), 섹션 간 간격(최소 24px), 모달 안쪽 여백 PC 32px / 모바일 20px.

### 3.7 아이콘(#15, #16, #18)

- `components/icons.tsx`: `SpeakerIcon`, `SpeakerMutedIcon`, `RefreshIcon`, `BookIcon`, `EyeIcon` — 24×24 viewBox 단색 SVG(`currentColor`), `aria-hidden`.
- 음소거 버튼: 이모지 대신 아이콘(`aria-label` 소리 켜기/끄기 유지).
- 파비콘: `frontend/public/favicon.svg` 신규(초록 펠트 원 + 비스듬한 사자 카드 + 크림 테두리), `index.html`의 data-URI 파비콘을 교체.

### 3.8 중복 로그인 안내(#20)

- `http.ts`: 401 응답의 `code`가 `SESSION_REPLACED`면 unauthorized 핸들러에 그 이유를 넘긴다.
- `Realtime`: WebSocket close code 4001이면 같은 처리.
- 로그인 화면으로 이동하면서 상단에 "다른 곳에서 로그인해서 로그아웃됐어요." 안내(경로 state로 전달).

## 4. 오류 코드 추가

| 코드 | 상태 | 메시지 |
|---|---|---|
| INVALID_CAPACITY | 400 | 최대 인원은 2~5명 중에서 골라 주세요. |
| INVALID_ROOM_PASSWORD | 400 | 방 비밀번호는 4~20자로 입력해 주세요. |
| ROOM_PASSWORD_MISMATCH | 403 | 비밀번호가 맞지 않아요. |
| ROOM_PRIVATE | 403 | 비공개방은 관전할 수 없어요. |
| ROOM_NOT_PLAYING | 409 | 게임 중인 방만 관전할 수 있어요. 참가하기를 눌러 주세요. |
| NOT_SPECTATOR | 409 | 관전 중인 사람만 자리에 앉을 수 있어요. |
| SESSION_REPLACED | 401 | 다른 곳에서 로그인해서 로그아웃됐어요. |


## 5. 테스트

백엔드:
- `Capacity`(범위), `RawRoomPassword`(길이), `RoomLock`(공개 통과, 맞음/틀림).
- 방 정원이 `Capacity`를 따른다(3명 방에 4번째 → ROOM_FULL).
- API: 비공개방 생성·응답에 해시 없음, 비밀번호 없이/틀리게 참가 403, 맞으면 200, 기존 참가자 재입장 통과.
- 관전: 공개 게임 중 방 관전 200, 비공개 403, 대기 중 409, 관전자 `act` 거부, 관전자 `sync`로 공개 정보만 수신(뒷면 카드 null), 관전자 나가기, 참가자 0명이면 방 삭제·관전자 색인 정리, 게임 종료 후 자리 앉기(정원 초과 ROOM_FULL).
- 목록: status/locked/maxPlayers/roundNumber/spectatorCount.
- 방 토픽 구독: 참가자·관전자는 허용, 외부인은 거부.
- 중복 로그인: 같은 계정 두 번째 로그인 후 첫 세션 요청 401 `SESSION_REPLACED`, 두 번째 세션 정상, 로그아웃 후 재로그인 정상, WebSocket 세션 닫힘(`WebSocketSessions` 단위 테스트).

프론트:
- `RulesCarousel`: 다음/이전, 끝에서 비활성, 점 클릭, ←/→ 키.
- 로비: 최대 인원 선택과 비공개 체크가 요청 body에 들어감, 게임 중인 방 섹션·관전하기·🔒 비활성, 비밀번호 모달 재시도, 1초 폴링(가짜 타이머), 겹침 방지.
- `ActiveRoomBar`: 방에 있고 다른 경로면 보임, 방 경로면 숨김.
- 결과 모달 닫음 기록 후 다시 방에 와도 안 뜸.
- `OpponentBoardModal`: 판 클릭 시 열림, 예상 점수 표시.
- `Hud`: 안내 영역 고정 높이 클래스, 모바일 짧은 문구.
- `TableRail`: 버리기·예상 점수가 내 판 옆 칸에 있음, 상대 줄 가운데 정렬 클래스.
- 관전자 화면: 내 판 없이 "관전 중이에요", 행동 버튼 비활성.
- 401 `SESSION_REPLACED` → 로그인 화면 안내.

최종 확인: `./start.sh` + Playwright로 PC 1280×800·모바일 390×844, 세 번째 계정으로 관전, 같은 계정 두 컨텍스트 로그인으로 기존 탭 로그아웃 확인, Docker 이미지 확인.
