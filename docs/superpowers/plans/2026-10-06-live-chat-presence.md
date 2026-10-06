# 게임 중 채팅 노출·닉네임 메뉴·기권 알림·자동 기권 등 6건 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자 요청 6건(게임 중 채팅 늘 노출, 닉네임 메뉴로 설정 옮기기, 기권 알림, 채팅 관전 표시 순서, 로비의 내 방 "돌아가기", 연결 1분 끊김 자동 기권)을 구현한다.

**Architecture:** 백엔드는 게임 중 방의 오래 끊긴 참가자를 주기적으로 기존 `leave`로 내보내는 메서드와 주기 실행기를 더한다. 프론트는 게임 화면에 채팅 칸(PC)·채팅 줄(그 밖)을 붙이고, 헤더 닉네임을 펼침 메뉴로 바꾸며, 방 갱신에서 빠진 참가자를 감지해 알림과 진행 기록을 남긴다.

**Tech Stack:** Java 21, Spring Boot 3.5, JUnit 5/AssertJ/MockMvc; React 19, TypeScript 5.9, Tailwind 4, motion 14, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-06-live-chat-presence-design.md`

## Global Constraints

- 화면에 이모지 금지. 아이콘은 `components/icons.tsx`의 `Svg` 래퍼 인라인 SVG(`aria-hidden`). `src/noEmoji.test.ts`가 검사한다.
- 백엔드 Java는 `/Users/ichanhan/CLAUDE.md`: 메서드 들여쓰기 1단계, `else` 금지, 한 줄에 점 하나(스트림 체인은 줄바꿈), 필드 3개 이하, VO, `BusinessException(ErrorCode.X)`.
- 자동 기권 기준: 연결이 끊긴 지 **60초 이상**(기존 `RoomService.FORFEIT_GRACE`와 같은 값), 확인 주기 **5초**, 설정 속성 `app.disconnect-forfeit.enabled`(기본 true, 테스트 `application.properties`에서 false).
- 알림 문구(정확히): `{닉네임}님이 기권하고 나갔어요`, `연결이 끊겨 {닉네임}님을 기권 처리했어요`. 진행 기록 종류 `leave`.
- PC 판정은 기존 `PC_QUERY`(`(min-width: 1024px)`), 눕힌 휴대폰 판정은 `useTableLayout() === 'landscape'`.
- PC 채팅 칸 너비 260px. 모바일 채팅 줄은 최근 메시지 3개.
- 테스트: `setMediaMatches(true|false|(query)=>boolean)`(`src/test/media.ts`), motion은 테스트에서 애니메이션 생략, 모달 안 `toBeVisible`은 `await waitFor`.
- 프론트 타입 검사는 `npm run build`. **`npx tsc -b` 금지**(src에 .js를 쏟아낸다).
- 커밋 메시지 끝 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. 자기 파일만 `git add <경로>`.
- 명령: 백엔드 `cd backend && mvn -q test -Dtest=X`, 전체 `mvn -q test`. 프론트 `cd frontend && npx vitest run <경로>`, 전체 `npx vitest run`.

## Review Focus

- 다시 연결된 참가자는 60초가 지나도 기권되면 안 된다 → Task 1 테스트.
- 게임이 끝나 대기 중이 된 방의 끊긴 사람은 기권 대상이 아니다(대기실 제외) → Task 1 테스트.
- 내가 나간 경우·관전자가 나간 경우·대기 중에 누가 나간 경우에는 기권 알림이 뜨면 안 된다 → Task 4 테스트.
- 채팅 입력 중 Enter로 보낸 뒤 입력칸이 비고, 보내기 실패(false)면 글이 남는다(기존 ChatPanel 규칙) → Task 2 채팅 줄 테스트.
- 닉네임 메뉴가 열린 채로 다른 페이지로 이동하면 닫혀야 한다 → Task 3 테스트.

---

### Task 1: 백엔드 — 게임 중 1분 넘게 끊긴 참가자 자동 기권 (#6)

**Files:**
- Modify: `backend/src/main/java/com/boardgame/room/application/RoomService.java` (`forfeitLongDisconnected` 추가)
- Create: `backend/src/main/java/com/boardgame/room/application/DisconnectForfeitScheduler.java`
- Modify: `backend/src/test/resources/application.properties` (`app.disconnect-forfeit.enabled=false`)
- Create test: `backend/src/test/java/com/boardgame/room/api/DisconnectForfeitApiTest.java`

**Interfaces:**
- Produces: `public synchronized void forfeitLongDisconnected()` on `RoomService`. 프론트는 이 결과를 방 방송(참가자 목록에서 빠짐)으로만 본다.

- [ ] **Step 1: 실패 테스트 작성** — `DisconnectForfeitApiTest`. `RoomForfeitApiTest`의 구조(시계 `MutableClock` @Primary 주입, `PresenceTracker` 주입, `startedRoom(host, guest)` 헬퍼, `@MockitoBean RoomNotifier`)를 복사한다. 연결 상태는 `presence.connected(memberId, "s-x")` / `presence.disconnected(memberId, "s-x", clock.instant())`로 만든다(실제 웹소켓 없음). 시계를 옮기는 메서드 이름은 `MutableClock`을 열어 확인한다.

```java
    @Test
    void 게임_중_60초_넘게_끊긴_참가자는_기권되어_방에서_빠진다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = startedRoom(host, guest);
        presence.connected(host.id(), "s-host");
        presence.connected(guest.id(), "s-guest");
        presence.disconnected(guest.id(), "s-guest", clock.instant());
        clock.advance(Duration.ofSeconds(60));

        roomService.forfeitLongDisconnected();

        mockMvc.perform(get("/api/rooms/{code}", code).session(host.session()))
                .andExpect(jsonPath("$.status").value("WAITING"))
                .andExpect(jsonPath("$.members.length()").value(1));
        assertThat(events.stream(GameCompletedEvent.class)).hasSize(1);
        leave(host, code);
    }

    @Test
    void 59초면_그대로다() throws Exception {
        // 위와 같되 clock.advance(Duration.ofSeconds(59)) → status PLAYING, members 2
    }

    @Test
    void 다시_연결되면_그대로다() throws Exception {
        // 끊김 후 presence.connected(guest.id(), "s-guest2") 하고 60초 진행 → PLAYING, members 2
    }

    @Test
    void 대기_중인_방의_끊긴_사람은_그대로다() throws Exception {
        // 방을 열고 guest join만(시작 안 함), guest 끊김 후 60초 → members 2
    }

    @Test
    void 관전자는_대상이_아니다() throws Exception {
        // 2인 게임 시작 후 third가 watch, third 연결 끊김 60초 → spectators.length() 1, status PLAYING
    }
