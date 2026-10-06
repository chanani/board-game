# 🌿 보드게임 라운지

지인들과 웹에서 함께하는 보드게임. 첫 게임은 **페이퍼 사파리**(2~5인).

## 기능
- 아이디/비밀번호 회원가입·로그인 (세션 쿠키)
- 같은 아이디 중복 로그인 차단: 새로 로그인하면 이전 접속이 끊기고 "다른 곳에서 로그인해서 로그아웃됐어요." 안내
- 게임 목록: 게임별 대기 인원·플레이 인원 표시(1초마다 갱신), 7장짜리 규칙 보기 슬라이드(버튼·←/→ 키·스와이프)
- 게임 로비: 방 만들기(최대 인원 2~5명 선택, 비공개방 비밀번호), 기다리는 방·게임 중인 방 목록(1초마다 갱신), 6자리 방 코드로 입장, 내 전적 요약, 순위표 TOP 5
- 비공개방(🔒): 참가·코드 입장 시 비밀번호 확인, 관전 불가
- 관전: 게임 중인 공개방을 관전하기로 들어가 공개된 정보만 보기(👀 관전 인원 표시), 게임이 끝나면 자리에 앉기
- 방에 있어도 게임 목록·로비·전적을 자유롭게 보고, 아래 "참여 중인 방으로 돌아가기" 바로 복귀
- 대기실: 테이블 의자 배치, 접속 상태, 방장 시작, 60초 이상 끊긴 사람 내보내기, 규칙 요약
- 실시간 게임(STOMP WebSocket): 서버가 규칙을 판정하고 각자에게 자기 시점 화면만 전송
- 원목·펠트 입체 테이블, 직접 그린 동물 카드 14종, 카드가 날아가고 뒤집히는 애니메이션, 상대 판을 눌러 크게 보기(예상 점수 포함)
- 효과음(상단바 스피커 버튼으로 끄기), 시스템 '동작 줄이기' 설정 존중
- 단판 규칙: 누군가 6장을 모두 공개하면 즉시 끝나고, 합이 가장 낮은 사람이 1승(최저점이 동점이면 무승부). 버린 카드 더미에서 가져온 카드는 되돌리기 가능
- 결과 창: 카드 순차 공개 → 점수 → 승자 또는 무승부, "다음 게임 준비"로 바로 준비
- 전적: 게임 승·무·패, 승률, 평균 점수, 최근 경기 10개, 순위표(5판 이상)

## 바로 실행 (Docker)
```bash
docker compose up -d --build
# http://localhost:8000
```
- 첫 시작은 1분 정도 걸릴 수 있습니다. 준비될 때까지 기다리려면 `docker compose up -d --build --wait`
- 외부에 공개하기 전에 `DB_PASSWORD` / `DB_ROOT_PASSWORD`를 직접 지정하세요. 이 값은 MySQL 볼륨을 처음 만들 때만 적용되며, 나중에 바꾸려면 `docker compose down -v`(데이터 삭제)가 필요합니다.
- 다른 포트: `PORT=9000 docker compose up -d --build`
- HTTPS 리버스 프록시 뒤에서 운영할 때: `COOKIE_SECURE=true`, `ALLOWED_ORIGINS=https://your.domain` 지정
- 종료: `docker compose down` (데이터 유지) / `docker compose down -v` (DB 삭제)

## 개발 환경에서 실행
필요: Java 21, Maven 3.9+, Node 24

한 번에 켜기/끄기 (백엔드 8899 + 프론트엔드 5177):
```bash
./start.sh   # → http://localhost:5177  (Ctrl+C로 종료)
./stop.sh    # 다른 터미널에서 종료할 때
```
- 포트가 사용 중이면 다음 빈 포트를 자동으로 씁니다. 실제 포트는 시작 메시지와 `.logs/server.state`에 있어요.
- 포트 지정: `BACKEND_PORT=9090 FRONTEND_PORT=3000 ./start.sh`
- 로그: `.logs/backend.log`, `.logs/frontend.log`

따로 켜기:
```bash
# 백엔드 (포트 8899, H2 파일 DB: backend/data/)
mvn -f backend/pom.xml spring-boot:run
# H2 콘솔이 필요하면: mvn -f backend/pom.xml spring-boot:run -Dspring-boot.run.profiles=local  → http://localhost:8899/h2-console

# 프론트엔드 (다른 터미널, 포트 5177)
npm --prefix frontend install
npm --prefix frontend run dev
# http://localhost:5177  (/api, /ws 는 8899로 프록시)
```
친구 두 명을 한 컴퓨터에서 흉내 내려면 `http://localhost:5177`와 `http://127.0.0.1:5177`을 각각 다른 계정으로 여세요(쿠키가 분리됩니다).

## 테스트
```bash
mvn -f backend/pom.xml test
npm --prefix frontend test
```

## 구조
- `backend/` Spring Boot 3.5 (Java 21): `papersafari`(규칙 엔진), `game`(게임 공통 계약·이벤트), `room`(방·실시간), `member`(회원), `record`(전적)
- `frontend/` React 19 + Vite + Tailwind
- `docs/superpowers/` 설계 스펙과 구현 계획
