# 계획 2: 회원/인증 + 전역 예외 처리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모든 에러를 `{status, code, message}` JSON으로 통일하고, 아이디/비밀번호 회원가입·로그인·로그아웃·내 정보 조회를 세션 기반으로 제공한다.

**Architecture:** `common.error`에 `ErrorResponse` + `@RestControllerAdvice`. `member.domain`에 값 객체(`LoginId`, `Nickname`, `RawPassword`, `PasswordHash`, `Credentials`)와 엔티티 `Member`, 암호화 포트 `PasswordEncryptor`. `member.application.MemberService`가 중복 검사·가입·인증을 조율하고, `member.api` 컨트롤러가 JSON API를 연다. Spring Security는 세션(`HttpSessionSecurityContextRepository`)에 `LoginMember` principal을 저장한다. 미인증 요청은 JSON 401.

**Tech Stack:** Java 21, Spring Boot 3.5.16, Spring Security 6, Spring Data JPA(Hibernate 6), H2(로컬·테스트), MySQL 드라이버(런타임, 계획 5에서 사용), JUnit 5, AssertJ, MockMvc

**Spec:** `docs/superpowers/specs/2026-10-05-board-game-platform-design.md` (§2 인증, §6.1 회원, §8 에러 처리)

### 로드맵 위치
1. ~~백엔드 기반 + 페이퍼 사파리 규칙 엔진~~ (완료)
2. **회원/인증 + 전역 예외 처리** ← 이 문서
3. 방(대기실) + `GameEngine` + STOMP 실시간 + 끊김/기권
4. 전적 + 승률 + 순위표
5. 프론트엔드 + Docker Compose

### 스펙 대비 구체화한 결정
- 스펙의 "폼 로그인"은 SPA(React)에 맞춰 **JSON 로그인 API**(`POST /api/auth/login`)로 구현한다. 세션 쿠키 방식은 스펙 그대로.
- CSRF 토큰은 끈다. 대신 세션 쿠키를 `SameSite=Lax`, `HttpOnly`로 두고 상태 변경 API는 JSON 본문만 받는다(타 사이트 폼은 JSON을 보낼 수 없음). 지인용 서비스 기준의 단순화.
- 아이디는 **소문자로 정규화**해 저장한다(MySQL 기본 정렬이 대소문자를 구분하지 않아 `Alice01`/`alice01` 충돌을 막기 위함).
- 테이블 이름은 `members`(MySQL 8의 `MEMBER` 키워드 회피).
- `LoginMember`는 `java.security.Principal`을 구현하고 `getName()`이 회원 id 문자열을 돌려준다 → 계획 3의 STOMP `/user/queue/...` 라우팅에 그대로 사용.

## Global Constraints

- Java 21, Spring Boot **3.5.16**, Maven. 기본 패키지 `com.boardgame`. 모든 명령은 저장소 루트에서 `mvn -q -f backend/pom.xml ...`로 실행.
- 객체지향 생활 체조(CLAUDE.md): 메서드당 들여쓰기 1단계, `else` 금지(early return), 도메인 원시값은 VO로 래핑, 한 줄에 점 하나(스트림/Optional/빌더 플루언트 체인, 리포지토리 호출 인자의 `vo.value()`는 예외), 로직은 도메인 엔티티에, 클래스 상태 필드 3개 이하(JPA `id`·상속받은 `createdAt` 제외).
- API 요청/응답 DTO(`record`)는 원시값(`String`, `long`) 사용 허용.
- 에러: 비즈니스 규칙 위반은 `BusinessException(ErrorCode)`. 모든 에러 응답 본문은 `{"status": <int HTTP 상태>, "code": "<ErrorCode 이름>", "message": "<사용자용 메시지>"}`.
- 회원 규칙(스펙 §6.1): 아이디 4~20자 영문/숫자·중복 불가, 닉네임 2~10자·중복 불가, 비밀번호 8자 이상(상한 64자), 저장은 BCrypt 해시.
- 테스트 메서드명은 한국어 문장. 커밋 메시지 마지막 줄: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Review Focus

1. 로그인 시 비밀번호가 짧거나 비어 있음 → 형식 오류가 아니라 `INVALID_CREDENTIALS`(401)로 응답해 정보 노출 없음 (Task 3 테스트)
2. 앞뒤 공백이 있는 닉네임(`" 앨리스 "`) → 공백 제거 후 저장되고, 기존 `"앨리스"`와 중복이면 `DUPLICATE_NICKNAME` (Task 2, Task 3 테스트)
3. 로그인 없이 `/api/**` 호출 → HTML 리다이렉트가 아니라 JSON 401 `UNAUTHORIZED` (Task 3 테스트)
4. 없는 URL / 잘못된 HTTP 메서드 → Whitelabel 페이지가 아니라 JSON 404 `NOT_FOUND` / 405 `METHOD_NOT_ALLOWED` (Task 1 테스트)
5. 대문자가 섞인 아이디(`Alice01`)로 가입 후 `alice01`로 로그인 → 같은 계정으로 인식 (Task 2, Task 3 테스트)

---

## File Structure

```
.gitignore                                                  (Modify: backend/data/ 추가)
backend/pom.xml                                             (Modify: 의존성 추가)
backend/src/main/resources/application.yml                  (Create → Modify)
backend/src/test/resources/application.yml                  (Create → Modify)
backend/src/main/java/com/boardgame/BoardGameApplication.java (Modify: UserDetailsService 자동설정 제외)
backend/src/main/java/com/boardgame/common/error/
  ErrorCode.java (Modify)  ErrorResponse.java  GlobalExceptionHandler.java
backend/src/main/java/com/boardgame/common/persistence/BaseTimeEntity.java
backend/src/main/java/com/boardgame/common/security/
  LoginMember.java  SecurityConfig.java  JsonAuthenticationEntryPoint.java  SessionLogin.java
backend/src/main/java/com/boardgame/member/domain/
  LoginId.java  Nickname.java  RawPassword.java  PasswordHash.java  Credentials.java
  PasswordEncryptor.java  Member.java  MemberRepository.java
backend/src/main/java/com/boardgame/member/infra/BCryptPasswordEncryptor.java
backend/src/main/java/com/boardgame/member/application/MemberService.java
backend/src/main/java/com/boardgame/member/api/
  SignUpRequest.java  LoginRequest.java  MemberResponse.java  MemberController.java  AuthController.java
backend/src/test/java/com/boardgame/common/error/GlobalExceptionHandlerTest.java
backend/src/test/java/com/boardgame/member/domain/
  LoginIdTest.java  NicknameTest.java  RawPasswordTest.java  MemberTest.java
  FakePasswordEncryptor.java  MemberRepositoryTest.java
backend/src/test/java/com/boardgame/member/api/AuthApiTest.java
```

