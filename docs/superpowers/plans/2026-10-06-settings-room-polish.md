# 설정 페이지·방 설정 변경·로그아웃 기권 등 10건 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자 요청 10건(준비 버튼 애니메이션, 태블릿 PC 배치, 게임 중 칩 삭제, 설정 페이지·음량, 로그아웃 확인·기권, 방 설정 변경, 엿본 카드 표시, 모바일 내보내기 X)을 구현한다.

**Architecture:** 백엔드는 방 도메인에 `reconfigure`(방장·대기 중·인원 하한)를 더하고 `PATCH /api/rooms/{code}/settings`로 노출한다. 로그아웃은 Spring Security 로그아웃 처리기가 `MemberLoggedOutEvent`를 내고, 방 쪽 리스너가 그 회원을 방에서 나가게 한다(게임 중이면 기권). 프론트는 설정 페이지(`/settings`)로 소리·로그아웃을 옮기고, 나머지는 기존 컴포넌트를 고친다.

**Tech Stack:** Java 21, Spring Boot 3.5, JUnit 5/AssertJ/MockMvc; React 19, TypeScript 5.9, Tailwind 4, motion 14, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-06-settings-room-polish-design.md`

## Global Constraints

- 화면에 이모지 금지. 아이콘은 인라인 SVG(`components/icons.tsx`의 `Svg` 래퍼, `aria-hidden`). `src/noEmoji.test.ts`가 검사한다.
- 백엔드 Java는 `/Users/ichanhan/CLAUDE.md`: 메서드 들여쓰기 1단계, `else` 금지, 한 줄에 점 하나(스트림·빌더 체인은 줄바꿈), 필드 3개 이하, 원시값 VO, 오류는 `BusinessException(ErrorCode.X)` → `{status, code, message}`.
- 새 오류 코드: `CAPACITY_BELOW_PLAYERS(HttpStatus.CONFLICT, "지금 있는 인원보다 적게 줄일 수 없어요.")`.
- 음량 저장 키 `bg.volume`, 정수 0~100, 기본 70. 저장소 접근은 try/catch.
- 표 배치 쿼리: 눕힌 휴대폰 `(orientation: landscape) and (max-height: 540px)`, PC 테이블 `(min-width: 768px) and (min-height: 541px)`.
- 모바일 내보내기 X 기준은 기존 `PC_QUERY`(`(min-width: 1024px)`)가 아닐 때.
- 테스트 환경: `setMediaMatches(true|false|(query)=>boolean)`(`src/test/media.ts`), motion은 테스트에서 `MotionGlobalConfig.skipAnimations = true`. 모달 안 `toBeVisible`은 `await waitFor`.
- 프론트 타입 검사는 `npm run build`(= `tsc --noEmit && vite build`)로 한다. **`npx tsc -b`를 쓰지 말 것**(src에 .js 파일을 쏟아낸다).
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. 커밋은 자기 파일만 `git add <경로>`로.
- 명령: 백엔드 `cd backend && mvn -q test -Dtest=클래스명`, 전체 `mvn -q test`. 프론트 `cd frontend && npx vitest run <경로>`, 전체 `npx vitest run`.

## Review Focus

- 눕힌 휴대폰(844×390)이 PC 쿼리에 걸려 PC 배치가 되면 안 된다 → Task 3의 `useTableLayout` 테스트(가로 폭이 768 이상이어도 높이 540 이하이면 landscape).
- 방장이 아닌 사람·게임 중·참가자 수보다 적은 인원으로 설정 변경 요청 → Task 1의 도메인·API 테스트가 각 오류 코드를 고정한다.
- 관전자로 게임을 보던 사람이 로그아웃 → 방에서 관전만 끝나고 게임은 계속 → Task 2 테스트.
- 음량 저장값이 깨졌거나("abc", 150, -3) 저장소가 막힘 → Task 4의 `readVolume` 테스트(기본 70, 0~100으로 자름).
- 방 설정 창에서 지금 인원보다 적은 칸을 키보드 화살표로 고를 수 있으면 안 된다 → Task 5의 SeatPicker 테스트.

---

### Task 1: 백엔드 — 방 설정 변경 API (#8)

**Files:**
- Modify: `backend/src/main/java/com/boardgame/common/error/ErrorCode.java` (CAPACITY_BELOW_PLAYERS 추가, ROOM 오류 묶음 끝 `INVALID_ROOM_PASSWORD` 근처)
- Modify: `backend/src/main/java/com/boardgame/room/domain/Capacity.java`
- Modify: `backend/src/main/java/com/boardgame/room/domain/RoomSettings.java`
- Modify: `backend/src/main/java/com/boardgame/room/domain/RoomProfile.java`
- Modify: `backend/src/main/java/com/boardgame/room/domain/Room.java`
- Create: `backend/src/main/java/com/boardgame/room/api/UpdateRoomSettingsRequest.java`
- Modify: `backend/src/main/java/com/boardgame/room/application/RoomService.java`
- Modify: `backend/src/main/java/com/boardgame/room/api/RoomController.java`
- Test: `backend/src/test/java/com/boardgame/room/domain/RoomTest.java`, `backend/src/test/java/com/boardgame/room/domain/CapacityTest.java`
- Create test: `backend/src/test/java/com/boardgame/room/api/RoomSettingsApiTest.java`

**Interfaces:**
- Produces: `PATCH /api/rooms/{code}/settings` body `{"maxPlayers": number, "theme": "WOOD|SUNSET|MOONLIT|AURORA|BEACH"}` → 200 RoomResponse(JSON의 `maxPlayers`, `theme` 반영). Task 5가 쓴다.

- [ ] **Step 1: 도메인 실패 테스트 작성** — `RoomTest`에 추가(기존 헬퍼 `openRoom()`, `start(room, 1L)`, `alice/bob/carol`, `FakeRoomPasswordHasher` 사용):

```java
    @Test
    void 방장은_대기_중에_최대_인원과_테마를_바꿀_수_있다() {
        Room room = openRoom();
        room.join(bob, null, new FakeRoomPasswordHasher());

        room.reconfigure(1L, Capacity.of(GameType.PAPER_SAFARI, 3), RoomTheme.BEACH);

        assertThat(room.maxPlayers()).isEqualTo(3);
        assertThat(room.theme()).isEqualTo(RoomTheme.BEACH);
        assertThat(room.memberIds()).containsExactly(1L, 2L);
    }

    @Test
    void 방장이_아니면_설정을_바꿀_수_없다() {
        Room room = openRoom();
        room.join(bob, null, new FakeRoomPasswordHasher());

        assertError(() -> room.reconfigure(2L, Capacity.of(GameType.PAPER_SAFARI, 3), RoomTheme.WOOD), ErrorCode.NOT_ROOM_HOST);
    }

    @Test
    void 게임_중에는_설정을_바꿀_수_없다() {
        Room room = openRoom();
        room.join(bob, null, new FakeRoomPasswordHasher());
        start(room, 1L);

        assertError(() -> room.reconfigure(1L, Capacity.of(GameType.PAPER_SAFARI, 4), RoomTheme.WOOD), ErrorCode.ROOM_ALREADY_PLAYING);
    }

    @Test
    void 지금_참가자보다_적게는_줄일_수_없다() {
        Room room = openRoom();
        room.join(bob, null, new FakeRoomPasswordHasher());
        room.join(carol, null, new FakeRoomPasswordHasher());

        assertError(() -> room.reconfigure(1L, Capacity.of(GameType.PAPER_SAFARI, 2), RoomTheme.WOOD), ErrorCode.CAPACITY_BELOW_PLAYERS);
        room.reconfigure(1L, Capacity.of(GameType.PAPER_SAFARI, 3), RoomTheme.WOOD);
        assertThat(room.maxPlayers()).isEqualTo(3);
    }
```

`assertError`의 실제 시그니처는 `com.boardgame.common.error.ErrorAssertions`를 열어 확인하고 맞춰 쓴다(이미 `RoomTest`에서 import되어 있다). `room.maxPlayers()`, `room.theme()`, `room.memberIds()`는 `Room`에 이미 있는 공개 메서드다(없으면 `grep -n "public" Room.java`로 실제 이름 확인). 인원을 늘리면 기다리던 관전자가 앉는 동작은 게임이 끝난 뒤 관전자가 남는 상황을 만들기 어려우므로, `RoomOccupants.seatWaitingSpectators`를 그대로 호출하는 것으로 충분하다(기존 테스트가 그 메서드를 검증한다).

`CapacityTest`에 추가:

```java
    @Test
    void 인원보다_작은지_안다() {
        Capacity three = Capacity.of(GameType.PAPER_SAFARI, 3);

        assertThat(three.isBelow(4)).isTrue();
        assertThat(three.isBelow(3)).isFalse();
    }
