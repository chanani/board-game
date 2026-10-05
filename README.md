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