```
주석으로 적은 네 테스트는 첫 테스트와 같은 모양으로 완성한다(검증할 값은 주석에 적힌 그대로). `startedRoom`이 게임 시작 때 `presence.baseline`을 부르므로, 각 테스트 시작에서 참가자들을 `presence.connected`로 연결해 두어야 의도한 사람만 끊긴 상태가 된다. `events`는 `@RecordApplicationEvents` + `ApplicationEvents`(RoomForfeitApiTest 참고), `GameCompletedEvent` import 경로도 거기서 확인한다. `roomService`는 `@Autowired RoomService`.

`application.properties`(test)에 추가:
```
# 테스트에서는 5초마다 도는 자동 기권 확인을 끄고, 메서드를 직접 부른다.
app.disconnect-forfeit.enabled=false
```

- [ ] **Step 2: 실패 확인** — `cd backend && mvn -q test -Dtest=DisconnectForfeitApiTest` → 컴파일 실패(`forfeitLongDisconnected` 없음).

- [ ] **Step 3: 구현**

`RoomService`(`forfeitDisconnected` 아래):
```java
    /** 게임 중인 방에서 연결이 끊긴 지 FORFEIT_GRACE 이상인 참가자를 기권시켜 내보낸다. 주기적으로 불린다. */
    public synchronized void forfeitLongDisconnected() {
        Instant now = clock.instant();
        List<Departure> departures = registry.all()
                .stream()
                .filter(room -> room.status() == RoomStatus.PLAYING)
                .flatMap(room -> longDisconnected(room, now))
                .toList();
        departures.forEach(departure -> leave(departure.code(), departure.memberId()));
    }

    private Stream<Departure> longDisconnected(Room room, Instant now) {
        return room.memberIds()
                .stream()
                .filter(room::isPlaying)
                .filter(memberId -> presence.isOfflineAtLeast(memberId, now, FORFEIT_GRACE))
                .map(memberId -> new Departure(room.codeValue(), memberId));
    }

    private record Departure(String code, long memberId) {
    }
```
목록을 먼저 모은 뒤 나가게 하는 이유: `leave`가 레지스트리를 바꾸므로 순회 중 변경을 피한다. 한 방에서 두 명이 빠질 때 첫 `leave`로 게임이 끝나면 두 번째 `leave`는 대기 중 방에서의 나가기가 되어 그대로 안전하다(기존 `leave`가 처리). `Instant`, `Stream`, `RoomStatus` import 확인.

`DisconnectForfeitScheduler.java`:
```java
package com.boardgame.room.application;

import java.time.Duration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.stereotype.Component;

/** 게임 중 오래 끊긴 참가자를 5초마다 확인해 자동 기권시킨다. 테스트에서는 속성으로 끈다. */
@Component
@ConditionalOnProperty(name = "app.disconnect-forfeit.enabled", havingValue = "true", matchIfMissing = true)
public class DisconnectForfeitScheduler {

    private static final Duration INTERVAL = Duration.ofSeconds(5);

    private final ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();

    public DisconnectForfeitScheduler(RoomService roomService) {
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("disconnect-forfeit-");
        scheduler.initialize();
        scheduler.scheduleWithFixedDelay(() -> sweep(roomService), INTERVAL);
    }