---

### Task 1: 통일된 에러 응답과 전역 예외 처리

**Files:**
- Modify: `backend/src/main/java/com/boardgame/common/error/ErrorCode.java`
- Create: `backend/src/main/java/com/boardgame/common/error/ErrorResponse.java`, `GlobalExceptionHandler.java`
- Create: `backend/src/main/resources/application.yml`, `backend/src/test/resources/application.yml`
- Test: `backend/src/test/java/com/boardgame/common/error/GlobalExceptionHandlerTest.java`

**Interfaces:**
- Consumes: 기존 `ErrorCode`(`status()`, `code()`, `message()`), `BusinessException(ErrorCode)`·`errorCode()`
- Produces:
  - `ErrorCode.NOT_FOUND`(404), `ErrorCode.METHOD_NOT_ALLOWED`(405), `int ErrorCode.statusCode()`
  - `record ErrorResponse(int status, String code, String message)` + `static ErrorResponse of(ErrorCode)`
  - `GlobalExceptionHandler`(`@RestControllerAdvice`): `BusinessException`→해당 코드, 잘못된 본문/파라미터→`INVALID_INPUT`, 없는 경로→`NOT_FOUND`, 잘못된 메서드→`METHOD_NOT_ALLOWED`, 그 외→`INTERNAL_ERROR`(로그 기록, 내부 메시지 노출 안 함)

- [ ] **Step 1: 설정 파일 작성 (응답 UTF-8 강제)**

`backend/src/main/resources/application.yml`
```yaml
server:
  servlet:
    encoding:
      charset: UTF-8
      force: true
```

`backend/src/test/resources/application.yml`
```yaml
server:
  servlet:
    encoding:
      charset: UTF-8
      force: true
```

- [ ] **Step 2: 실패하는 테스트 작성**

`backend/src/test/java/com/boardgame/common/error/GlobalExceptionHandlerTest.java`
```java
package com.boardgame.common.error;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@SpringBootTest
@AutoConfigureMockMvc
@Import(GlobalExceptionHandlerTest.ErrorTestController.class)
class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void 비즈니스_예외는_에러_코드의_상태와_형식으로_응답한다() throws Exception {
        mockMvc.perform(get("/test/errors/business"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.code").value("NOT_YOUR_TURN"))
                .andExpect(jsonPath("$.message").value("지금은 당신의 차례가 아닙니다."));
    }

    @Test
    void 예상하지_못한_예외는_내부_정보_없이_500으로_응답한다() throws Exception {
        mockMvc.perform(get("/test/errors/unexpected"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.message").value("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."));
    }

    @Test
    void 깨진_JSON_본문은_INVALID_INPUT() throws Exception {
        mockMvc.perform(post("/test/errors/body")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void 잘못된_파라미터_형식과_누락은_INVALID_INPUT() throws Exception {
        mockMvc.perform(get("/test/errors/number").param("value", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        mockMvc.perform(get("/test/errors/number"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void 없는_경로는_NOT_FOUND() throws Exception {
        mockMvc.perform(get("/test/errors/nowhere"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void 지원하지_않는_메서드는_METHOD_NOT_ALLOWED() throws Exception {
        mockMvc.perform(post("/test/errors/business"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"));
    }

    @RestController
    @RequestMapping("/test/errors")
    public static class ErrorTestController {

        @GetMapping("/business")
        public void business() {
            throw new BusinessException(ErrorCode.NOT_YOUR_TURN);
        }

        @GetMapping("/unexpected")
        public void unexpected() {
            throw new IllegalStateException("내부 상세 정보");
        }

        @PostMapping("/body")
        public void body(@RequestBody Map<String, String> body) {
        }

        @GetMapping("/number")
        public void number(@RequestParam int value) {
        }
    }
}
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest=GlobalExceptionHandlerTest`
Expected: FAIL — 컴파일은 되지만 응답이 Spring 기본 형식이라 `No value at JSON path "$.code"` 등 단언 실패 다수

- [ ] **Step 4: 구현**

`ErrorCode.java` — `INTERNAL_ERROR(...)` 줄 바로 아래에 두 상수를 추가:
```java
    NOT_FOUND(HttpStatus.NOT_FOUND, "요청한 경로를 찾을 수 없습니다."),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "지원하지 않는 요청 방식입니다."),
```
그리고 `status()` 메서드 아래에 추가:
```java
    public int statusCode() {
        return status.value();
    }
```

`backend/src/main/java/com/boardgame/common/error/ErrorResponse.java`
```java
package com.boardgame.common.error;

public record ErrorResponse(int status, String code, String message) {

    public static ErrorResponse of(ErrorCode errorCode) {
        return new ErrorResponse(errorCode.statusCode(), errorCode.code(), errorCode.message());
    }
}
```