```

- [ ] **Step 2: 실패 확인** — `cd backend && mvn -q test -Dtest=RoomTest,CapacityTest` → 컴파일 실패(`reconfigure`, `isBelow`, `CAPACITY_BELOW_PLAYERS` 없음).

- [ ] **Step 3: 도메인 구현**

`ErrorCode`:
```java
    CAPACITY_BELOW_PLAYERS(HttpStatus.CONFLICT, "지금 있는 인원보다 적게 줄일 수 없어요."),
```

`Capacity`:
```java
    public boolean isBelow(int size) {
        return value < size;
    }
```

`RoomSettings`:
```java
    public RoomSettings reconfigured(Capacity newCapacity, RoomTheme newTheme) {
        return new RoomSettings(gameType, newCapacity, new RoomTraits(lock(), newTheme));
    }
```

`RoomProfile`:
```java
    public RoomProfile reconfigured(Capacity capacity, RoomTheme theme) {
        return new RoomProfile(code, name, settings.reconfigured(capacity, theme));
    }
```

`Room`: `private final RoomProfile profile;`를 `private RoomProfile profile;`로 바꾸고(필드 수는 그대로 3개) `kick` 아래에 추가:
```java
    /** 대기 중에 방장이 최대 인원과 테마를 바꾼다. 비밀번호와 이름, 준비 상태는 그대로 둔다. */
    public void reconfigure(long requesterId, Capacity capacity, RoomTheme theme) {
        requireHost(requesterId);
        requireWaiting();
        if (capacity.isBelow(occupants.playerCount())) {
            throw new BusinessException(ErrorCode.CAPACITY_BELOW_PLAYERS);
        }
        profile = profile.reconfigured(capacity, theme);
        occupants.seatWaitingSpectators(capacity);
    }
```

- [ ] **Step 4: 도메인 통과 확인** — `mvn -q test -Dtest=RoomTest,CapacityTest` → PASS.

- [ ] **Step 5: API 실패 테스트 작성** — `RoomSettingsApiTest`(구조는 `RoomThemeApiTest`를 따른다: `@SpringBootTest @AutoConfigureMockMvc`, `@MockitoBean RoomNotifier notifier`, `ApiUsers.create(mockMvc)`):

```java
package com.boardgame.room.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.room.application.RoomNotifier;
import com.boardgame.support.ApiUsers;
import com.boardgame.support.ApiUsers.User;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
class RoomSettingsApiTest {

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private RoomNotifier notifier;

    private String open(User host) throws Exception {
        String body = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"설정방\",\"gameType\":\"PAPER_SAFARI\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.code");
    }

    private ResultActions update(User user, String code, String json) throws Exception {
        return mockMvc.perform(patch("/api/rooms/{code}/settings", code).session(user.session())
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private void leave(User user, String code) throws Exception {
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(user.session()));
    }

    @Test
    void 방장이_인원과_테마를_바꾸면_방_응답과_목록에_반영된다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = open(host);

        update(host, code, "{\"maxPlayers\":3,\"theme\":\"BEACH\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.maxPlayers").value(3))
                .andExpect(jsonPath("$.theme").value("BEACH"));
        mockMvc.perform(get("/api/rooms").session(host.session()))
                .andExpect(jsonPath("$[?(@.code == '%s')].theme".formatted(code)).value("BEACH"));
        leave(host, code);
    }

    @Test
    void 방장이_아니면_403_NOT_ROOM_HOST() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = open(host);
        mockMvc.perform(post("/api/rooms/{code}/join", code).session(guest.session())).andExpect(status().isOk());

        update(guest, code, "{\"maxPlayers\":3,\"theme\":\"WOOD\"}")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_ROOM_HOST"));
        leave(guest, code);
        leave(host, code);
    }

    @Test
    void 참가자보다_적게_줄이면_409_CAPACITY_BELOW_PLAYERS() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        User third = ApiUsers.create(mockMvc);
        String code = open(host);
        mockMvc.perform(post("/api/rooms/{code}/join", code).session(guest.session())).andExpect(status().isOk());
        mockMvc.perform(post("/api/rooms/{code}/join", code).session(third.session())).andExpect(status().isOk());

        update(host, code, "{\"maxPlayers\":2,\"theme\":\"WOOD\"}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.code").value("CAPACITY_BELOW_PLAYERS"))
                .andExpect(jsonPath("$.message").value("지금 있는 인원보다 적게 줄일 수 없어요."));
        leave(third, code);
        leave(guest, code);
        leave(host, code);
    }

    @Test
    void 범위_밖_인원_모르는_테마_빠진_값은_400() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = open(host);

        update(host, code, "{\"maxPlayers\":9,\"theme\":\"WOOD\"}").andExpect(jsonPath("$.code").value("INVALID_CAPACITY"));
        update(host, code, "{\"maxPlayers\":3,\"theme\":\"BLOSSOM\"}").andExpect(jsonPath("$.code").value("INVALID_THEME"));
        update(host, code, "{\"theme\":\"WOOD\"}").andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        update(host, code, "{\"maxPlayers\":3}").andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        leave(host, code);
    }
}
```

오류 응답의 `status` 필드가 숫자인지 문자열인지는 기존 API 테스트(`grep -rn "jsonPath(\"\\$.status\")" backend/src/test`)를 보고 맞춘다.

- [ ] **Step 6: 실패 확인** — `mvn -q test -Dtest=RoomSettingsApiTest` → 405 또는 404로 실패.

- [ ] **Step 7: API 구현**

`UpdateRoomSettingsRequest.java`:
```java
package com.boardgame.room.api;