    private static void sweep(RoomService roomService) {
        try {
            roomService.forfeitLongDisconnected();
        } catch (RuntimeException e) {
            // 한 번 실패해도 다음 주기에 다시 확인한다.
        }
    }
}
```
빈 종료 시 스레드를 정리하도록 `@PreDestroy public void stop() { scheduler.shutdown(); }`를 추가한다(필드는 1개라 규칙 안). 예외는 삼키지 말고 SLF4J `warn`으로 남긴다(`LogoutRoomListener`와 같은 방식).

- [ ] **Step 4: 통과 확인** — `mvn -q test -Dtest=DisconnectForfeitApiTest,RoomForfeitApiTest` PASS, 이어서 `mvn -q test` 전체 PASS.

- [ ] **Step 5: 커밋**
```bash
git add backend/src/main/java/com/boardgame/room/application/RoomService.java backend/src/main/java/com/boardgame/room/application/DisconnectForfeitScheduler.java backend/src/test/resources/application.properties backend/src/test/java/com/boardgame/room/api/DisconnectForfeitApiTest.java
git commit -m "feat: 게임 중 1분 넘게 연결이 끊긴 참가자를 자동으로 기권 처리

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 프론트 — 게임 중 채팅 늘 보이기 + 관전 표시 순서 (#1, #4)

**Files:**
- Modify: `frontend/src/room/ChatPanel.tsx` (머리줄 순서·높이, #4)
- Create: `frontend/src/room/ChatStrip.tsx`, `frontend/src/room/ChatStrip.test.tsx`
- Create: `frontend/src/room/GameChat.tsx` (배치별로 채팅 칸/채팅 줄을 고르는 래퍼)
- Modify: `frontend/src/room/ChatLauncher.tsx` (버튼 없이 시트만 열 수 있게: `open`/`onOpenChange`를 밖에서 제어하는 prop 추가, 또는 시트 부분을 `ChatSheet`로 분리)
- Modify: `frontend/src/pages/RoomPage.tsx` (게임 중 배치에 채팅 넣기, 떠 있는 `ChatLauncher` 버튼 제거)
- Modify: `frontend/src/games/papersafari/PaperSafariTable.tsx` (눕힌 화면 왼쪽 칸 아래에 채팅 줄을 넣을 자리 — prop `asideFooter?: ReactNode`)
- Test: `frontend/src/room/ChatPanel.test.tsx`, `frontend/src/room/ChatLauncher.test.tsx`, `frontend/src/pages/RoomPage.test.tsx`

**Interfaces:**
- Consumes: `useRoomChat`이 주는 `{ messages, send, unread, markRead }`(RoomPage에 이미 있음), `ChatMessage`(`api/chat.ts`: `id, memberId, nickname, text, sentAt, spectator`).
- Produces: `ChatStrip` props `{ messages: ChatMessage[]; meId: number; onSend: (text: string) => boolean; onExpand: () => void }`.

- [ ] **Step 1: 실패 테스트**

`ChatPanel.test.tsx`에 추가(기존 픽스처로 관전자 메시지 하나):
```tsx
  it('관전자 메시지 머리줄은 닉네임 다음에 관전 배지가 오고, 둘의 줄 높이가 같다', () => {
    // 관전자(spectator: true, nickname '캐롤') 메시지 렌더
    const badge = screen.getByTestId('spectator-badge');
    const header = badge.parentElement as HTMLElement;
    expect(header.firstElementChild).toHaveTextContent('캐롤');
    expect(header.lastElementChild).toBe(badge);
    expect(header).toHaveClass('h-[18px]', 'items-center');
    expect(badge).toHaveClass('h-[18px]');
  });
```

`ChatStrip.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../api/chat';
import { ChatStrip } from './ChatStrip';

const at = '2026-10-06T05:00:00Z';
const msg = (id: number, memberId: number, nickname: string, text: string, spectator = false): ChatMessage =>
  ({ id, memberId, nickname, text, sentAt: at, spectator });

describe('ChatStrip', () => {
  it('최근 3개만 한 줄씩 보여 주고, 내 메시지는 "나", 관전자는 닉네임 뒤 배지', () => {
    const messages = [msg(1, 2, '밥', '하나'), msg(2, 2, '밥', '둘'), msg(3, 3, '캐롤', '셋', true), msg(4, 1, '앨리스', '넷')];
    render(<ChatStrip messages={messages} meId={1} onSend={() => true} onExpand={vi.fn()} />);
    const lines = screen.getAllByTestId('chat-strip-line');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toHaveTextContent('둘');
    expect(lines[1].querySelector('[data-testid="spectator-badge"]')).not.toBeNull();
    expect(lines[2]).toHaveTextContent('나');
    lines.forEach((line) => expect(line).toHaveClass('truncate'));
  });

  it('메시지가 없으면 안내 한 줄', () => {
    render(<ChatStrip messages={[]} meId={1} onSend={() => true} onExpand={vi.fn()} />);
    expect(screen.getByText('아직 대화가 없어요.')).toBeInTheDocument();
  });

  it('입력하고 Enter로 보내면 입력칸이 비고, 보내기 실패면 글이 남는다', async () => {
    const onSend = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);
    render(<ChatStrip messages={[]} meId={1} onSend={onSend} onExpand={vi.fn()} />);
    const input = screen.getByRole('textbox', { name: '메시지' });
    await userEvent.type(input, '안녕{Enter}');
    expect(onSend).toHaveBeenCalledWith('안녕');
    expect(input).toHaveValue('');
    await userEvent.type(input, '다시{Enter}');
    expect(input).toHaveValue('다시');
  });

  it('메시지 줄을 누르면 전체 채팅을 연다', async () => {
    const onExpand = vi.fn();
    render(<ChatStrip messages={[msg(1, 2, '밥', '하나')]} meId={1} onSend={() => true} onExpand={onExpand} />);
    await userEvent.click(screen.getByRole('button', { name: '채팅 전체 보기' }));
    expect(onExpand).toHaveBeenCalled();
  });
});
```
(입력칸 접근 이름·보내기 버튼 이름은 기존 `ChatPanel`의 것과 같게 맞춘다 — ChatPanel을 열어 `aria-label`/placeholder를 확인하고 테스트의 `name`을 그에 맞춘다.)

`RoomPage.test.tsx`에 추가(기존 게임 중 픽스처 사용):
```tsx
  it('PC 게임 화면에는 오른쪽 채팅 칸이 늘 보이고 떠 있는 채팅 버튼은 없다', async () => {
    setMediaMatches(true);
    // 게임 중 방 렌더
    expect(screen.getByTestId('game-chat-panel')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /채팅 열기/ })).not.toBeInTheDocument();
  });

  it('모바일 게임 화면에는 테이블 아래 채팅 줄이 있다', async () => {
    setMediaMatches(false);
    // 게임 중 방 렌더
    expect(screen.getByTestId('chat-strip')).toBeInTheDocument();
    expect(screen.queryByTestId('game-chat-panel')).not.toBeInTheDocument();
  });

  it('휴대폰을 눕히면 채팅 줄이 왼쪽 정보 칸 안에 있다', async () => {
    setMediaMatches((query) => query.includes('orientation: landscape'));
    // 게임 중 방 렌더
    expect(within(screen.getByTestId('table-aside')).getByTestId('chat-strip')).toBeInTheDocument();
  });
```
(떠 있는 채팅 버튼의 실제 접근 이름은 `ChatLauncher.tsx`에서 확인해 맞춘다. 주석 부분은 기존 픽스처로 완성.)

- [ ] **Step 2: 실패 확인**.

- [ ] **Step 3: 구현**
  - `ChatPanel.tsx` 머리줄: `<span className="flex h-[18px] items-center gap-1 px-1"><span className={...닉네임 색 그대로}>{message.nickname}</span>{message.spectator ? <SpectatorBadge /> : null}</span>`. 배지는 `inline-flex h-[18px] items-center gap-0.5 rounded-full ... px-1.5 text-[10px] leading-none`(기존 색 유지, `py-px` 제거). 배지를 `export function SpectatorBadge()`로 빼서 ChatStrip이 같이 쓴다(`data-testid="spectator-badge"` 유지).
  - `ChatStrip.tsx`: 종이 카드(`paper p-2.5`, `data-testid="chat-strip"`). 위: `<button type="button" aria-label="채팅 전체 보기" onClick={onExpand} className="block w-full text-left">` 안에 최근 3개를 `<p data-testid="chat-strip-line" className="truncate text-xs">` — `<b>{mine ? '나' : nickname}</b>` + (관전자면 배지) + ` ` + text. 비었으면 `<p className="text-xs text-stone-500">아직 대화가 없어요.</p>`. 아래: 입력 폼(ChatPanel 입력부와 같은 규칙: 앞뒤 공백 제거 후 비면 안 보냄, `onSend`가 true면 비움, 최대 길이 ChatPanel과 같게). 입력부 로직이 ChatPanel과 겹치면 작은 공용 컴포넌트 `ChatInput`(`room/ChatInput.tsx`)으로 빼서 둘 다 쓴다.
  - `ChatLauncher.tsx`: 바깥에서 여닫기를 제어할 수 있게 `open?: boolean; onOpenChange?: (open: boolean) => void; hideButton?: boolean` prop을 추가하거나, 시트 부분을 `ChatSheet`로 분리한다(둘 중 기존 테스트를 덜 깨는 쪽). 게임 중 모바일은 버튼 없이 시트만 쓴다. 열려 있는 동안 읽음 처리(`onOpen`) 동작은 유지.
  - `GameChat.tsx`: `useMediaQuery(PC_QUERY)`면 `<aside data-testid="game-chat-panel" className="paper flex w-[260px] shrink-0 flex-col p-3 lg:sticky lg:top-4 lg:h-[calc(100vh-8rem)]"><h2 className="mb-2 text-sm font-bold">채팅</h2><ChatPanel ... className="min-h-0 flex-1" /></aside>`(보이는 동안 `markRead`를 메시지가 바뀔 때마다 호출). 아니면 `ChatStrip` + 시트(`onExpand`로 열기).
  - `RoomPage.tsx`: 게임 중(`showGame && view`)일 때 PC면 `<div className="flex items-start gap-4"><div className="min-w-0 flex-1">{PaperSafariTable}</div><GameChat .../></div>`, 아니면 테이블 아래에 `GameChat`(눕힌 화면이면 `PaperSafariTable`의 새 prop `asideFooter`로 넘겨 왼쪽 칸 맨 아래에). 기존 `{playing ? <ChatLauncher .../> : null}`는 지운다. 대기실은 그대로.
  - `PaperSafariTable.tsx`: `asideFooter?: ReactNode` prop을 받아 `table-aside` 안 `{turnBar}` 다음에 그린다.

- [ ] **Step 4: 통과 확인** — `npx vitest run` 전체 PASS(ChatLauncher 기존 테스트 중 게임 중 버튼을 전제한 것은 새 구조에 맞게 고친다), `npm run build`.

- [ ] **Step 5: 커밋**
```bash
git add frontend/src/room/ChatPanel.tsx frontend/src/room/ChatPanel.test.tsx frontend/src/room/ChatStrip.tsx frontend/src/room/ChatStrip.test.tsx frontend/src/room/GameChat.tsx frontend/src/room/ChatLauncher.tsx frontend/src/room/ChatLauncher.test.tsx frontend/src/pages/RoomPage.tsx frontend/src/pages/RoomPage.test.tsx frontend/src/games/papersafari/PaperSafariTable.tsx
git commit -m "feat: 게임 중 채팅을 늘 보이게(PC 오른쪽 칸, 모바일 최근 3줄)와 채팅 관전 배지 순서

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
(ChatInput을 만들었다면 함께 add.)

---

### Task 3: 프론트 — 닉네임 메뉴로 설정 옮기기 (#2)

**Files:**
- Create: `frontend/src/components/UserMenu.tsx`, `frontend/src/components/UserMenu.test.tsx`
- Create: `frontend/src/components/SoundSettings.tsx` (설정 페이지의 소리 구역을 옮김)
- Create: `frontend/src/components/useLogoutFlow.ts` (설정 페이지의 로그아웃 확인 흐름을 옮김: `askLogout`, 모달 상태, `doLogout`)
- Delete: `frontend/src/pages/SettingsPage.tsx`, `frontend/src/pages/SettingsPage.test.tsx` (그 테스트의 로그아웃·소리 시나리오는 `UserMenu.test.tsx`로 옮긴다)
- Modify: `frontend/src/components/Layout.tsx`, `frontend/src/components/Layout.test.tsx`, `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `useSound()`(`volume`, `setVolume`, `muted`, `toggleMuted`, `play`), `useAuth()`(`member`, `logout`), `roomsApi.mine()`, `LogoutConfirmModal`(기존).

- [ ] **Step 1: 실패 테스트** — `UserMenu.test.tsx`(SettingsPage.test.tsx의 목 구성(`useAuth`, `roomsApi`, `Toast`, `SoundContext.Provider`)과 로그아웃 시나리오 5개를 그대로 옮기되, 먼저 닉네임 버튼을 눌러 메뉴를 연다):

```tsx
  it('닉네임을 누르면 아이디·닉네임·소리 조절·로그아웃이 있는 메뉴가 펼쳐진다', async () => {
    render(ui());
    const trigger = screen.getByRole('button', { name: /앨리스/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const panel = screen.getByTestId('user-menu');
    expect(within(panel).getByText('alice01')).toBeInTheDocument();
    expect(within(panel).getByRole('switch', { name: '효과음' })).toBeInTheDocument();
    expect(within(panel).getByRole('slider', { name: '음량' })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: '소리 들어보기' })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: '로그아웃' })).toBeInTheDocument();
  });

  it('Esc, 바깥 클릭, 버튼 다시 누르기로 닫힌다', async () => {
    render(<>{ui()}<p>바깥</p></>);
    const trigger = screen.getByRole('button', { name: /앨리스/ });
    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument());
    await userEvent.click(trigger);
    await userEvent.click(screen.getByText('바깥'));
    await waitFor(() => expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument());
    await userEvent.click(trigger);
    await userEvent.click(trigger);
    await waitFor(() => expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument());
  });

  it('페이지를 옮기면 닫힌다', async () => {
    // MemoryRouter 안에 UserMenu와 <Link to="/records">전적</Link>를 함께 렌더, 메뉴 열고 링크 클릭 → 메뉴 없음
  });
```
로그아웃 확인 시나리오(평소/게임 중/관전자/방 조회 실패/취소 중 문구 유지)는 SettingsPage.test.tsx에서 그대로 옮긴다(메뉴를 연 뒤 로그아웃 버튼). 로그아웃 확인 창이 열리면 메뉴는 닫혀도 되고 열려 있어도 되지만, 확인 창은 메뉴와 독립적으로 유지되어야 한다(메뉴가 닫혀도 모달이 사라지지 않게 — 모달 상태는 `UserMenu` 최상위에 둔다).

`Layout.test.tsx`: 설정 탭 기대를 지우고 `expect(screen.queryByRole('link', { name: '설정' })).not.toBeInTheDocument()` + 닉네임 버튼이 있고 `truncate`(기존 닉네임 말줄임 기대를 버튼 안 텍스트로 옮김). `App`의 `/settings`가 `/`로 보내는지: `App` 라우트 테스트가 없으면 `Layout.test`가 아닌 새 작은 테스트를 만들지 말고 Step 3의 `<Navigate>` 한 줄로 충분하다(검토자가 diff로 확인).

- [ ] **Step 2: 실패 확인**.

- [ ] **Step 3: 구현**
  - `SoundSettings.tsx`: 기존 SettingsPage의 소리 구역(효과음 ToggleSwitch, 음량 range + 숫자, 비활성 규칙, 소리 들어보기)을 그대로 옮긴 컴포넌트(크기만 메뉴에 맞게 `text-sm`).
  - `useLogoutFlow.ts`: SettingsPage의 `askLogout`(roomsApi.mine → inGame, 실패 시 inGame=true), `open`/`inGame`/`pending` 상태, `doLogout`(logout → navigate('/login', replace), 실패 시 토스트)를 훅으로. 반환 `{ askLogout, modalProps }`(`modalProps`는 `LogoutConfirmModal`에 그대로 펼칠 수 있는 객체).
  - `UserMenu.tsx`: 트리거 `<button type="button" aria-expanded={open} aria-controls="user-menu" className="flex min-w-0 items-center gap-1 rounded-lg px-1.5 py-1 font-bold text-cream-50 hover:bg-black/15"><span className="truncate">{nickname}</span><ChevronDownIcon /></button>`(아래 화살표 아이콘이 없으면 icons.tsx에 `ChevronDownIcon` 추가). 펼침 패널: `motion.div id="user-menu" data-testid="user-menu"`(진행 기록 팝오버처럼 위에서 8px 내려오며, `AnimatePresence`), `paper absolute right-0 top-full z-50 mt-2 w-[260px] max-w-[calc(100vw-2rem)] p-3`. 안: 아이디(`text-xs text-stone-500`), 닉네임(`font-black`), `SoundSettings`, `<hr>`, 로그아웃 버튼(danger, w-full) → `askLogout()`. 바깥 클릭(`pointerdown` on document, 패널·트리거 밖이면 닫기), Esc(열려 있을 때만, `defaultPrevented`/열린 모달이면 무시 — ChatLauncher의 `escapeIsMine` 참고), `useLocation()`의 pathname이 바뀌면 닫기. `LogoutConfirmModal {...modalProps}`는 UserMenu 최상위에서 렌더.
  - `Layout.tsx`: 닉네임 `<span>`을 `<div className="relative min-w-0"><UserMenu /></div>`로 바꾸고 설정 NavLink와 `GearIcon` import를 지운다(GearIcon은 방 설정 버튼이 쓰므로 정의는 유지).
  - `App.tsx`: `/settings` 라우트를 `<Route path="/settings" element={<Navigate to="/" replace />} />`로 바꾸고 `SettingsPage` import 제거.

- [ ] **Step 4: 통과 확인** — `npx vitest run` 전체 PASS, `npm run build`.

- [ ] **Step 5: 커밋**
```bash
git add frontend/src/components/UserMenu.tsx frontend/src/components/UserMenu.test.tsx frontend/src/components/SoundSettings.tsx frontend/src/components/useLogoutFlow.ts frontend/src/components/Layout.tsx frontend/src/components/Layout.test.tsx frontend/src/components/icons.tsx frontend/src/App.tsx
git rm frontend/src/pages/SettingsPage.tsx frontend/src/pages/SettingsPage.test.tsx
git commit -m "feat: 오른쪽 위 닉네임을 누르면 소리 조절과 로그아웃이 있는 메뉴, 설정 페이지 없애기

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 프론트 — 기권하고 나간 사람 알림, 게임 화면 수동 내보내기 제거 (#3, #6)

**Files:**
- Create: `frontend/src/lib/departures.ts`, `frontend/src/lib/departures.test.ts`
- Modify: `frontend/src/lib/eventLog.ts` (`LogKind`에 `'leave'`)
- Modify: `frontend/src/games/papersafari/layout/LogList.tsx` (`KIND_STYLE.leave`: 나가기 아이콘 `LogoutIcon`, 배경은 다른 종류와 구분되는 옅은 빨강 계열)
- Modify: `frontend/src/room/useRoomChannel.ts` (+ `room/useRoomChannel.test.tsx`)
- Modify: `frontend/src/pages/RoomPage.tsx` (`useRoomChannel(code, { poll, meId })`)
- Modify: `frontend/src/games/papersafari/PaperSafariTable.tsx`, `frontend/src/games/papersafari/PlayerBoard.tsx` (+ 관련 테스트) — 게임 화면의 연결 끊김 내보내기 버튼 제거

**Interfaces:**
- Produces: `departureNotices(prev: Room, next: Room, meId: number): string[]`.

- [ ] **Step 1: 실패 테스트** — `departures.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Room, RoomMember } from '../api/types';
import { departureNotices } from './departures';

const member = (id: number, nickname: string, connected = true): RoomMember =>
  ({ id, nickname, host: id === 1, connected, offlineSeconds: connected ? 0 : 70, ready: false });
const room = (status: Room['status'], members: RoomMember[]): Room => ({
  code: 'ABC234', name: '방', gameType: 'PAPER_SAFARI', gameTypeName: '페이퍼 사파리', status, hostId: 1, maxPlayers: 4,
  locked: false, theme: 'WOOD', spectators: [], members,
});

describe('departureNotices', () => {
  it('게임 중에 다른 참가자가 빠지면 "기권하고 나갔어요"', () => {
    const prev = room('PLAYING', [member(1, '앨리스'), member(2, '밥'), member(3, '캐롤')]);
    const next = room('PLAYING', [member(1, '앨리스'), member(3, '캐롤')]);
    expect(departureNotices(prev, next, 1)).toEqual(['밥님이 기권하고 나갔어요']);
  });

  it('연결이 끊겨 있던 사람이 빠지면 자동 기권 문구', () => {
    const prev = room('PLAYING', [member(1, '앨리스'), member(2, '밥', false)]);
    const next = room('WAITING', [member(1, '앨리스')]);
    expect(departureNotices(prev, next, 1)).toEqual(['연결이 끊겨 밥님을 기권 처리했어요']);
  });

  it('내가 빠진 경우, 대기 중이던 방, 변화 없음은 알리지 않는다', () => {
    const playing = room('PLAYING', [member(1, '앨리스'), member(2, '밥')]);
    expect(departureNotices(playing, room('WAITING', [member(2, '밥')]), 1)).toEqual([]);
    expect(departureNotices(room('WAITING', [member(1, '앨리스'), member(2, '밥')]), room('WAITING', [member(1, '앨리스')]), 1)).toEqual([]);
    expect(departureNotices(playing, playing, 1)).toEqual([]);
  });

  it('여러 명이 빠지면 사람마다 한 줄', () => {
    const prev = room('PLAYING', [member(1, '앨리스'), member(2, '밥'), member(3, '캐롤', false)]);
    const next = room('WAITING', [member(1, '앨리스')]);
    expect(departureNotices(prev, next, 1)).toEqual(['밥님이 기권하고 나갔어요', '연결이 끊겨 캐롤님을 기권 처리했어요']);
  });
});
```
(관전자는 `members`가 아니라 `spectators`라 이 함수에 영향이 없다 — 관전자 이탈을 넣은 테스트 한 줄도 추가: spectators만 바뀐 경우 `[]`.)

`useRoomChannel.test.tsx`에 추가(기존 방 방송 흉내 헬퍼 사용): 게임 중 방 → 한 명 빠진 방 방송 → `toast.show`가 `('밥님이 기권하고 나갔어요', 'info')`로 불리고, 반환 `log[0]`이 `{ kind: 'leave', text: '밥님이 기권하고 나갔어요', actorId: 2 }`를 포함. 내가 빠진 경우에는 이 알림이 없다.

`PlayerBoard.test.tsx`·`PaperSafariTable.test.tsx`: 게임 화면에서 연결 끊긴 지 60초 넘은 상대가 있어도 `내보내기`/`님 내보내기` 버튼이 없다는 테스트로 기존 기권 버튼 테스트(PC 글자 버튼, 모바일 X 배지)를 바꾼다.

- [ ] **Step 2: 실패 확인**.

- [ ] **Step 3: 구현**
  - `departures.ts`:
    ```ts
    import type { Room } from '../api/types';

    /** 게임 중이던 방에서 나를 뺀 참가자가 빠졌으면, 사람마다 알림 문구를 만든다(끊겨 있던 사람은 자동 기권 문구). */
    export function departureNotices(prev: Room, next: Room, meId: number): string[] {
      if (prev.status !== 'PLAYING') {
        return [];
      }
      const remaining = new Set(next.members.map((member) => member.id));
      return prev.members
        .filter((member) => member.id !== meId && !remaining.has(member.id))
        .map((member) => (member.connected ? `${member.nickname}님이 기권하고 나갔어요` : `연결이 끊겨 ${member.nickname}님을 기권 처리했어요`));
    }
    ```
    진행 기록에 `actorId`를 넣어야 하므로 실제로는 `{ id, text }` 쌍을 돌려주는 `departures(prev, next, meId): { memberId: number; text: string }[]`로 만들고 테스트는 `.map((d) => d.text)`로 비교해도 된다(둘 중 하나로 정하고 테스트를 맞춘다).
  - `useRoomChannel.ts`: 옵션에 `meId?: number`. `acceptRoom`에서 `const prev = roomRef.current;` 를 먼저 잡고, `prev`가 있고 같은 방이면 `departures(prev, next, meId)`마다 `toast.show(text, 'info')`와 진행 기록 한 줄(`{ kind: 'leave', actorId: memberId, text }`, 기존 `setLog` 추가 방식과 같게 id/at 부여). 로그 추가 코드는 `acceptView`와 공용 헬퍼(`appendLog(lines)`)로 묶는다. `meId`가 없으면(0) 알림을 만들지 않는다.
  - `eventLog.ts`: `LogKind`에 `'leave'`. `LogList.tsx` `KIND_STYLE`에 `leave: { Icon: LogoutIcon, bg: 'bg-red-100' }`(기존 항목의 모양을 따른다).
  - `RoomPage.tsx`: `useRoomChannel(code, { poll: spectating, meId })`.
  - `PaperSafariTable.tsx`: `presenceOf`에서 `onForfeit`을 더 이상 만들지 않는다(필드 제거). `PlayerBoard.tsx`의 `onForfeit` prop, 기권 글자 버튼과 `KickBadge` 분기를 지운다(KickBadge는 대기실이 계속 쓴다). `Props.onForfeit`(PaperSafariTable)과 RoomPage의 전달도 지운다. 쓰이지 않게 된 `canForfeit` import 정리(대기실 MemberList는 계속 쓴다).

- [ ] **Step 4: 통과 확인** — `npx vitest run` 전체 PASS, `npm run build`.

- [ ] **Step 5: 커밋**
```bash
git add frontend/src/lib/departures.ts frontend/src/lib/departures.test.ts frontend/src/lib/eventLog.ts frontend/src/games/papersafari/layout/LogList.tsx frontend/src/room/useRoomChannel.ts frontend/src/room/useRoomChannel.test.tsx frontend/src/pages/RoomPage.tsx frontend/src/games/papersafari/PaperSafariTable.tsx frontend/src/games/papersafari/PaperSafariTable.test.tsx frontend/src/games/papersafari/PlayerBoard.tsx frontend/src/games/papersafari/PlayerBoard.test.tsx
git commit -m "feat: 게임 중 누가 기권하고 나가면 알림과 진행 기록, 게임 화면의 수동 내보내기 없애기

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 프론트 — 로비 방 목록에서 내 방은 "돌아가기" (#5)

**Files:**
- Modify: `frontend/src/pages/GameLobbyPage.tsx`, `frontend/src/pages/GameLobbyPage.test.tsx`

- [ ] **Step 1: 실패 테스트** — `GameLobbyPage.test.tsx`(기존 `roomsApi` 목에 `mine` 추가):
```tsx
  it('게임 중인 방 목록에서 내가 들어가 있는 방은 관전하기 대신 돌아가기다', async () => {
    rooms.list.mockResolvedValue([playingSummary('ABC234')]); // 기존 픽스처 모양으로
    rooms.mine.mockResolvedValue({ ...roomFixture, code: 'ABC234', status: 'PLAYING' });
    renderLobby();
    const back = await screen.findByRole('button', { name: '돌아가기' });
    expect(screen.queryByRole('button', { name: '관전하기' })).not.toBeInTheDocument();
    expect(back.closest('li')).toHaveTextContent('참여 중');
    await userEvent.click(back);
    // 라우터에 /rooms/ABC234가 렌더됐는지(테스트 라우트에 <Route path="/rooms/:code" element={<p>방 화면</p>} />)
    expect(await screen.findByText('방 화면')).toBeInTheDocument();
    expect(rooms.watch).not.toHaveBeenCalled();
  });

  it('대기 중인 방 목록에서도 내 방은 참가 대신 돌아가기다', async () => {
    // waiting 요약 + mine이 그 방 → '돌아가기', '참가' 없음
  });

  it('내 방이 없으면 지금처럼 참가·관전하기다', async () => {
    // mine → null → '참가'/'관전하기' 그대로
  });
```
주석 부분은 기존 픽스처로 완성한다.

- [ ] **Step 2: 실패 확인**.

- [ ] **Step 3: 구현** — `GameLobbyPage.tsx`: `const [myCode, setMyCode] = useState<string | null>(null);` `loadRooms`에서 목록과 함께 `roomsApi.mine().then((mine) => setMyCode(mine?.code ?? null)).catch(() => undefined)`(목록 실패와 독립). 두 목록의 카드 버튼 부분을 작은 함수로: 그 방이 `myCode`면 `<span className="... text-xs font-bold text-green-700">참여 중</span>` + `<Button onClick={() => navigate(\`/rooms/${room.code}\`)}>돌아가기</Button>`, 아니면 기존 버튼(참가/가득 참, 관전하기/비공개). `useNavigate`가 이미 있으면 재사용.

- [ ] **Step 4: 통과 확인** — `npx vitest run` 전체 PASS, `npm run build`.

- [ ] **Step 5: 커밋**
```bash
git add frontend/src/pages/GameLobbyPage.tsx frontend/src/pages/GameLobbyPage.test.tsx
git commit -m "fix: 방 목록에서 내가 들어가 있는 방은 관전하기·참가 대신 돌아가기

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## 순서

- 모두 순차 실행. 파일이 겹치는 곳: Task 2와 Task 4(`RoomPage.tsx`, `PaperSafariTable.tsx`) — Task 2 먼저.
- 권장 순서: 1 → 2 → 3 → 4 → 5.