`backend/src/main/java/com/boardgame/common/error/GlobalExceptionHandler.java`
```java
package com.boardgame.common.error;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusiness(BusinessException exception) {
        return respond(exception.errorCode());
    }

    @ExceptionHandler({
            HttpMessageNotReadableException.class,
            MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ErrorResponse> handleInvalidInput(Exception exception) {
        return respond(ErrorCode.INVALID_INPUT);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(NoResourceFoundException exception) {
        return respond(ErrorCode.NOT_FOUND);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotAllowed(HttpRequestMethodNotSupportedException exception) {
        return respond(ErrorCode.METHOD_NOT_ALLOWED);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception exception) {
        log.error("예상하지 못한 오류", exception);
        return respond(ErrorCode.INTERNAL_ERROR);
    }

    private ResponseEntity<ErrorResponse> respond(ErrorCode errorCode) {
        return ResponseEntity.status(errorCode.status()).body(ErrorResponse.of(errorCode));
    }
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest=GlobalExceptionHandlerTest`
Expected: PASS (6 tests)

- [ ] **Step 6: 전체 회귀 확인 후 커밋**

Run: `mvn -q -f backend/pom.xml test`
Expected: PASS (기존 91 + 6)

```bash
git add backend
git commit -m "feat: 통일된 에러 응답과 전역 예외 처리" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 회원 도메인(값 객체, 엔티티, 리포지토리)

**Files:**
- Modify: `backend/pom.xml`, `.gitignore`, `backend/src/main/resources/application.yml`, `backend/src/test/resources/application.yml`, `ErrorCode.java`
- Create: `backend/src/main/java/com/boardgame/common/persistence/BaseTimeEntity.java`
- Create: `backend/src/main/java/com/boardgame/member/domain/{LoginId,Nickname,RawPassword,PasswordHash,Credentials,PasswordEncryptor,Member,MemberRepository}.java`
- Test: `backend/src/test/java/com/boardgame/member/domain/{LoginIdTest,NicknameTest,RawPasswordTest,MemberTest,FakePasswordEncryptor,MemberRepositoryTest}.java`

**Interfaces:**
- Consumes: `BusinessException`, `ErrorCode`, `ErrorAssertions.assertError(ThrowingCallable, ErrorCode)`(테스트)
- Produces:
  - `ErrorCode.INVALID_LOGIN_ID`(400), `INVALID_NICKNAME`(400), `INVALID_PASSWORD`(400), `INVALID_CREDENTIALS`(401)
  - `@Embeddable class LoginId` — `new LoginId(String)`(소문자 정규화, 4~20 영문/숫자 아니면 `INVALID_LOGIN_ID`), `String value()`
  - `@Embeddable class Nickname` — `new Nickname(String)`(앞뒤 공백 제거, 2~10자 아니면 `INVALID_NICKNAME`), `String value()`
  - `final class RawPassword` — `static of(String)`(8~64자 아니면 `INVALID_PASSWORD`), `static unchecked(String)`(로그인용, 검증 없음·null은 빈 문자열), `String value()`
  - `@Embeddable class PasswordHash` — `new PasswordHash(String)`, `String value()`
  - `interface PasswordEncryptor { PasswordHash encrypt(RawPassword); boolean matches(RawPassword, PasswordHash); }`
  - `@Entity class Member`(테이블 `members`) — `static register(LoginId, Nickname, RawPassword, PasswordEncryptor)`, `authenticate(RawPassword, PasswordEncryptor)`(불일치 시 `INVALID_CREDENTIALS`), `Long id()`, `String loginIdValue()`, `String nicknameValue()`, `LocalDateTime createdAt()`
  - `interface MemberRepository extends JpaRepository<Member, Long>` — `Optional<Member> findByCredentialsLoginIdValue(String)`, `boolean existsByCredentialsLoginIdValue(String)`, `boolean existsByNicknameValue(String)`
  - 테스트 `FakePasswordEncryptor`(해시 = `"hashed:" + 원문`)

- [ ] **Step 1: 의존성과 설정 추가**

`backend/pom.xml` — `spring-boot-starter-web` 의존성 아래에 추가:
```xml
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>com.mysql</groupId>
            <artifactId>mysql-connector-j</artifactId>
            <scope>runtime</scope>
        </dependency>
```

`.gitignore` — 맨 아래에 추가:
```
backend/data/
```

`backend/src/main/resources/application.yml` — 전체를 다음으로 교체 (로컬 실행 시 `backend/data/`에 H2 파일 DB):
```yaml
spring:
  datasource:
    url: jdbc:h2:file:./data/boardgame;MODE=MySQL
    username: sa
    password:
  jpa:
    hibernate:
      ddl-auto: update
    open-in-view: false
  h2:
    console:
      enabled: true
      path: /h2-console

server:
  servlet:
    encoding:
      charset: UTF-8
      force: true
```

`backend/src/test/resources/application.yml` — 전체를 다음으로 교체 (테스트는 메모리 DB):
```yaml
spring:
  datasource:
    url: jdbc:h2:mem:testdb;MODE=MySQL;DB_CLOSE_DELAY=-1
    username: sa
    password:
  jpa:
    hibernate:
      ddl-auto: create-drop
    open-in-view: false

server:
  servlet:
    encoding:
      charset: UTF-8
      force: true