public record UpdateRoomSettingsRequest(Integer maxPlayers, String theme) {
}
```

`RoomService`(`kick` 아래):
```java
    public synchronized RoomResponse reconfigure(String rawCode, long memberId, UpdateRoomSettingsRequest request) {
        Room room = find(rawCode);
        Capacity capacity = Capacity.of(room.gameType(), requireMaxPlayers(request));
        room.reconfigure(memberId, capacity, RoomTheme.parse(requireTheme(request)));
        saveAndNotifyClosed(room);
        return broadcast(room);
    }

    private int requireMaxPlayers(UpdateRoomSettingsRequest request) {
        if (request == null || request.maxPlayers() == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        return request.maxPlayers();
    }

    private String requireTheme(UpdateRoomSettingsRequest request) {
        if (request == null || request.theme() == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        return request.theme();
    }
```
(`UpdateRoomSettingsRequest` import 추가.)

`RoomController`(`PatchMapping` import 추가):
```java
    @PatchMapping("/{code}/settings")
    public RoomResponse settings(@PathVariable String code, @AuthenticationPrincipal LoginMember member,
                                 @RequestBody UpdateRoomSettingsRequest request) {
        return roomService.reconfigure(code, member.id(), request);
    }
```

CORS/보안 설정에 PATCH가 막혀 있지 않은지 확인(`SecurityConfig`는 `/api/**` 인증만 요구한다). 프록시(`frontend/vite.config.ts`)는 메서드와 무관.

- [ ] **Step 8: 통과 확인** — `mvn -q test -Dtest=RoomSettingsApiTest,RoomTest,CapacityTest` → PASS, 이어서 `mvn -q test` 전체 PASS.

- [ ] **Step 9: 커밋**
```bash
git add backend/src/main/java/com/boardgame/common/error/ErrorCode.java backend/src/main/java/com/boardgame/room backend/src/test/java/com/boardgame/room
git commit -m "feat: 대기 중 방장이 최대 인원과 테마를 바꾸는 방 설정 API

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 백엔드 — 로그아웃하면 들어가 있던 방에서 나가기 (#6)

**Files:**
- Create: `backend/src/main/java/com/boardgame/common/security/MemberLoggedOutEvent.java`
- Create: `backend/src/main/java/com/boardgame/common/security/LogoutEventHandler.java`
- Modify: `backend/src/main/java/com/boardgame/common/security/SecurityConfig.java`
- Create: `backend/src/main/java/com/boardgame/room/application/LogoutRoomListener.java`
- Modify: `backend/src/main/java/com/boardgame/room/application/RoomService.java` (`leaveCurrentRoom` 추가)
- Create test: `backend/src/test/java/com/boardgame/room/api/RoomLogoutApiTest.java`

**Interfaces:**
- Produces: `/api/auth/logout`(POST, 204)이 끝나기 전에 그 회원이 있던 방에서 `leave`가 실행된다(게임 중 참가자면 기권, 대기 중이면 나가기, 관전자면 관전 끝). 프론트 Task 4는 로그아웃 API만 부른다.

- [ ] **Step 1: 실패 테스트 작성** — `RoomLogoutApiTest`(구조는 `RoomForfeitApiTest`의 `startedRoom` 헬퍼를 복사해 쓴다. 시계 주입은 필요 없음):

```java
package com.boardgame.room.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.room.application.RoomNotifier;
import com.boardgame.support.ApiUsers;
import com.boardgame.support.ApiUsers.User;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class RoomLogoutApiTest {

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private RoomNotifier notifier;

    private String open(User host) throws Exception {
        String body = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"로그아웃 방\", \"gameType\": \"PAPER_SAFARI\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.code");
    }

    private void join(User guest, String code) throws Exception {
        mockMvc.perform(post("/api/rooms/{code}/join", code).session(guest.session())).andExpect(status().isOk());
    }

    private void startWith(User host, User guest, String code) throws Exception {
        mockMvc.perform(post("/api/rooms/{code}/ready", code).session(guest.session())
                .contentType(MediaType.APPLICATION_JSON).content("{\"ready\": true}")).andExpect(status().isOk());
        mockMvc.perform(post("/api/rooms/{code}/start", code).session(host.session())).andExpect(status().isOk());
    }

    private void logout(User user) throws Exception {
        mockMvc.perform(post("/api/auth/logout").session(user.session())).andExpect(status().isNoContent());
    }

    @Test
    void 게임_중에_로그아웃하면_기권되어_남은_사람만_대기_중인_방에_남는다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = open(host);
        join(guest, code);
        startWith(host, guest, code);

        logout(guest);

        mockMvc.perform(get("/api/rooms/{code}", code).session(host.session()))
                .andExpect(jsonPath("$.status").value("WAITING"))
                .andExpect(jsonPath("$.members.length()").value(1));
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(host.session()));
    }

    @Test
    void 대기_중에_로그아웃하면_방에서_빠진다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = open(host);
        join(guest, code);

        logout(guest);

        mockMvc.perform(get("/api/rooms/{code}", code).session(host.session()))
                .andExpect(jsonPath("$.members.length()").value(1));
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(host.session()));
    }

    @Test
    void 방이_없어도_그대로_로그아웃된다() throws Exception {
        User user = ApiUsers.create(mockMvc);

        logout(user);

        mockMvc.perform(get("/api/members/me").session(user.session())).andExpect(status().isUnauthorized());
    }
}
```

관전 중 로그아웃(관전만 끝나고 게임은 계속)도 넣는다: 3명 방을 만들어 2명으로 시작할 수는 없으므로, 2명 게임을 시작한 뒤 세 번째 사용자가 `POST /api/rooms/{code}/watch`로 관전하고 로그아웃 → 방 `status`가 `PLAYING`, `spectators.length()`가 0. (관전 API는 `RoomSpectatorApiTest`를 참고. 공개방이어야 관전 가능.)

- [ ] **Step 2: 실패 확인** — `mvn -q test -Dtest=RoomLogoutApiTest` → 첫 두 테스트 실패(인원 2 그대로).

- [ ] **Step 3: 구현**

`MemberLoggedOutEvent.java`:
```java
package com.boardgame.common.security;

/** 로그아웃 요청이 세션을 지우기 전에 낸다. 방 쪽이 이 회원을 방에서 내보낸다. */
public record MemberLoggedOutEvent(long memberId) {
}
```

`LogoutEventHandler.java`:
```java
package com.boardgame.common.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import org.springframework.stereotype.Component;

@Component
public class LogoutEventHandler implements LogoutHandler {

    private final ApplicationEventPublisher publisher;

    public LogoutEventHandler(ApplicationEventPublisher publisher) {
        this.publisher = publisher;
    }

    @Override
    public void logout(HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
        if (authentication == null) {
            return;
        }
        if (!(authentication.getPrincipal() instanceof LoginMember member)) {
            return;
        }
        publisher.publishEvent(new MemberLoggedOutEvent(member.id()));
    }
}
```

`SecurityConfig`: 메서드 인자에 `LogoutEventHandler logoutEventHandler` 추가, `.logout(...)`에서 기존 `addLogoutHandler(... activeSessions.forget ...)` **앞에** `.addLogoutHandler(logoutEventHandler)`.

`RoomService`(`leave` 아래):
```java
    /** 로그아웃한 회원이 들어가 있던 방이 있으면 나가게 한다(게임 중이면 기권). */
    public synchronized void leaveCurrentRoom(long memberId) {
        registry.findByMember(memberId)
                .ifPresent(room -> leave(room.codeValue(), memberId));
    }
```

`LogoutRoomListener.java`:
```java
package com.boardgame.room.application;

import com.boardgame.common.security.MemberLoggedOutEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class LogoutRoomListener {

    private final RoomService roomService;

    public LogoutRoomListener(RoomService roomService) {
        this.roomService = roomService;
    }

    @EventListener
    public void on(MemberLoggedOutEvent event) {
        roomService.leaveCurrentRoom(event.memberId());
    }
}
```

`registry.findByMember`가 관전자도 찾는지 `RoomRegistry`를 열어 확인한다. 참가자만 찾으면 관전자 테스트가 실패하므로, 그때는 `RoomRegistry`에 관전자까지 찾는 메서드(예: `findByOccupant`)를 추가해 `leaveCurrentRoom`에서 쓴다.

- [ ] **Step 4: 통과 확인** — `mvn -q test -Dtest=RoomLogoutApiTest,AuthApiTest` → PASS, 이어서 `mvn -q test` 전체 PASS.

- [ ] **Step 5: 커밋**
```bash
git add backend/src/main/java/com/boardgame/common/security backend/src/main/java/com/boardgame/room/application backend/src/test/java/com/boardgame/room/api/RoomLogoutApiTest.java
git commit -m "feat: 로그아웃하면 들어가 있던 방에서 나가기(게임 중이면 기권)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 프론트 — 태블릿은 PC 배치, 게임 중 칩 삭제 (#2, #3)

**Files:**
- Modify: `frontend/src/lib/useTableLayout.ts`
- Create test: `frontend/src/lib/useTableLayout.test.ts`
- Modify: `frontend/src/games/papersafari/layout/TableRound.tsx` (compact 밀도 삭제)
- Modify: `frontend/src/games/papersafari/PaperSafariTable.tsx` (`DENSITY_OF`)
- Modify: `frontend/src/games/papersafari/PaperSafariTable.test.tsx` (태블릿 테스트 교체)
- Modify: `frontend/src/components/RoomStatusBar.tsx`, `frontend/src/pages/RoomPage.test.tsx`

**Interfaces:**
- Produces: `TableLayout = 'pc' | 'landscape' | 'portrait'`, `TABLE_PC_QUERY`, `LANDSCAPE_PHONE_QUERY`(이름 유지). `TABLET_QUERY` 삭제.

- [ ] **Step 1: 실패 테스트 작성** — `useTableLayout.test.ts`:

```ts
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { setMediaMatches } from '../test/media';
import { LANDSCAPE_PHONE_QUERY, TABLE_PC_QUERY, useTableLayout } from './useTableLayout';

describe('useTableLayout', () => {
  it('폭 768 이상이고 높이도 넉넉하면(태블릿·PC) pc', () => {
    setMediaMatches((query) => query === TABLE_PC_QUERY);
    expect(renderHook(() => useTableLayout()).result.current).toBe('pc');
  });

  it('눕힌 휴대폰은 폭이 768 이상이어도 PC 쿼리(높이 541 이상)에 걸리지 않아 landscape', () => {
    setMediaMatches((query) => query === LANDSCAPE_PHONE_QUERY);
    expect(renderHook(() => useTableLayout()).result.current).toBe('landscape');
  });

  it('그 밖(세로 휴대폰, 640~767px)은 portrait', () => {
    setMediaMatches(false);
    expect(renderHook(() => useTableLayout()).result.current).toBe('portrait');
  });

  it('PC 쿼리는 폭 768과 높이 541을 함께 본다', () => {
    expect(TABLE_PC_QUERY).toBe('(min-width: 768px) and (min-height: 541px)');
  });
});
```

`PaperSafariTable.test.tsx`의 `'세로라도 폭이 넉넉한 태블릿은 왼쪽 칸 없이 줄인 둥근 테이블을 쓴다'` 테스트를 교체:

```tsx
  it('태블릿(폭 768 이상)은 PC와 같은 큰 둥근 테이블을 쓴다', () => {
    setMediaMatches((query) => query === '(min-width: 768px) and (min-height: 541px)');
    render(<PaperSafariTable {...baseProps(build({ phase: 'DRAW', current: ME }))} aside={<div data-testid="aside-slot" />} />);
    expect(screen.queryByTestId('table-aside')).not.toBeInTheDocument();
    expect(screen.getByTestId('table-round')).toHaveAttribute('data-density', 'pc');
    expect(screen.getByTestId('turn-bar')).toHaveClass('h-10');
  });
```

`RoomPage.test.tsx`의 `'방 제목 아래에 게임·상태·인원·관전·비공개 칩을 보여준다'`에서 `게임 중` 기대를 뒤집는다(게임 중 방):

```tsx
    expect(chips).not.toHaveTextContent('게임 중');
```
(같은 테스트의 `getByText('게임 중')...svg` 줄은 지운다.) 대기 중 방의 `'대기 중'` 기대는 그대로 둔다.

- [ ] **Step 2: 실패 확인** — `cd frontend && npx vitest run src/lib/useTableLayout.test.ts src/games/papersafari/PaperSafariTable.test.tsx src/pages/RoomPage.test.tsx` → 새 테스트 실패.

- [ ] **Step 3: 구현**

`useTableLayout.ts` 전체:
```ts
import { useMediaQuery } from './useMediaQuery';

/** 휴대폰을 눕힌 화면: 높이가 낮은 가로 화면. */
export const LANDSCAPE_PHONE_QUERY = '(orientation: landscape) and (max-height: 540px)';
/** PC와 같은 큰 테이블을 쓰는 화면(태블릿 포함). 높이도 보아, 폭이 넓은 눕힌 휴대폰은 빠진다. */
export const TABLE_PC_QUERY = '(min-width: 768px) and (min-height: 541px)';

/**
 * 게임 테이블 배치.
 * pc: 큰 둥근 테이블(PC·태블릿). landscape: 휴대폰을 눕힌 화면, 왼쪽 정보 칸 + 낮은 테이블.
 * portrait: 세로 휴대폰(폭 768 미만), 가장 작은 둥근 테이블.
 */
export type TableLayout = 'pc' | 'landscape' | 'portrait';

export function useTableLayout(): TableLayout {
  const pc = useMediaQuery(TABLE_PC_QUERY);
  const landscape = useMediaQuery(LANDSCAPE_PHONE_QUERY);
  if (pc) {
    return 'pc';
  }
  return landscape ? 'landscape' : 'portrait';
}
```

`TableRound.tsx`: `TableDensity`에서 `'compact'`와 `DENSITY.compact`를 지우고 주석의 compact 설명을 지운다.
`PaperSafariTable.tsx`: `const DENSITY_OF: Record<TableLayout, TableDensity> = { pc: 'pc', landscape: 'landscape', portrait: 'mini' };`
`RoomStatusBar.tsx`: 상태 칩을 `{playing ? null : <RoomChip>대기 중</RoomChip>}`로 바꾸고 쓰이지 않게 된 `DotIcon` import, `CHIP_TONES.green`/`tone` 처리 중 안 쓰이는 것을 정리한다(다른 곳에서 안 쓰면 `tone` 인자 자체를 없앤다).

- [ ] **Step 4: 통과 확인** — 위 세 파일 + `npx vitest run` 전체 PASS, `npm run build` 성공.

- [ ] **Step 5: 커밋**
```bash
git add frontend/src/lib/useTableLayout.ts frontend/src/lib/useTableLayout.test.ts frontend/src/games/papersafari/layout/TableRound.tsx frontend/src/games/papersafari/PaperSafariTable.tsx frontend/src/games/papersafari/PaperSafariTable.test.tsx frontend/src/components/RoomStatusBar.tsx frontend/src/pages/RoomPage.test.tsx
git commit -m "feat: 태블릿은 PC와 같은 게임 테이블, 게임 중 칩 없애기

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 프론트 — 음량, 설정 페이지, 로그아웃 확인 (#4, #5, #6, #7)

**Files:**
- Modify: `frontend/src/lib/sound.tsx`, `frontend/src/lib/sound.test.tsx`
- Modify: `frontend/src/components/icons.tsx` (GearIcon)
- Create: `frontend/src/pages/SettingsPage.tsx`, `frontend/src/pages/SettingsPage.test.tsx`
- Create: `frontend/src/components/LogoutConfirmModal.tsx`
- Modify: `frontend/src/App.tsx` (경로 `/settings`)
- Modify: `frontend/src/components/Layout.tsx`, `frontend/src/components/Layout.test.tsx`

**Interfaces:**
- Consumes: Task 2(서버가 로그아웃 때 기권) — 프론트는 `useAuth().logout()`만 부른다.
- Produces: `SoundApi = { play, muted, toggleMuted, volume: number, setVolume: (value: number) => void }`, `readVolume()`, `writeVolume(value)`, `clampVolume(value)`; `GearIcon`(Task 5가 쓴다).

- [ ] **Step 1: 소리 실패 테스트** — `sound.test.tsx`에 추가:

```tsx
import { clampVolume, readVolume, writeVolume } from './sound';

  it('음량은 기본 70이고, 저장한 값을 0~100 정수로 읽는다', () => {
    expect(readVolume()).toBe(70);
    writeVolume(35);
    expect(readVolume()).toBe(35);
    window.localStorage.setItem('bg.volume', 'abc');
    expect(readVolume()).toBe(70);
    window.localStorage.setItem('bg.volume', '150');
    expect(readVolume()).toBe(100);
    window.localStorage.setItem('bg.volume', '-3');
    expect(readVolume()).toBe(0);
    expect(clampVolume(42.6)).toBe(43);
  });

  it('저장소가 막혀도 음량 기본값 70으로 동작한다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readVolume()).toBe(70);
    expect(() => writeVolume(10)).not.toThrow();
  });

  it('setVolume은 범위를 잘라 저장하고, 재생할 때 출력 음량을 volume/100으로 둔다', async () => {
    const outputs: { gain: { value: number } }[] = [];
    class FakeNode { connect = vi.fn(() => this); }
    class FakeCtx {
      state = 'running'; currentTime = 0; sampleRate = 8000; destination = new FakeNode();
      resume = vi.fn(() => Promise.resolve());
      createGain() {
        const node = Object.assign(new FakeNode(), { gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } });
        outputs.push(node);
        return node;
      }
      createOscillator() { return Object.assign(new FakeNode(), { type: 'sine', frequency: { setValueAtTime: vi.fn() }, start: vi.fn(), stop: vi.fn() }); }
      createBuffer() { return { getChannelData: () => new Float32Array(10) }; }
      createBufferSource() { return Object.assign(new FakeNode(), { buffer: null, start: vi.fn() }); }
      createBiquadFilter() { return Object.assign(new FakeNode(), { type: 'bandpass', frequency: { value: 0 } }); }
    }
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeCtx;
    let api: ReturnType<typeof useSound> | null = null;
    function Probe() {
      api = useSound();
      return <button type="button" onClick={() => api?.play('click')}>재생</button>;
    }
    render(<SoundProvider><Probe /></SoundProvider>);

    act(() => api?.setVolume(140));
    expect(api?.volume).toBe(100);
    act(() => api?.setVolume(25));
    expect(readVolume()).toBe(25);
    await userEvent.click(screen.getByRole('button', { name: '재생' }));

    // 재생마다 만든 첫 GainNode가 출력 노드다(그 뒤 tone이 만드는 노드는 소리별 envelope).
    expect(outputs[0].gain.value).toBe(0.25);
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  });