```

`ErrorCode.java` — `INVALID_PLAYER_COUNT(` 줄 바로 위에 추가:
```java
    INVALID_LOGIN_ID(HttpStatus.BAD_REQUEST, "아이디는 4~20자의 영문과 숫자만 사용할 수 있습니다."),
    INVALID_NICKNAME(HttpStatus.BAD_REQUEST, "닉네임은 2~10자로 입력해 주세요."),
    INVALID_PASSWORD(HttpStatus.BAD_REQUEST, "비밀번호는 8~64자로 입력해 주세요."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다."),

```

- [ ] **Step 2: 실패하는 테스트 작성**

`backend/src/test/java/com/boardgame/member/domain/LoginIdTest.java`
```java
package com.boardgame.member.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class LoginIdTest {

    @Test
    void 영문과_숫자_4자에서_20자까지_허용한다() {
        assertThat(new LoginId("abcd").value()).isEqualTo("abcd");
        assertThat(new LoginId("alice01").value()).isEqualTo("alice01");
        assertThat(new LoginId("a".repeat(20)).value()).hasSize(20);
    }

    @Test
    void 대문자는_소문자로_바꿔_저장한다() {
        assertThat(new LoginId("Alice01")).isEqualTo(new LoginId("alice01"));
        assertThat(new LoginId("Alice01").value()).isEqualTo("alice01");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"abc", "aaaaaaaaaaaaaaaaaaaaa", "앨리스1234", "alice 01", "alice_01"})
    void 형식에_맞지_않으면_INVALID_LOGIN_ID(String value) {
        assertError(() -> new LoginId(value), ErrorCode.INVALID_LOGIN_ID);
    }
}
```

`backend/src/test/java/com/boardgame/member/domain/NicknameTest.java`
```java
package com.boardgame.member.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class NicknameTest {

    @Test
    void 두_자에서_열_자까지_허용한다() {
        assertThat(new Nickname("철수").value()).isEqualTo("철수");
        assertThat(new Nickname("가나다라마바사아자차").value()).hasSize(10);
    }

    @Test
    void 앞뒤_공백은_제거한다() {
        assertThat(new Nickname("  앨리스  ")).isEqualTo(new Nickname("앨리스"));
        assertThat(new Nickname("  앨리스  ").value()).isEqualTo("앨리스");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"가", "   ", "가나다라마바사아자차카"})
    void 길이가_맞지_않으면_INVALID_NICKNAME(String value) {
        assertError(() -> new Nickname(value), ErrorCode.INVALID_NICKNAME);
    }
}
```

`backend/src/test/java/com/boardgame/member/domain/RawPasswordTest.java`
```java
package com.boardgame.member.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class RawPasswordTest {

    @Test
    void 가입용_비밀번호는_8자에서_64자까지_허용한다() {
        assertThat(RawPassword.of("password").value()).isEqualTo("password");
        assertThat(RawPassword.of("p".repeat(64)).value()).hasSize(64);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"short12"})
    void 가입용_비밀번호가_짧으면_INVALID_PASSWORD(String value) {
        assertError(() -> RawPassword.of(value), ErrorCode.INVALID_PASSWORD);
    }

    @Test
    void 가입용_비밀번호가_64자를_넘으면_INVALID_PASSWORD() {
        assertError(() -> RawPassword.of("p".repeat(65)), ErrorCode.INVALID_PASSWORD);
    }

    @Test
    void 로그인용_비밀번호는_검증하지_않고_null은_빈_문자열이다() {
        assertThat(RawPassword.unchecked("abc").value()).isEqualTo("abc");
        assertThat(RawPassword.unchecked(null).value()).isEmpty();
    }

    @Test
    void 문자열로_바꿔도_원문이_드러나지_않는다() {
        assertThat(RawPassword.of("password1").toString()).doesNotContain("password1");
    }
}
```

`backend/src/test/java/com/boardgame/member/domain/FakePasswordEncryptor.java`
```java
package com.boardgame.member.domain;

public class FakePasswordEncryptor implements PasswordEncryptor {

    @Override
    public PasswordHash encrypt(RawPassword password) {
        return new PasswordHash("hashed:" + password.value());
    }

    @Override
    public boolean matches(RawPassword password, PasswordHash hash) {
        return encrypt(password).equals(hash);
    }
}
```

`backend/src/test/java/com/boardgame/member/domain/MemberTest.java`
```java
package com.boardgame.member.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import org.junit.jupiter.api.Test;

class MemberTest {

    private final PasswordEncryptor encryptor = new FakePasswordEncryptor();

    private Member alice() {
        return Member.register(new LoginId("alice01"), new Nickname("앨리스"), RawPassword.of("password1"), encryptor);
    }

    @Test
    void 가입하면_아이디와_닉네임을_가진다() {
        Member member = alice();

        assertThat(member.loginIdValue()).isEqualTo("alice01");
        assertThat(member.nicknameValue()).isEqualTo("앨리스");
    }

    @Test
    void 맞는_비밀번호로_인증된다() {
        Member member = alice();

        member.authenticate(RawPassword.unchecked("password1"), encryptor);
    }

    @Test
    void 틀린_비밀번호는_INVALID_CREDENTIALS() {
        Member member = alice();

        assertError(() -> member.authenticate(RawPassword.unchecked("wrong-password"), encryptor),
                ErrorCode.INVALID_CREDENTIALS);
    }
}
```

`backend/src/test/java/com/boardgame/member/domain/MemberRepositoryTest.java`
```java
package com.boardgame.member.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

@DataJpaTest
class MemberRepositoryTest {

    @Autowired
    private MemberRepository memberRepository;

    private final PasswordEncryptor encryptor = new FakePasswordEncryptor();

    private Member member(String loginId, String nickname) {
        return Member.register(new LoginId(loginId), new Nickname(nickname), RawPassword.of("password1"), encryptor);
    }

    @Test
    void 아이디로_회원을_찾고_가입_시각이_기록된다() {
        memberRepository.saveAndFlush(member("alice01", "앨리스"));

        assertThat(memberRepository.findByCredentialsLoginIdValue("alice01")).hasValueSatisfying(found -> {
            assertThat(found.id()).isNotNull();
            assertThat(found.nicknameValue()).isEqualTo("앨리스");
            assertThat(found.createdAt()).isNotNull();
        });
        assertThat(memberRepository.findByCredentialsLoginIdValue("nobody")).isEmpty();
    }

    @Test
    void 아이디와_닉네임_사용_여부를_확인한다() {
        memberRepository.saveAndFlush(member("alice01", "앨리스"));

        assertThat(memberRepository.existsByCredentialsLoginIdValue("alice01")).isTrue();
        assertThat(memberRepository.existsByCredentialsLoginIdValue("bob01")).isFalse();
        assertThat(memberRepository.existsByNicknameValue("앨리스")).isTrue();
        assertThat(memberRepository.existsByNicknameValue("밥")).isFalse();
    }
}
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest='LoginIdTest,NicknameTest,RawPasswordTest,MemberTest,MemberRepositoryTest'`
Expected: FAIL — `cannot find symbol: class LoginId`

- [ ] **Step 4: 구현**

`backend/src/main/java/com/boardgame/common/persistence/BaseTimeEntity.java`
```java
package com.boardgame.common.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import java.time.LocalDateTime;
import org.hibernate.annotations.CreationTimestamp;

@MappedSuperclass
public abstract class BaseTimeEntity {

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public LocalDateTime createdAt() {
        return createdAt;
    }
}
```

`backend/src/main/java/com/boardgame/member/domain/LoginId.java`
```java
package com.boardgame.member.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.util.Locale;
import java.util.Objects;
import java.util.regex.Pattern;

@Embeddable
public class LoginId {

    private static final Pattern FORMAT = Pattern.compile("^[a-zA-Z0-9]{4,20}$");

    @Column(name = "login_id", nullable = false, unique = true, length = 20)
    private String value;

    protected LoginId() {
    }

    public LoginId(String value) {
        if (value == null || !FORMAT.matcher(value).matches()) {
            throw new BusinessException(ErrorCode.INVALID_LOGIN_ID);
        }
        this.value = value.toLowerCase(Locale.ROOT);
    }

    public String value() {
        return value;
    }

    @Override
    public boolean equals(Object other) {
        if (!(other instanceof LoginId that)) {
            return false;
        }
        return Objects.equals(value, that.value);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(value);
    }
}
```

`backend/src/main/java/com/boardgame/member/domain/Nickname.java`
```java
package com.boardgame.member.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.util.Objects;

@Embeddable
public class Nickname {

    private static final int MIN_LENGTH = 2;
    private static final int MAX_LENGTH = 10;

    @Column(name = "nickname", nullable = false, unique = true, length = MAX_LENGTH)
    private String value;

    protected Nickname() {
    }

    public Nickname(String value) {
        String stripped = stripOrEmpty(value);
        if (stripped.length() < MIN_LENGTH || stripped.length() > MAX_LENGTH) {
            throw new BusinessException(ErrorCode.INVALID_NICKNAME);
        }
        this.value = stripped;
    }

    private static String stripOrEmpty(String value) {
        if (value == null) {
            return "";
        }
        return value.strip();
    }

    public String value() {
        return value;
    }

    @Override
    public boolean equals(Object other) {
        if (!(other instanceof Nickname that)) {
            return false;
        }
        return Objects.equals(value, that.value);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(value);
    }
}
```

`backend/src/main/java/com/boardgame/member/domain/RawPassword.java`
```java
package com.boardgame.member.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;

public final class RawPassword {

    private static final int MIN_LENGTH = 8;
    private static final int MAX_LENGTH = 64;

    private final String value;

    private RawPassword(String value) {
        this.value = value;
    }

    public static RawPassword of(String value) {
        if (value == null || value.length() < MIN_LENGTH || value.length() > MAX_LENGTH) {
            throw new BusinessException(ErrorCode.INVALID_PASSWORD);
        }
        return new RawPassword(value);
    }

    public static RawPassword unchecked(String value) {
        if (value == null) {
            return new RawPassword("");
        }
        return new RawPassword(value);
    }

    public String value() {
        return value;
    }

    @Override
    public String toString() {
        return "RawPassword[****]";
    }
}
```

`backend/src/main/java/com/boardgame/member/domain/PasswordHash.java`
```java
package com.boardgame.member.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.util.Objects;

@Embeddable
public class PasswordHash {

    @Column(name = "password_hash", nullable = false, length = 100)
    private String value;

    protected PasswordHash() {
    }

    public PasswordHash(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    @Override
    public boolean equals(Object other) {
        if (!(other instanceof PasswordHash that)) {
            return false;
        }
        return Objects.equals(value, that.value);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(value);
    }
}
```

`backend/src/main/java/com/boardgame/member/domain/PasswordEncryptor.java`
```java
package com.boardgame.member.domain;

public interface PasswordEncryptor {

    PasswordHash encrypt(RawPassword password);

    boolean matches(RawPassword password, PasswordHash hash);
}
```

`backend/src/main/java/com/boardgame/member/domain/Credentials.java`
```java
package com.boardgame.member.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Embedded;

@Embeddable
public class Credentials {

    @Embedded
    private LoginId loginId;

    @Embedded
    private PasswordHash passwordHash;

    protected Credentials() {
    }

    private Credentials(LoginId loginId, PasswordHash passwordHash) {
        this.loginId = loginId;
        this.passwordHash = passwordHash;
    }

    static Credentials of(LoginId loginId, PasswordHash passwordHash) {
        return new Credentials(loginId, passwordHash);
    }

    void verify(RawPassword password, PasswordEncryptor encryptor) {
        if (!encryptor.matches(password, passwordHash)) {
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }
    }