(첫 클릭이 AudioContext를 만드는 `pointerdown`과 같은 입력이므로, 재생 전에 컨텍스트가 없을 수 있다. 그러면 `await userEvent.click`을 한 번 더 하거나 재생 전에 `userEvent.keyboard('a')`로 컨텍스트를 먼저 만든다.)

- [ ] **Step 2: 소리 구현** — `sound.tsx`:
  - `export type SoundApi = { play; muted; toggleMuted; volume: number; setVolume: (value: number) => void }`, `SILENT`에 `volume: 70, setVolume: () => undefined`.
  - 추가:
    ```ts
    const VOLUME_KEY = 'bg.volume';
    const DEFAULT_VOLUME = 70;

    export function clampVolume(value: number): number {
      if (!Number.isFinite(value)) {
        return DEFAULT_VOLUME;
      }
      return Math.min(100, Math.max(0, Math.round(value)));
    }

    export function readVolume(): number {
      try {
        const raw = window.localStorage.getItem(VOLUME_KEY);
        return raw === null ? DEFAULT_VOLUME : clampVolume(Number(raw));
      } catch {
        return DEFAULT_VOLUME;
      }
    }

    export function writeVolume(value: number): void {
      try {
        window.localStorage.setItem(VOLUME_KEY, String(clampVolume(value)));
      } catch {
        // 저장할 수 없는 환경이면 이번 방문 동안만 기억한다.
      }
    }
    ```
    (`Number('')`은 0이므로 빈 문자열도 0이 된다 — 의도대로 둔다. `Number('abc')`는 NaN → 70.)
  - `tone`/`noise`가 `ctx.destination` 대신 인자 `out: AudioNode`에 연결하도록 바꾸고, `RECIPES`를 `(ctx: AudioContext, out: AudioNode) => void`로.
  - `play`: `muted || !ctx || volume === 0`이면 끝. 아니면 `const out = ctx.createGain(); out.gain.value = volume / 100; out.connect(ctx.destination); RECIPES[name](ctx, out);`(try/catch 유지).
  - `const [volume, setVolumeState] = useState(readVolume);`, `const setVolume = useCallback((value: number) => { const next = clampVolume(value); writeVolume(next); setVolumeState(next); }, []);`, `api`에 넣는다.