    String loginIdValue() {
        return loginId.value();
    }
}
```

`backend/src/main/java/com/boardgame/member/domain/Member.java`
```java
package com.boardgame.member.domain;

import com.boardgame.common.persistence.BaseTimeEntity;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "members")
public class Member extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Embedded
    private Credentials credentials;

    @Embedded
    private Nickname nickname;

    protected Member() {
    }

    private Member(Credentials credentials, Nickname nickname) {
        this.credentials = credentials;
        this.nickname = nickname;
    }

    public static Member register(LoginId loginId, Nickname nickname, RawPassword password,
                                  PasswordEncryptor encryptor) {
        PasswordHash hash = encryptor.encrypt(password);
        return new Member(Credentials.of(loginId, hash), nickname);
    }

    public void authenticate(RawPassword password, PasswordEncryptor encryptor) {
        credentials.verify(password, encryptor);
    }

    public Long id() {
        return id;
    }

    public String loginIdValue() {
        return credentials.loginIdValue();
    }

    public String nicknameValue() {
        return nickname.value();
    }
}
```

`backend/src/main/java/com/boardgame/member/domain/MemberRepository.java`
```java
package com.boardgame.member.domain;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberRepository extends JpaRepository<Member, Long> {

    Optional<Member> findByCredentialsLoginIdValue(String loginId);

    boolean existsByCredentialsLoginIdValue(String loginId);

    boolean existsByNicknameValue(String nickname);
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest='LoginIdTest,NicknameTest,RawPasswordTest,MemberTest,MemberRepositoryTest'`
Expected: PASS

- [ ] **Step 6: 전체 회귀 확인 후 커밋**

Run: `mvn -q -f backend/pom.xml test`
Expected: PASS

```bash
git add .gitignore backend
git commit -m "feat: 회원 도메인(아이디, 닉네임, 비밀번호 값 객체와 회원 엔티티)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 세션 로그인과 회원 API

**Files:**
- Modify: `backend/pom.xml`, `ErrorCode.java`, `backend/src/main/java/com/boardgame/BoardGameApplication.java`, `backend/src/main/resources/application.yml`, `backend/src/test/resources/application.yml`
- Create: `backend/src/main/java/com/boardgame/common/security/{LoginMember,SecurityConfig,JsonAuthenticationEntryPoint,SessionLogin}.java`
- Create: `backend/src/main/java/com/boardgame/member/infra/BCryptPasswordEncryptor.java`
- Create: `backend/src/main/java/com/boardgame/member/application/MemberService.java`
- Create: `backend/src/main/java/com/boardgame/member/api/{SignUpRequest,LoginRequest,MemberResponse,MemberController,AuthController}.java`
- Test: `backend/src/test/java/com/boardgame/member/api/AuthApiTest.java`

**Interfaces:**
- Consumes: Task 1 `ErrorResponse.of(ErrorCode)`, `ErrorCode.statusCode()`; Task 2 `Member`, `MemberRepository`, `LoginId`, `Nickname`, `RawPassword`, `PasswordHash`, `PasswordEncryptor`
- Produces (계획 3·5가 사용):
  - `ErrorCode.UNAUTHORIZED`(401), `DUPLICATE_LOGIN_ID`(409), `DUPLICATE_NICKNAME`(409)
  - `record LoginMember(long id, String nickname) implements Principal, Serializable` — `getName()` = `String.valueOf(id)`, `static from(Member)`
  - 세션 인증: 컨트롤러에서 `@AuthenticationPrincipal LoginMember`
  - API
    - `POST /api/members` `{loginId, nickname, password}` → 201 + `Location: /api/members/{id}` + `{id, loginId, nickname}`
    - `POST /api/auth/login` `{loginId, password}` → 200 `{id, loginId, nickname}` + 세션 쿠키
    - `POST /api/auth/logout` → 204
    - `GET /api/members/me` → 200 `{id, loginId, nickname}` / 미로그인 401 `UNAUTHORIZED`
  - `/api/**`는 위 두 POST를 빼고 모두 인증 필요, 그 외 경로(`/h2-console/**` 등)는 허용

- [ ] **Step 1: 의존성·설정 추가**

`backend/pom.xml` — `mysql-connector-j` 의존성 아래에 추가:
```xml
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
```
그리고 `spring-boot-starter-test` 의존성 아래에 추가:
```xml
        <dependency>
            <groupId>org.springframework.security</groupId>
            <artifactId>spring-security-test</artifactId>
            <scope>test</scope>
        </dependency>
```

`backend/src/main/resources/application.yml`과 `backend/src/test/resources/application.yml` — 두 파일 모두 `server.servlet` 아래에 세션 설정을 추가해 `server:` 블록을 다음으로 만든다:
```yaml
server:
  servlet:
    encoding:
      charset: UTF-8
      force: true
    session:
      timeout: 7d
      cookie:
        http-only: true
        same-site: lax
```

`ErrorCode.java` — `INVALID_LOGIN_ID(` 줄 바로 위에 추가:
```java
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."),
    DUPLICATE_LOGIN_ID(HttpStatus.CONFLICT, "이미 사용 중인 아이디입니다."),
    DUPLICATE_NICKNAME(HttpStatus.CONFLICT, "이미 사용 중인 닉네임입니다."),
```

`BoardGameApplication.java` — 기본 생성 사용자(로그에 임시 비밀번호 출력)를 끄기 위해 애너테이션을 교체:
```java
package com.boardgame;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class BoardGameApplication {

    public static void main(String[] args) {
        SpringApplication.run(BoardGameApplication.class, args);
    }
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`backend/src/test/java/com/boardgame/member/api/AuthApiTest.java`
```java
package com.boardgame.member.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.member.domain.MemberRepository;
import com.boardgame.member.domain.PasswordEncryptor;
import com.boardgame.member.domain.RawPassword;
import com.boardgame.member.domain.PasswordHash;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private PasswordEncryptor passwordEncryptor;

    private ResultActions signUp(String loginId, String nickname, String password) throws Exception {
        return mockMvc.perform(post("/api/members")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"loginId": "%s", "nickname": "%s", "password": "%s"}
                        """.formatted(loginId, nickname, password)));
    }

    private ResultActions login(String loginId, String password) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"loginId": "%s", "password": "%s"}
                        """.formatted(loginId, password)));
    }

    private MockHttpSession loggedInSession(String loginId, String password) throws Exception {
        MvcResult result = login(loginId, password).andExpect(status().isOk()).andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    @Test
    void 회원가입하면_201과_회원_정보를_돌려주고_비밀번호는_보이지_않는다() throws Exception {
        signUp("alice01", "앨리스", "password1")
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", startsWith("/api/members/")))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.loginId").value("alice01"))
                .andExpect(jsonPath("$.nickname").value("앨리스"))
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    void 비밀번호는_BCrypt_해시로_저장된다() throws Exception {
        signUp("alice01", "앨리스", "password1").andExpect(status().isCreated());

        assertThat(memberRepository.findByCredentialsLoginIdValue("alice01")).hasValueSatisfying(member ->
                member.authenticate(RawPassword.unchecked("password1"), passwordEncryptor));
        PasswordHash hash = passwordEncryptor.encrypt(RawPassword.of("password1"));
        assertThat(hash.value()).startsWith("$2").isNotEqualTo("password1");
    }

    @Test
    void 같은_아이디로는_가입할_수_없다() throws Exception {
        signUp("alice01", "앨리스", "password1");

        signUp("ALICE01", "다른사람", "password1")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.code").value("DUPLICATE_LOGIN_ID"))
                .andExpect(jsonPath("$.message").value("이미 사용 중인 아이디입니다."));
    }

    @Test
    void 같은_닉네임으로는_가입할_수_없고_앞뒤_공백도_같은_닉네임이다() throws Exception {
        signUp("alice01", "앨리스", "password1");

        signUp("bob01", " 앨리스 ", "password1")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_NICKNAME"));
    }

    @Test
    void 형식이_잘못된_값은_400과_항목별_코드로_응답한다() throws Exception {
        signUp("ab", "앨리스", "password1")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_LOGIN_ID"));
        signUp("alice01", "가", "password1")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_NICKNAME"));
        signUp("alice01", "앨리스", "short")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PASSWORD"));
    }

    @Test
    void 깨진_JSON으로_가입하면_INVALID_INPUT() throws Exception {
        mockMvc.perform(post("/api/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"loginId\": "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void 로그인하면_세션으로_내_정보를_조회한다() throws Exception {
        signUp("alice01", "앨리스", "password1");

        login("alice01", "password1")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.loginId").value("alice01"))
                .andExpect(jsonPath("$.nickname").value("앨리스"));
        MockHttpSession session = loggedInSession("alice01", "password1");

        mockMvc.perform(get("/api/members/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.loginId").value("alice01"))
                .andExpect(jsonPath("$.nickname").value("앨리스"));
    }

    @Test
    void 대문자로_가입해도_소문자_아이디로_로그인된다() throws Exception {
        signUp("Alice01", "앨리스", "password1");

        login("alice01", "password1").andExpect(status().isOk());
        login("ALICE01", "password1").andExpect(status().isOk());
    }

    @Test
    void 비밀번호가_틀리거나_아이디가_없으면_INVALID_CREDENTIALS() throws Exception {
        signUp("alice01", "앨리스", "password1");

        login("alice01", "wrong-password")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
        login("nobody", "password1")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void 로그인할_때_짧거나_빈_비밀번호도_INVALID_CREDENTIALS() throws Exception {
        signUp("alice01", "앨리스", "password1");

        login("alice01", "x")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
        login("alice01", "")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void 로그인하지_않으면_API는_JSON_401이다() throws Exception {
        mockMvc.perform(get("/api/members/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.message").value("로그인이 필요합니다."));
    }

    @Test
    void 로그아웃하면_같은_세션으로_더_이상_조회할_수_없다() throws Exception {
        signUp("alice01", "앨리스", "password1");
        MockHttpSession session = loggedInSession("alice01", "password1");

        mockMvc.perform(post("/api/auth/logout").session(session))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/members/me").session(session))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }
}
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest=AuthApiTest`
Expected: FAIL — `No qualifying bean of type 'com.boardgame.member.domain.PasswordEncryptor'` 또는 엔드포인트 미존재로 다수 실패

- [ ] **Step 4: 보안·인증 구현**

`backend/src/main/java/com/boardgame/common/security/LoginMember.java`
```java
package com.boardgame.common.security;

import com.boardgame.member.domain.Member;
import java.io.Serializable;
import java.security.Principal;

public record LoginMember(long id, String nickname) implements Principal, Serializable {

    public static LoginMember from(Member member) {
        return new LoginMember(member.id(), member.nicknameValue());
    }

    @Override
    public String getName() {
        return String.valueOf(id);
    }
}
```

`backend/src/main/java/com/boardgame/common/security/JsonAuthenticationEntryPoint.java`
```java
package com.boardgame.common.security;

import com.boardgame.common.error.ErrorCode;
import com.boardgame.common.error.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

@Component
public class JsonAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public JsonAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException exception) throws IOException {
        ErrorCode errorCode = ErrorCode.UNAUTHORIZED;
        response.setStatus(errorCode.statusCode());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        objectMapper.writeValue(response.getWriter(), ErrorResponse.of(errorCode));
    }
}
```

`backend/src/main/java/com/boardgame/common/security/SessionLogin.java`
```java
package com.boardgame.common.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;

@Component
public class SessionLogin {

    private final SecurityContextRepository securityContextRepository;

    public SessionLogin(SecurityContextRepository securityContextRepository) {
        this.securityContextRepository = securityContextRepository;
    }

    public void establish(LoginMember member, HttpServletRequest request, HttpServletResponse response) {
        renewSessionIdIfPresent(request);
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(member, null, List.of()));
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
    }

    private void renewSessionIdIfPresent(HttpServletRequest request) {
        if (request.getSession(false) == null) {
            return;
        }
        request.changeSessionId();
    }
}
```

`backend/src/main/java/com/boardgame/common/security/SecurityConfig.java`
```java
package com.boardgame.common.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   SecurityContextRepository securityContextRepository,
                                                   JsonAuthenticationEntryPoint authenticationEntryPoint)
            throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .headers(headers -> headers.frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin))
                .securityContext(context -> context.securityContextRepository(securityContextRepository))
                .exceptionHandling(handling -> handling.authenticationEntryPoint(authenticationEntryPoint))
                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")
                        .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(HttpMethod.POST, "/api/members", "/api/auth/login").permitAll()
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll());
        return http.build();
    }
}
```

`backend/src/main/java/com/boardgame/member/infra/BCryptPasswordEncryptor.java`
```java
package com.boardgame.member.infra;