- [ ] **Step 3: 소리 통과 확인** — `npx vitest run src/lib/sound.test.tsx` PASS.

- [ ] **Step 4: 설정 페이지·헤더 실패 테스트** — `SettingsPage.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundContext } from '../lib/sound';
import { SettingsPage } from './SettingsPage';

const auth = vi.hoisted(() => ({ logout: vi.fn(() => Promise.resolve()) }));
const rooms = vi.hoisted(() => ({ mine: vi.fn() }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ member: { id: 1, loginId: 'alice01', nickname: '앨리스' }, logout: auth.logout }) }));
vi.mock('../api/rooms', () => ({ roomsApi: { mine: rooms.mine } }));
vi.mock('../components/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }));

const sound = { play: vi.fn(), muted: false, toggleMuted: vi.fn(), volume: 70, setVolume: vi.fn() };

function ui(overrides: Partial<typeof sound> = {}) {
  return (
    <SoundContext.Provider value={{ ...sound, ...overrides }}>
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/login" element={<p>로그인 화면</p>} />
        </Routes>
      </MemoryRouter>
    </SoundContext.Provider>
  );
}

const playingRoom = {
  code: 'ABC234', name: '방', gameType: 'PAPER_SAFARI', gameTypeName: '페이퍼 사파리', status: 'PLAYING', hostId: 1, maxPlayers: 4,
  locked: false, theme: 'WOOD', spectators: [], members: [{ id: 1, nickname: '앨리스', host: true, connected: true, offlineSeconds: 0, ready: false }],
};

describe('설정 페이지', () => {
  beforeEach(() => {
    auth.logout.mockClear();
    rooms.mine.mockReset();
    Object.values(sound).forEach((value) => typeof value === 'function' && value.mockClear());
  });

  it('효과음 토글, 음량 막대(숫자), 소리 들어보기가 있다', async () => {
    render(ui());
    await userEvent.click(screen.getByRole('switch', { name: '효과음' }));
    expect(sound.toggleMuted).toHaveBeenCalled();
    const slider = screen.getByRole('slider', { name: '음량' });
    expect(slider).toHaveValue('70');
    expect(screen.getByText('70')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '소리 들어보기' }));
    expect(sound.play).toHaveBeenCalledWith('myTurn');
  });

  it('음량 막대를 움직이면 setVolume을 부른다', () => {
    render(ui());
    fireEvent.change(screen.getByRole('slider', { name: '음량' }), { target: { value: '30' } });
    expect(sound.setVolume).toHaveBeenCalledWith(30);
  });

  it('효과음이 꺼져 있으면 음량 막대는 비활성이다', () => {
    render(ui({ muted: true }));
    expect(screen.getByRole('slider', { name: '음량' })).toBeDisabled();
  });

  it('계정 정보와 로그아웃 버튼이 있다', () => {
    render(ui());
    expect(screen.getByText('앨리스')).toBeInTheDocument();
    expect(screen.getByText('alice01')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument();
  });

  it('게임 중이 아니면 "로그아웃할까요?" 확인 뒤 로그아웃하고 로그인 화면으로 간다', async () => {
    rooms.mine.mockResolvedValue(null);
    render(ui());
    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    const dialog = await screen.findByRole('dialog', { name: '로그아웃할까요?' });
    expect(auth.logout).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: '로그아웃' }));
    await waitFor(() => expect(auth.logout).toHaveBeenCalled());
    expect(await screen.findByText('로그인 화면')).toBeInTheDocument();
  });

  it('게임에 참가 중이면 기권 안내 창을 띄우고, 계속 게임하기는 로그아웃하지 않는다', async () => {
    rooms.mine.mockResolvedValue(playingRoom);
    render(ui());
    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    const dialog = await screen.findByRole('dialog', { name: '게임 중이에요' });
    expect(dialog).toHaveTextContent('진행 중인 게임은 기권 처리되고 방에서 나가요');
    await userEvent.click(within(dialog).getByRole('button', { name: '계속 게임하기' }));
    expect(auth.logout).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: '게임 중이에요' })).getByRole('button', { name: '기권하고 로그아웃' }));
    await waitFor(() => expect(auth.logout).toHaveBeenCalled());
  });

  it('게임 중인 방의 관전자는 일반 확인 창을 본다', async () => {
    rooms.mine.mockResolvedValue({ ...playingRoom, members: [{ ...playingRoom.members[0], id: 2 }], spectators: [{ id: 1, nickname: '앨리스' }] });
    render(ui());
    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(await screen.findByRole('dialog', { name: '로그아웃할까요?' })).toBeInTheDocument();
  });
});
```

`Modal`의 접근 이름은 `title` prop이다(`components/Modal.tsx` 확인). `member.loginId` 필드 이름은 `api/types.ts`의 `Member`에서 확인한다.

`Layout.test.tsx` 수정:
  - `'좁은 화면에서도…'` 테스트의 `로그아웃` 버튼 기대 줄을 지운다.
  - `'메뉴 이름은 게임 목록이고 음소거 버튼은…'`을 `'헤더에는 소리·로그아웃 버튼이 없고 설정 탭이 있다'`로 바꾼다:
    ```tsx
    render(ui());
    expect(screen.queryByRole('button', { name: /소리/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '로그아웃' })).not.toBeInTheDocument();
    const settings = screen.getByRole('link', { name: '설정' });
    expect(settings).toHaveAttribute('href', '/settings');
    expect(settings.querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('link', { name: '게임 목록' })).toBeInTheDocument();
    ```
  - `'좁은 화면에서는 로고 그림, 아이콘 메뉴와 짧은 글자, 아이콘 로그아웃만…'`에서 로그아웃 관련 기대를 지우고 설정 탭의 짧은 글자(`설정`)와 아이콘을 확인한다.

- [ ] **Step 5: 실패 확인** — `npx vitest run src/pages/SettingsPage.test.tsx src/components/Layout.test.tsx` → 실패.

- [ ] **Step 6: 구현**

`icons.tsx`에 추가:
```tsx
export const GearIcon = ({ className }: IconProps) => (
  <Svg className={className ?? 'h-4 w-4'}><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" /></Svg>
);
```

`LogoutConfirmModal.tsx`:
```tsx
import { LogoutIcon } from './icons';
import { Modal } from './Modal';
import { Button } from './ui';

type Props = { open: boolean; inGame: boolean; pending: boolean; onCancel: () => void; onConfirm: () => void };

/** 로그아웃 확인. 게임에 참가 중이면 기권된다는 것을 알리고 버튼 문구도 바꾼다. */
export function LogoutConfirmModal({ open, inGame, pending, onCancel, onConfirm }: Props) {
  const title = inGame ? '게임 중이에요' : '로그아웃할까요?';
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <div className="flex flex-col items-center gap-4 text-center">
        <LogoutIcon className="h-11 w-11 text-wood-700" />
        <h2 className="text-lg font-bold text-wood-800">{title}</h2>
        <p className="text-sm text-stone-600">
          {inGame ? <>지금 로그아웃하면 <b className="text-red-700">진행 중인 게임은 기권 처리되고 방에서 나가요.</b> 그래도 로그아웃할까요?</> : '다음에 다시 로그인하면 이어서 즐길 수 있어요.'}
        </p>
        <div className="flex w-full gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>{inGame ? '계속 게임하기' : '취소'}</Button>
          <Button variant="danger" className="flex-1" disabled={pending} onClick={onConfirm}>{inGame ? '기권하고 로그아웃' : '로그아웃'}</Button>
        </div>
      </div>
    </Modal>
  );
}
```
(본문 문장은 테스트 문구 `진행 중인 게임은 기권 처리되고 방에서 나가요`가 이어진 텍스트로 잡히는지 확인 — `toHaveTextContent`는 요소 전체 텍스트를 보므로 `<b>`로 나뉘어도 된다.)

`SettingsPage.tsx`(종이 패널 두 개, `components/ui.tsx`의 `Panel`이 있으면 그것을, 없으면 `paper` 클래스):
  - 제목 `<h1>설정</h1>`.
  - 소리 구역 `<section aria-labelledby>` "소리": `ToggleSwitch checked={!muted} onChange={toggleMuted} label="효과음"`(ToggleSwitch는 `role="switch"`, 접근 이름은 label 텍스트), 음량 `<label htmlFor="volume">음량</label><input id="volume" type="range" min={0} max={100} step={1} value={volume} disabled={muted} onChange={(e) => setVolume(Number(e.target.value))} className="... accent-mustard-400 disabled:opacity-40" /><span aria-hidden="true" className="w-8 text-right tabular-nums">{volume}</span>`, `<Button variant="secondary" onClick={() => play('myTurn')}>소리 들어보기</Button>`.
  - 계정 구역 "계정": 닉네임, 아이디(`member.loginId`), `<Button variant="danger" className="w-full" onClick={askLogout}>로그아웃</Button>`.
  - 로그아웃 흐름:
    ```tsx
    const [confirm, setConfirm] = useState<{ inGame: boolean } | null>(null);
    const [pending, setPending] = useState(false);
    const askLogout = async () => {
      const room = await roomsApi.mine().catch(() => null);
      const inGame = room !== null && room.status === 'PLAYING' && room.members.some((m) => m.id === member?.id);
      setConfirm({ inGame });
    };
    const doLogout = async () => {
      setPending(true);
      try {
        await logout();
        navigate('/login', { replace: true });
      } catch (error) {
        toast.show(messageOf(error));
        setPending(false);
      }
    };
    ...
    <LogoutConfirmModal open={confirm !== null} inGame={confirm?.inGame ?? false} pending={pending} onCancel={() => setConfirm(null)} onConfirm={doLogout} />
    ```
`App.tsx`: `<Route path="/settings" element={<SettingsPage />} />`를 `/records/:memberId` 다음에.
`Layout.tsx`: 소리 버튼과 로그아웃 버튼·`handleLogout`·관련 import(`useSound`, `SpeakerIcon`, `SpeakerMutedIcon`, `LogoutIcon`, `messageOf`, `useToast`, `useNavigate`, `logout`) 정리. nav에 `<NavLink to="/settings" aria-label="설정" className={linkClass}><GearIcon /><NavLabel full="설정" short="설정" /></NavLink>`를 전적 다음에.

- [ ] **Step 7: 통과 확인** — `npx vitest run` 전체 PASS(`noEmoji.test.ts` 포함), `npm run build` 성공.

- [ ] **Step 8: 커밋**
```bash
git add frontend/src/lib/sound.tsx frontend/src/lib/sound.test.tsx frontend/src/components/icons.tsx frontend/src/components/LogoutConfirmModal.tsx frontend/src/pages/SettingsPage.tsx frontend/src/pages/SettingsPage.test.tsx frontend/src/App.tsx frontend/src/components/Layout.tsx frontend/src/components/Layout.test.tsx
git commit -m "feat: 설정 페이지(효과음·음량·계정)와 로그아웃 확인 창, 헤더의 소리·로그아웃 버튼 옮기기

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 프론트 — 방 설정 창 (#8)

**Files:**
- Create: `frontend/src/room/SeatPicker.tsx` (CreateRoomModal에서 옮기고 `min` 추가)
- Modify: `frontend/src/room/CreateRoomModal.tsx` (SeatPicker import)
- Create: `frontend/src/room/RoomSettingsModal.tsx`, `frontend/src/room/RoomSettingsModal.test.tsx`
- Create test: `frontend/src/room/SeatPicker.test.tsx`
- Modify: `frontend/src/api/rooms.ts`
- Modify: `frontend/src/components/RoomStatusBar.tsx`, `frontend/src/pages/RoomPage.tsx`, `frontend/src/pages/RoomPage.test.tsx`
- Modify: `frontend/src/room/roomTheme.tsx` (배경 전환)

**Interfaces:**
- Consumes: Task 1 API; Task 4 `GearIcon`; Task 3이 바꾼 `RoomStatusBar`.
- Produces: `roomsApi.updateSettings(code: string, maxPlayers: number, theme: RoomTheme): Promise<Room>`.

- [ ] **Step 1: 실패 테스트**

`SeatPicker.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SeatPicker } from './SeatPicker';

describe('SeatPicker', () => {
  it('min보다 작은 칸은 비활성이고 눌러도 고르지 않는다', async () => {
    const onChange = vi.fn();
    render(<SeatPicker value={4} onChange={onChange} min={3} />);
    const two = screen.getByRole('radio', { name: '2' });
    expect(two).toBeDisabled();
    await userEvent.click(two);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('화살표로 옮길 때 비활성 칸은 건너뛴다', async () => {
    const onChange = vi.fn();
    render(<SeatPicker value={3} onChange={onChange} min={3} />);
    screen.getByRole('radio', { name: '3' }).focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith(5);
  });
});
```

`RoomSettingsModal.test.tsx`(Room 픽스처는 `pages/RoomPage.test.tsx`의 `baseRoom`을 참고해 만든다, 멤버 3명, maxPlayers 4, theme WOOD):
```tsx
  it('지금 인원보다 적은 칸은 비활성이고 안내를 보여 준다', () => {
    render(<RoomSettingsModal open room={room} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByRole('radio', { name: '2' })).toBeDisabled();
    expect(screen.getByText('지금 3명이 있어서 2명 이하로는 줄일 수 없어요.')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '4' })).toHaveAttribute('aria-checked', 'true');
  });

  it('고른 인원과 테마로 저장하고 창을 닫는다', async () => {
    const onSave = vi.fn(() => Promise.resolve());
    const onClose = vi.fn();
    render(<RoomSettingsModal open room={room} onClose={onClose} onSave={onSave} />);
    await userEvent.click(screen.getByRole('radio', { name: '5' }));
    await userEvent.click(screen.getByRole('radio', { name: /열대 해변/ }));
    await userEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(onSave).toHaveBeenCalledWith(5, 'BEACH');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('저장이 실패하면 창을 닫지 않고 다시 누를 수 있다', async () => {
    const onSave = vi.fn(() => Promise.reject(new Error('x')));
    const onClose = vi.fn();
    render(<RoomSettingsModal open room={room} onClose={onClose} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled());
    expect(onClose).not.toHaveBeenCalled();
  });
```
(ThemePicker 타일의 접근 이름은 `room/ThemePicker.test.tsx`를 보고 맞춘다. 모달 안 요소는 `findBy`가 필요할 수 있다.)

`RoomPage.test.tsx`에 추가(기존 `setChannel`/`renderRoom`/`waiting` 픽스처 사용; `roomsApi` 목에 `updateSettings` 추가):
```tsx
  it('대기 중인 방장에게만 방 설정 버튼이 있고, 저장하면 설정 API를 부른다', async () => {
    setChannel({ room: waiting }); // meId가 방장인 픽스처인지 확인, 아니면 hostId를 맞춘다
    renderRoom();
    await act(async () => {});
    await userEvent.click(within(screen.getByTestId('room-status-bar')).getByRole('button', { name: '방 설정' }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: '방 설정' })).getByRole('button', { name: '저장' }));
    expect(rooms.updateSettings).toHaveBeenCalledWith('ABC234', waiting.maxPlayers, waiting.theme);
  });

  it('방장이 아니거나 게임 중이면 방 설정 버튼이 없다', async () => {
    // 방장이 아닌 픽스처, 게임 중 픽스처 각각 렌더 → queryByRole('button', { name: '방 설정' }) 없음
  });