import com.boardgame.member.domain.PasswordEncryptor;
import com.boardgame.member.domain.PasswordHash;
import com.boardgame.member.domain.RawPassword;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class BCryptPasswordEncryptor implements PasswordEncryptor {

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    @Override
    public PasswordHash encrypt(RawPassword password) {
        return new PasswordHash(encoder.encode(password.value()));
    }

    @Override
    public boolean matches(RawPassword password, PasswordHash hash) {
        return encoder.matches(password.value(), hash.value());
    }
}
```

- [ ] **Step 5: 회원 서비스와 API 구현**

`backend/src/main/java/com/boardgame/member/api/SignUpRequest.java`
```java
package com.boardgame.member.api;

public record SignUpRequest(String loginId, String nickname, String password) {
}
```

`backend/src/main/java/com/boardgame/member/api/LoginRequest.java`
```java
package com.boardgame.member.api;

public record LoginRequest(String loginId, String password) {
}
```

`backend/src/main/java/com/boardgame/member/api/MemberResponse.java`
```java
package com.boardgame.member.api;

import com.boardgame.member.domain.Member;

public record MemberResponse(long id, String loginId, String nickname) {

    public static MemberResponse from(Member member) {
        return new MemberResponse(member.id(), member.loginIdValue(), member.nicknameValue());
    }
}
```

`backend/src/main/java/com/boardgame/member/application/MemberService.java`
```java
package com.boardgame.member.application;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.member.api.LoginRequest;
import com.boardgame.member.api.SignUpRequest;
import com.boardgame.member.domain.LoginId;
import com.boardgame.member.domain.Member;
import com.boardgame.member.domain.MemberRepository;
import com.boardgame.member.domain.Nickname;
import com.boardgame.member.domain.PasswordEncryptor;
import com.boardgame.member.domain.RawPassword;
import java.util.Locale;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncryptor passwordEncryptor;

    public MemberService(MemberRepository memberRepository, PasswordEncryptor passwordEncryptor) {
        this.memberRepository = memberRepository;
        this.passwordEncryptor = passwordEncryptor;
    }

    @Transactional
    public Member register(SignUpRequest request) {
        LoginId loginId = new LoginId(request.loginId());
        Nickname nickname = new Nickname(request.nickname());
        RawPassword password = RawPassword.of(request.password());
        validateUnique(loginId, nickname);
        return memberRepository.save(Member.register(loginId, nickname, password, passwordEncryptor));
    }

    public Member authenticate(LoginRequest request) {
        String loginId = Objects.toString(request.loginId(), "").toLowerCase(Locale.ROOT);
        Member member = memberRepository.findByCredentialsLoginIdValue(loginId)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_CREDENTIALS));
        member.authenticate(RawPassword.unchecked(request.password()), passwordEncryptor);
        return member;
    }

    public Member find(long id) {
        return memberRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
    }

    private void validateUnique(LoginId loginId, Nickname nickname) {
        if (memberRepository.existsByCredentialsLoginIdValue(loginId.value())) {
            throw new BusinessException(ErrorCode.DUPLICATE_LOGIN_ID);
        }
        if (memberRepository.existsByNicknameValue(nickname.value())) {
            throw new BusinessException(ErrorCode.DUPLICATE_NICKNAME);
        }
    }
}
```

`backend/src/main/java/com/boardgame/member/api/MemberController.java`
```java
package com.boardgame.member.api;