```
두 번째 테스트는 실제 픽스처 두 개(게스트 시점 대기 방, 방장 시점 게임 중 방)로 완성해서 쓴다.

- [ ] **Step 2: 실패 확인** — 세 테스트 파일 실행 → 실패.

- [ ] **Step 3: 구현**
  - `SeatPicker.tsx`: CreateRoomModal의 `SeatPicker`, `SEAT_OPTIONS`, `STEP`, `SECTION_TITLE`(같이 쓰면 `export`)을 옮긴다. `min = 2` prop: `disabled={count < min}`, 비활성 칸은 `opacity-40 line-through cursor-not-allowed`, 화살표 이동은 활성 칸만 순환(`const enabled = SEAT_OPTIONS.filter((c) => c >= min)`에서 인덱스 계산).
  - `CreateRoomModal.tsx`: `import { SeatPicker, SECTION_TITLE } from './SeatPicker';`로 바꾸고 동작은 그대로(기존 `CreateRoomModal.test.tsx` 통과 유지).
  - `api/rooms.ts`: `updateSettings: (code: string, maxPlayers: number, theme: RoomTheme) => request<Room>(\`${path(code)}/settings\`, { method: 'PATCH', body: { maxPlayers, theme } }),`
  - `RoomSettingsModal.tsx`: props `{ open: boolean; room: Room; onClose: () => void; onSave: (maxPlayers: number, theme: RoomTheme) => Promise<unknown> }`. 열릴 때(`useEffect([open])`) `room.maxPlayers`, `room.theme`로 초기화. `min = Math.max(2, room.members.length)`, `min > 2`이면 `<p className="text-xs text-stone-500">지금 {n}명이 있어서 {n - 1}명 이하로는 줄일 수 없어요.</p>`. `ThemePicker`. 버튼 "취소"(secondary) / "저장"(primary, pending이면 disabled). 저장: `setPending(true); try { await onSave(maxPlayers, theme); onClose(); } catch { /* 토스트는 onSave 쪽 */ } finally { setPending(false); }`. `Modal title="방 설정" padding="snug"`, 안에 `<h2>방 설정</h2>`(CreateRoomModal과 같은 모양).
  - `RoomStatusBar.tsx`: prop `onSettings?: () => void`. 첫 줄의 `CodeChip` 앞에 `{onSettings ? <button type="button" onClick={onSettings} aria-label="방 설정" className="pill press-3d flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold sm:px-2.5 sm:py-1 sm:text-xs"><GearIcon className="h-3.5 w-3.5" /><span className="hidden sm:inline">방 설정</span></button> : null}`.
  - `RoomPage.tsx`: `const [editingSettings, setEditingSettings] = useState(false);` `const canEditSettings = !playing && !spectating && room.hostId === meId;` 상태 바에 `onSettings={canEditSettings ? () => setEditingSettings(true) : undefined}`. `<RoomSettingsModal open={editingSettings && canEditSettings} room={room} onClose={() => setEditingSettings(false)} onSave={async (maxPlayers, theme) => { try { await roomsApi.updateSettings(code, maxPlayers, theme); } catch (error) { toast.show(messageOf(error)); throw error; } }} />`. 방 상태는 서버 방송으로 갱신된다.
  - `roomTheme.tsx` `RoomBackdrop`: 포털 안을 `<AnimatePresence initial={false}><motion.div key={theme} data-testid="room-backdrop" data-theme={theme} aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="room-scene pointer-events-none fixed inset-0 -z-10" /></AnimatePresence>`로. 기존 `room-backdrop` 테스트가 하나를 기대하면 `getAllByTestId(...).at(-1)`로 바꾸지 말고, skipAnimations 환경에서 exit가 즉시 끝나 하나만 남는지 먼저 확인한다.

- [ ] **Step 4: 통과 확인** — `npx vitest run` 전체 PASS, `npm run build` 성공.

- [ ] **Step 5: 커밋**
```bash
git add frontend/src/room/SeatPicker.tsx frontend/src/room/SeatPicker.test.tsx frontend/src/room/CreateRoomModal.tsx frontend/src/room/RoomSettingsModal.tsx frontend/src/room/RoomSettingsModal.test.tsx frontend/src/api/rooms.ts frontend/src/components/RoomStatusBar.tsx frontend/src/pages/RoomPage.tsx frontend/src/pages/RoomPage.test.tsx frontend/src/room/roomTheme.tsx
git commit -m "feat: 대기실에서 방장이 최대 인원과 테마를 바꾸는 방 설정 창

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 프론트 — 엿본 카드 또렷하게 (#9)

**Files:**
- Modify: `frontend/src/games/papersafari/CardFace.tsx`, `frontend/src/games/papersafari/CardFace.test.tsx`
- Modify: `frontend/src/index.css` (`peek-lift` 키프레임)

- [ ] **Step 1: 실패 테스트** — `CardFace.test.tsx`의 `'엿본 카드는 엿봄 표시를 한다'`를 교체:

```tsx
  it('엿본 카드는 앞면을 또렷하게 그리고 보라 점선 테두리와 "엿봄" 꼬리표를 단다', () => {
    render(<CardFace card={{ kind: 'FOX', value: -2 }} faceUp={false} known />);

    const card = screen.getByLabelText('여우 -2 카드 (엿봄)');
    expect(card).toHaveAttribute('data-side', 'peeked');
    expect(card).toHaveClass('outline-dashed', 'outline-violet-400', 'peek-lift');
    expect(card.querySelector('.card-inner')).toHaveStyle({ transform: 'rotateY(0deg)' });
    expect(within(card).getByTestId('peek-tag')).toHaveTextContent('엿봄');
    expect(card.querySelector('[data-testid="peek-icon"]')).toBeNull();
    expect(card.querySelector('.opacity-45')).toBeNull();
    expect(card.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('공개된 카드에는 엿봄 표시가 없다', () => {
    render(<CardFace card={{ kind: 'FOX', value: -2 }} faceUp known />);

    const card = screen.getByLabelText('여우 -2 카드');
    expect(card).toHaveAttribute('data-side', 'front');
    expect(card).not.toHaveClass('outline-dashed');
    expect(screen.queryByTestId('peek-tag')).not.toBeInTheDocument();
  });
```
(`within` import 추가.)

- [ ] **Step 2: 실패 확인** — `npx vitest run src/games/papersafari/CardFace.test.tsx`.

- [ ] **Step 3: 구현** — `CardFace.tsx`:
  - `const peeked = card !== null && known && !faceUp;` `const showFront = card !== null && (faceUp || peeked);` `const side = peeked ? 'peeked' : showFront ? 'front' : 'back';`(중첩 삼항이 싫으면 작은 함수 `sideOf`).
  - 버튼에 `data-side={side}`, 엿봤으면 클래스 `outline-[3px] outline-dashed outline-violet-400 outline-offset-2 peek-lift`.
  - 기존 두 `peeked` 블록(45% 겹친 그림, 돋보기 배지)을 지우고 `{peeked ? <span data-testid="peek-tag" aria-hidden="true" className="pointer-events-none absolute -bottom-2 left-1/2 z-[2] -translate-x-1/2 whitespace-nowrap rounded-full bg-violet-600 px-1.5 text-[9px] font-black leading-4 text-white shadow">엿봄</span> : null}`. 쓰이지 않게 된 `PeekIcon` import 제거(아이콘 정의는 남겨도 된다).
  - `index.css`(다른 키프레임 근처):
    ```css
    /* 코끼리로 엿본 카드가 처음 엿봄 상태가 될 때 한 번 살짝 들렸다 내려온다. */
    @media (prefers-reduced-motion: no-preference) {
      .peek-lift { animation: peek-lift 0.35s ease-out; }
    }
    @keyframes peek-lift {
      0% { transform: translateY(0); }
      45% { transform: translateY(-8px); }
      100% { transform: translateY(0); }
    }
    ```
    카드 버튼에는 hover용 `transition-transform`이 있다 — 애니메이션과 겹쳐도 문제없는지 브라우저 없이 판단하기 어려우면 그대로 둔다(애니메이션이 transform을 잠시 덮을 뿐이다).

- [ ] **Step 4: 통과 확인** — `npx vitest run` 전체 PASS(엿봄 관련 다른 테스트 `PlayerBoard.test.tsx`, `PaperSafariTable.test.tsx`에서 `data-side` 'back'이나 peek-icon을 기대하는 곳이 있으면 새 표시에 맞게 고친다), `npm run build`.

- [ ] **Step 5: 커밋**
```bash
git add frontend/src/games/papersafari/CardFace.tsx frontend/src/games/papersafari/CardFace.test.tsx frontend/src/index.css
git commit -m "feat: 코끼리로 엿본 카드는 앞면을 또렷하게, 보라 점선 테두리와 엿봄 꼬리표

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
(다른 테스트 파일을 고쳤다면 함께 `git add`.)

---

### Task 7: 프론트 — 준비 버튼 전환 애니메이션 (#1)

**Files:**
- Modify: `frontend/src/room/WaitingActionBar.tsx`, `frontend/src/room/WaitingActionBar.test.tsx`
- Modify: `frontend/src/room/MemberList.tsx` (준비 완료 배지 등장), `frontend/src/room/WaitingRoom.test.tsx`(필요 시)

- [ ] **Step 1: 실패 테스트** — `WaitingActionBar.test.tsx`에 추가(기존 렌더 헬퍼 사용):

```tsx
  it('준비 취소 상태에는 체크 아이콘이 있고, 준비하기에는 없다', () => {
    // ready=true인 게스트로 렌더
    const cancel = screen.getByRole('button', { name: '준비 취소' });
    expect(cancel.querySelector('[data-testid="ready-check"]')).not.toBeNull();
    expect(cancel).toHaveClass('transition-colors');
    // ready=false로 다시 렌더
    expect(screen.getByRole('button', { name: '준비하기' }).querySelector('[data-testid="ready-check"]')).toBeNull();
  });

  it('준비 상태가 바뀌어도 같은 버튼 요소라 키보드 포커스를 잃지 않는다', async () => {
    // ready=false로 렌더 → 버튼 focus → rerender(ready=true) → document.activeElement가 같은 버튼(이름 '준비 취소')
  });
```
두 테스트를 기존 파일의 픽스처·렌더 함수로 완성한다(주석 부분을 실제 코드로).

- [ ] **Step 2: 실패 확인**.

- [ ] **Step 3: 구현** — `ReadyButton`:
  - `import { motion, useAnimate } from 'motion/react';` `const [scope, animate] = useAnimate();` 이전 `ready`를 `useRef`로 기억, 값이 바뀌었을 때만(첫 렌더 제외) `animate(scope.current, { scale: [1, 0.92, 1.06, 1] }, { duration: 0.4, ease: 'easeOut' })`. `scope`는 버튼을 감싼 `<div ref={scope} className="inline-flex">`에 단다(`Button`이 ref를 받지 않으므로).
  - 버튼 className에 `transition-colors duration-300` 추가.
  - 내용: `<span className="inline-flex items-center gap-1.5">{ready ? <ReadyCheck /> : null}<motion.span key={ready ? 'cancel' : 'ready'} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>{ready ? '준비 취소' : '준비하기'}</motion.span></span>`.
  - `ReadyCheck`: `<svg data-testid="ready-check" aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none"><motion.path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="text-green-700" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35 }} /></svg>`.
  - 동작 줄이기: 앱의 `MotionConfig reducedMotion="user"`가 transform·pathLength 애니메이션을 끈다. `useAnimate`의 `animate`도 `MotionConfig`를 따르는지 확인하고, 아니면 `useReducedMotion()`이 true일 때 호출하지 않는다.
  - `MemberList.tsx` `StatusChip`의 준비 완료 배지를 `<motion.span key="ready" initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.6, duration: 0.35 }} className={...}>`로.

- [ ] **Step 4: 통과 확인** — `npx vitest run` 전체 PASS, `npm run build`.

- [ ] **Step 5: 커밋**
```bash
git add frontend/src/room/WaitingActionBar.tsx frontend/src/room/WaitingActionBar.test.tsx frontend/src/room/MemberList.tsx
git commit -m "feat: 준비하기와 준비 취소 사이 튕김·체크·글자 전환 애니메이션

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 프론트 — 모바일 내보내기 X 버튼 (#10)

**Files:**
- Create: `frontend/src/components/KickBadge.tsx`
- Modify: `frontend/src/room/MemberList.tsx`, `frontend/src/room/WaitingRoom.test.tsx`
- Modify: `frontend/src/games/papersafari/PlayerBoard.tsx`, `frontend/src/games/papersafari/PlayerBoard.test.tsx`
- Modify: `frontend/src/games/papersafari/PaperSafariTable.test.tsx`, `frontend/src/pages/RoomPage.test.tsx` (모바일에서 '내보내기' 이름으로 찾는 곳이 있으면)

**Interfaces:**
- 모바일 X 버튼 접근 이름: `{닉네임}님 내보내기`. PC 글자 버튼은 지금처럼 "내보내기".

- [ ] **Step 1: 실패 테스트** — `WaitingRoom.test.tsx`(방장 시점, 게스트가 있는 기존 픽스처):

```tsx
  it('모바일에서는 방장의 내보내기가 아바타 오른쪽 위 작은 X 버튼이다', async () => {
    setMediaMatches(false);
    // 방장 시점 렌더
    const kick = screen.getByRole('button', { name: '밥님 내보내기' });
    expect(kick).toHaveClass('absolute', '-right-2', '-top-2', 'h-8', 'w-8');
    expect(kick.querySelector('svg')).not.toBeNull();
    expect(screen.queryByRole('button', { name: '내보내기' })).not.toBeInTheDocument();
    await userEvent.click(kick);
    // 기존 내보내기 확인 창(KickConfirmModal)이 뜬다
  });

  it('PC에서는 지금처럼 글자 버튼이다', () => {
    setMediaMatches(true);
    // 방장 시점 렌더
    expect(screen.getByRole('button', { name: '내보내기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '밥님 내보내기' })).not.toBeInTheDocument();
  });
```
`PlayerBoard.test.tsx`(onForfeit을 준 판):
```tsx
  it('모바일에서 연결 끊긴 사람의 내보내기는 이름표 옆 작은 X 버튼이다', async () => {
    setMediaMatches(false);
    const onForfeit = vi.fn();
    render(<PlayerBoard board={board} nickname="밥" active={false} connected={false} offlineSeconds={70} onForfeit={onForfeit} />);
    await userEvent.click(screen.getByRole('button', { name: '밥님 내보내기' }));
    expect(onForfeit).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '내보내기' })).not.toBeInTheDocument();
  });
```
(`board` 픽스처와 필수 props는 기존 테스트에 맞춘다.) 주석 부분은 실제 렌더 코드로 완성한다.

- [ ] **Step 2: 실패 확인**.

- [ ] **Step 3: 구현**
  - 공용 작은 컴포넌트 `frontend/src/components/KickBadge.tsx`(새 파일, 위 Files에 포함):
    ```tsx
    import { CloseIcon } from './icons';

    /** 모바일 내보내기: 지름 20px 빨간 동그라미 X, 누르는 영역은 32px. 위치는 쓰는 쪽이 className으로 정한다. */
    export function KickBadge({ label, onClick, className = '' }: { label: string; onClick: () => void; className?: string }) {
      return (
        <button type="button" aria-label={label} onClick={onClick} className={`grid h-8 w-8 place-items-center ${className}`}>
          <span className="grid h-5 w-5 place-items-center rounded-full border-2 border-cream-50 bg-red-700 text-white shadow-[0_2px_0_rgb(0_0_0/0.35)]">
            <CloseIcon className="h-2.5 w-2.5" />
          </span>
        </button>
      );
    }
    ```
  - `MemberList.tsx`: `const pc = useMediaQuery(PC_QUERY);` 자리마다 `const remove = member ? removeActionOf({ member, meId, receivedAt, now, onForfeit, onKick }) : null;`를 MemberList에서 계산해 `Seated`에 `remove` prop으로 넘긴다. PC가 아니고 `remove`가 있으면 아바타 `motion.div` 안에 `<KickBadge label={\`${member.nickname}님 내보내기\`} onClick={remove} className="absolute -right-2 -top-2" />`, `Seated`는 글자 버튼을 그리지 않는다. PC면 지금처럼 `Seated`의 글자 버튼.
  - `PlayerBoard.tsx`: `const pc = useMediaQuery(PC_QUERY);` `onForfeit`이 있고 `!pc`면 글자 버튼 대신 `<KickBadge label={\`${nickname}님 내보내기\`} onClick={onForfeit} className="-my-1.5" />`(이름표 줄 높이를 늘리지 않게 음수 여백), PC면 기존 글자 버튼.
  - 판 크게 보기 등 결과 화면(`result`)에서는 `onForfeit`이 없으므로 영향 없음.

- [ ] **Step 4: 통과 확인** — `npx vitest run` 전체 PASS(모바일에서 `'내보내기'` 이름으로 찾던 기존 테스트는 새 이름으로 고친다), `npm run build`.

- [ ] **Step 5: 커밋**
```bash
git add frontend/src/components/KickBadge.tsx frontend/src/room/MemberList.tsx frontend/src/room/WaitingRoom.test.tsx frontend/src/games/papersafari/PlayerBoard.tsx frontend/src/games/papersafari/PlayerBoard.test.tsx frontend/src/games/papersafari/PaperSafariTable.test.tsx frontend/src/pages/RoomPage.test.tsx
git commit -m "feat: 모바일에서 내보내기는 아바타·이름표 옆 작은 X 버튼

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
(바뀌지 않은 파일은 add에서 빼도 된다.)

---

## 순서와 병렬

- 파일이 겹치는 순서: Task 3 → Task 5(`RoomStatusBar`, `RoomPage.test`), Task 4 → Task 5(`GearIcon`), Task 7 → Task 8(`MemberList`), Task 1 → Task 5(API).
- 서로 파일이 겹치지 않는 묶음은 동시에 진행해도 된다: {Task 1, Task 2}(같은 `RoomService` — 서로 다른 위치에 메서드 추가지만 같은 파일이므로 **순차**), {Task 3, Task 4, Task 6, Task 7}(서로 다른 파일 — 단 `PaperSafariTable.test.tsx`는 Task 3만, Task 8과는 겹침).
- 권장 순서: 1 → 2 (백엔드 순차) ∥ 3, 4, 6, 7 (프론트 병렬) → 5 → 8.