import com.boardgame.common.security.LoginMember;
import com.boardgame.member.application.MemberService;
import com.boardgame.member.domain.Member;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/members")
public class MemberController {

    private final MemberService memberService;

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @PostMapping
    public ResponseEntity<MemberResponse> signUp(@RequestBody SignUpRequest request) {
        Member member = memberService.register(request);
        MemberResponse response = MemberResponse.from(member);
        return ResponseEntity.created(URI.create("/api/members/" + response.id())).body(response);
    }

    @GetMapping("/me")
    public MemberResponse me(@AuthenticationPrincipal LoginMember loginMember) {
        return MemberResponse.from(memberService.find(loginMember.id()));
    }
}
```

`backend/src/main/java/com/boardgame/member/api/AuthController.java`
```java
package com.boardgame.member.api;

import com.boardgame.common.security.LoginMember;
import com.boardgame.common.security.SessionLogin;
import com.boardgame.member.application.MemberService;
import com.boardgame.member.domain.Member;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final MemberService memberService;
    private final SessionLogin sessionLogin;

    public AuthController(MemberService memberService, SessionLogin sessionLogin) {
        this.memberService = memberService;
        this.sessionLogin = sessionLogin;
    }

    @PostMapping("/login")
    public MemberResponse login(@RequestBody LoginRequest request,
                                HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        Member member = memberService.authenticate(request);
        sessionLogin.establish(LoginMember.from(member), httpRequest, httpResponse);
        return MemberResponse.from(member);
    }
}
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest='AuthApiTest,GlobalExceptionHandlerTest'`
Expected: PASS (`GlobalExceptionHandlerTest`의 `/test/**` 경로는 보안 설정상 허용이므로 그대로 통과)

- [ ] **Step 7: 전체 회귀 확인 후 커밋**

Run: `mvn -q -f backend/pom.xml test`
Expected: PASS

```bash
git add backend
git commit -m "feat: 세션 로그인과 회원가입·로그아웃·내 정보 API" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## 계획 2 완료 기준

- `mvn -q -f backend/pom.xml test` 전체 통과
- 스펙 §6.1(아이디·닉네임·비밀번호 규칙, BCrypt), §2(세션 인증, H2/MySQL 준비), §8(통일 에러 응답, 전역 핸들러, 401 JSON)이 테스트로 검증됨
- `mvn -f backend/pom.xml spring-boot:run` 후 `curl`로 가입·로그인 가능 (선택 확인)
- 다음: 계획 3(방 + 실시간 진행) 문서 작성. 메모리 `plan3-handoff-notes`의 규칙과 `LoginMember.getName()` = 회원 id를 반영
