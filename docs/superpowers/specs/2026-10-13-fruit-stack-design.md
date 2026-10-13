# 과일 쌓기(같은 과일 합치기, 각자 판 점수 대결) 게임 추가 설계

- 작성일: 2026-10-13
- 기반: feat/fruit-stack d12bcbf
- 참고: `docs/superpowers/research/game-integration.md`(게임이 플랫폼에 붙는 구조. 코드보다 오래되어 다른 곳은 코드를 따랐다), `docs/superpowers/specs/2026-10-07-old-maid-design.md`(구조·번호 체계의 본보기, 가벼운 신호 경로의 원본)
- 사용자 승인 설계(바꿀 수 없음): 게임 종류 `FRUIT_STACK`, 이름 "과일 쌓기"(화면 어디에도 "수박게임"이라고 쓰지 않는다), 방에서 2~5명이 각자 자기 판으로 점수를 겨룸, 컴퓨터 없음(빈자리 메뉴는 "친구 초대"만, 서버도 거절), 과일 11단계(체리~수박), 같은 과일 두 개가 닿으면 다음 단계로 합쳐지며 점수, 떨어뜨릴 과일은 작은 5단계에서, 과일이 위쪽 선을 2초 넘게 넘으면 탈락, 모두 탈락하면 최고 점수가 승리(최고 점수 동점자는 무승부, 나머지 패배), 살아 있는 사람이 한 명만 남고 그 사람 점수가 다른 모두보다 높으면 그 순간 끝(2026-10-13 사용자 결정, R26), 10초 안에 안 떨어뜨리면 자동으로 떨어짐, 한 경기 최대 10분(상한이면 지금 점수로 끝), 내 판은 크게 가운데(끌어서 자리, 놓으면 떨어짐, 다음 과일 미리보기), 상대는 작은 실시간 판과 점수(초당 약 4번 갱신 + 사이 보간), 탈락하면 남은 사람의 판을 크게 봄, 시작 카운트다운·"게임 끝!"·감정 표현·결과 창은 있는 것을 씀, 물리는 브라우저마다 `matter-js`, 서버는 씨앗 하나만 보내고 모두 같은 과일 순서를 만듦, 점수는 합칠 때마다 브라우저가 보고하고 서버는 줄어들거나 말이 안 되게 뛴 점수만 거절, 상대 판은 도둑잡기 고르는 카드 신호 같은 가벼운 신호(서버는 중계만, 저장 안 함), 잠깐 끊겨도 내 판은 멈추지 않음, 판 상태를 1초마다 브라우저에 저장해 새로고침해도 이어 함, 60초 넘게 끊기면 지금처럼 기권, 전적은 승·무·패와 평균 점수.
- 받아들인 한계(승인됨): 점수는 브라우저가 보고하므로 조작할 수 있다. 물리 결과는 기기마다 조금 다르다. 과일이 많을 때의 휴대폰 성능은 만들면서 확인한다.
- 승인 설계가 열어 둔 세부는 이 문서에서 정했고, 결정과 이유는 11장(`D#`)에 모았다.

## 0. 공통 원칙

- 화면에 이모지 금지. 과일 그림·아이콘은 모두 우리가 그린 인라인 SVG(장식은 `aria-hidden`). `F/noEmoji.test.ts`가 지킨다.
- 화면 문구는 한국어, 기존 말투("~해요", "~하세요").
- 휴대폰 세로(360px부터)·휴대폰 가로(눕힌 화면)·PC 세 배치(`useTableLayout`: `portrait | landscape | pc`). PC 1280×860에서 스크롤 없이 한 화면에 들어간다.
- 동작 줄이기(`MotionConfig reducedMotion="user"`, `useReducedMotion`)면 꾸밈 효과(합칠 때 번쩍임, 위험 선 깜박임, 상대 판 보간)를 끈다. 과일이 떨어지고 구르는 물리 자체는 게임이라 그대로 보인다.
- 백엔드 Java는 `/Users/ichanhan/CLAUDE.md` 객체지향 생활 체조(들여쓰기 1단계, else 금지, 원시값 VO, 한 줄에 점 하나, 일급 컬렉션, 도메인에 로직·setter 없음, 필드 3개 이하)와 `RuntimeException`을 상속한 `BusinessException` + `@RestControllerAdvice`·STOMP 오류 큐의 통일 오류 응답(`{status, code, message}`)을 지킨다. 화면으로 나가는 record(`view/*`)는 `OldMaidView`처럼 필드 수 제한의 예외다.
- 페이퍼 사파리·우노·도둑잡기 동작은 바꾸지 않는다. 공통 부품을 넓힐 때(5장) 무엇을 넓히는지 적었고, 기존 테스트가 그대로 통과해야 한다.
- 표기: 백엔드 루트 `B/` = `backend/src/main/java/com/boardgame/`, 프론트 루트 `F/` = `frontend/src/`.

## 1. 개요와 목표

- 플랫폼에 네 번째 게임 "과일 쌓기"를 더한다. 게임 선반·로비·방·대기실·준비·채팅·관전·테마·프로필 그림·효과음·시작 카운트다운·자동 기권·전적·순위·전적 창이 다른 게임과 똑같이 동작한다.
- 차례가 없다. 참가자 모두가 동시에 자기 판에서 과일을 떨어뜨리고, 서로의 판은 구경만 한다(방해·공격 없음).
- 물리(과일이 떨어지고 구르고 합쳐지는 것)는 각자의 브라우저에서 돈다. 서버는 물리를 모른다. 서버가 아는 것은 씨앗, 사람마다 보고한 점수, 누가 탈락·기권했는지, 경기 시작 시각뿐이다.
- 숨은 정보가 없다. 화면(`view`)은 보는 사람 id만 다르고 모두에게 같다.
- 과일 그림 11가지는 우리가 직접 그린 SVG다. 다른 게임의 과일 그림·이름·배색을 베끼지 않는다.

## 2. 규칙(구현 기준)

규칙 번호 `R#`은 테스트 이름과 코드 주석에서 그대로 쓴다. 길이는 물리 단위(판 폭 360 기준), 시간은 ms다.

### 2.1 판과 과일

- **R1 판**: 폭 360, 높이 540(2:3). 왼쪽 위가 (0, 0), 아래로 y가 커진다. 벽은 움직이지 않는 사각형 3개(두께 40): 왼쪽(중심 x = -20), 오른쪽(중심 x = 380), 바닥(중심 y = 560). 천장은 없다. 위쪽 선(`LINE_Y`)은 y = 90. 들고 있는 과일과 떨어뜨리는 높이(`DROP_Y`)는 과일 중심 y = 45.
- **R2 과일 11단계**: 모두 원이다. 단계(`level`) 1~11.

| 단계 | 이름 | 반지름 | 이 과일 두 개를 합칠 때 점수 | 몸 색 |
|---|---|---|---|---|
| 1 | 체리 | 11 | 1 | `#E23D4F` |
| 2 | 딸기 | 15 | 3 | `#F2617A` |
| 3 | 포도 | 20 | 6 | `#8E5BD0` |
| 4 | 귤 | 24 | 10 | `#F59A23` |
| 5 | 감 | 30 | 15 | `#F0762B` |
| 6 | 사과 | 37 | 21 | `#D83A34` |
| 7 | 배 | 44 | 28 | `#D9D36A` |
| 8 | 복숭아 | 52 | 36 | `#F7A8B8` |
| 9 | 파인애플 | 60 | 45 | `#F2C230` |
| 10 | 멜론 | 70 | 55 | `#9BD36B` |
| 11 | 수박 | 80 | 66 | `#3FA34D` |

- **R3 물리 값(`matter-js`)**: 고정 걸음 1000/60 ms(`STEP_MS`). 중력 `{ x: 0, y: 1, scale: 0.001 }`. `positionIterations` 8, `velocityIterations` 6, `enableSleeping` false(잠든 과일은 합쳐지지 않는다). 과일: `restitution` 0.15, `friction` 0.3, `frictionStatic` 0.5, `frictionAir` 0.01, `density` 0.001. 벽: `isStatic`, `friction` 0.3, `restitution` 0. `Matter.Render`·`Matter.Runner`·`Matter.Mouse`는 쓰지 않는다(걸음은 우리가 직접 `Engine.update(engine, STEP_MS)`로 밟는다).

### 2.2 떨어뜨리기

- **R4 씨앗과 과일 순서**: 서버가 경기마다 씨앗(`seed`, 0 이상 2147483647 이하 정수) 하나를 정해 화면에 싣는다. `n`번째(0부터) 떨어뜨릴 과일의 단계는 씨앗과 `n`만으로 정해지는 순수 함수 `levelAt(seed, n)`이다(mulberry32의 `n`번째 출력). 모든 브라우저가 아래 그대로 계산한다.

```ts
export function levelAt(seed: number, n: number): number {
  let t = (seed + Math.imul(n + 1, 0x6D2B79F5)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (((t ^ (t >>> 14)) >>> 0) % 5) + 1;
}
```

  확인 값: `seed = 0` → 4, 3, 2, 5, 2, 1, 1, 3, 1, 4, 4, 5. `seed = 12345` → 5, 5, 1, 3, 2, 3, 1, 4, 3, 3, 1, 2. `seed = 2147483647` → 3, 1, 1, 1, 3, 2, 5, 4, 1, 2, 2, 3. 참가자 모두 같은 순서로 받는다(판마다 떨어뜨린 횟수가 달라도 `n`번째는 같다).
- **R5 들고 있는 과일과 조준**: 판마다 "들고 있는 과일"(`held`, 단계 = `levelAt(seed, dropIndex)`)이 있거나 없다. 조준 x(`aimX`)는 처음 180이고, 들고 있는 과일의 반지름 `r`에 대해 늘 `[r, 360 - r]`로 자른다. 들고 있는 과일은 물리 세계에 없고 (`aimX`, 45)에 그림만 그린다. 다음 과일 미리보기는 `levelAt(seed, dropIndex + 1)`이다.
- **R6 떨어뜨리기와 쿨다운**: 들고 있는 과일이 있을 때만 떨어뜨릴 수 있다. 떨어뜨리면 (`aimX`, 45)에 속도 0, 각도 0인 과일을 물리 세계에 넣고 `dropIndex`를 1 올리며 들고 있는 과일이 없어진다. 그로부터 판의 시계(R15)로 500 ms(`DROP_COOLDOWN_MS`)가 지나면 다음 과일을 든다. 경기 시작(판의 시계 0)에는 바로 첫 과일을 든다.
- **R7 자동 떨어뜨리기**: 과일을 든 순간부터 판의 시계로 10000 ms(`AUTO_DROP_MS`)가 지나도록 떨어뜨리지 않으면 지금 `aimX`에 저절로 떨어진다(R6과 같은 처리). 그래서 떨어뜨리는 간격은 길어도 10.5초다.

### 2.3 합치기와 점수

- **R8 합치기**: 한 걸음을 밟은 뒤, 그 걸음에 닿기 시작했거나 닿아 있는(`collisionStart`, `collisionActive`) 쌍 가운데 두 물체가 모두 과일이고 단계가 같은 쌍을 엔진이 알려 준 순서로 본다. 한 걸음에서 과일 하나는 한 번만 합쳐진다(이미 쓰인 과일이 낀 쌍은 건너뛴다). 합쳐지면 두 과일을 없애고, 단계가 10 이하면 두 중심의 가운데(x는 새 반지름 `r`로 `[r, 360 - r]`에 자른다)에 속도 0, 각도 0인 다음 단계 과일을 넣는다. 새 과일은 태어날 때부터 "착지함"(R11)이다.
- **R9 수박 두 개**: 단계 11 두 개가 닿으면 둘 다 사라지고 새 과일은 생기지 않는다(점수 66).
- **R10 점수**: 합칠 때마다 R2 표의 점수(`level × (level + 1) / 2`)를 판의 점수에 더한다. 떨어뜨리기만으로는 점수가 없다. 점수는 0에서 시작하고 줄지 않는다.
- **R11 착지**: 떨어뜨린 과일은 "착지 안 함"으로 시작하고, 다른 과일이나 바닥에 처음 닿는(`collisionStart`) 걸음에 "착지함"이 된다(옆 벽만 스친 것은 착지가 아니다).

### 2.4 탈락

- **R12 선 넘김**: 걸음마다, 착지한 과일 가운데 윗끝(`y - r`)이 90보다 위(작음)인 것이 하나라도 있으면 선 넘김 시간(`overMs`)에 `STEP_MS`를 더하고, 없으면 0으로 되돌린다. `overMs`가 2000(`OVER_LINE_MS`)을 넘는 걸음에 그 판은 탈락이다. 들고 있는 과일과 아직 착지하지 않은 과일은 세지 않는다.
- **R13 탈락 처리**: 탈락한 판은 그 걸음에서 멈춘다(더 걷지 않고, 더 떨어뜨리지 않고, 점수도 그대로). 브라우저는 곧바로 서버에 탈락을 보고한다(R20). 탈락한 사람은 방에 남아 남은 사람의 판을 크게 본다(6.4).
- **R14 판 밖으로 빠진 과일**: 걸음 뒤 중심 y가 640을 넘은 과일(바닥을 뚫은 물리 오류)은 점수 없이 없앤다.

### 2.5 시간

- **R15 판의 시계는 경기 경과 시간을 따라간다**: 판마다 시뮬레이션 시각(`simMs`, 밟은 걸음 수 × `STEP_MS`)이 있다. 브라우저는 서버 화면의 `startedAt`·`serverNow`로 "경기가 시작한 내 시계 시각"(`startLocal = 받은 시각 - (serverNow - startedAt)`, 화면을 받을 때마다 다시 셈해 가장 이른 값을 쓴다)을 구하고, 경기 경과 시간(`elapsed = Date.now() - startLocal`, 0 미만이면 0)까지 `simMs`가 따라가도록 걸음을 밟는다. R6·R7·R12의 시간은 모두 판의 시계다. 탭이 가려지거나 연결이 끊겨도 경과 시간은 흐르므로 판은 멈추지 않는다: 가려진 동안에는 1000 ms 타이머로 밟고, 타이머까지 멈추는 환경(휴대폰 백그라운드)이면 돌아왔을 때 밀린 만큼 한꺼번에 따라잡는다(그동안의 자동 떨어뜨리기 R7도 그대로 일어난다). 새로고침·다른 기기로 들어와 저장된 판이 없을 때도 같은 규칙으로 처음(0)부터 지금까지 따라잡는다.
- **R16 걸음 상한과 따라잡기**: 한 번의 틱(화면이 보이면 `requestAnimationFrame`, 가려지면 1000 ms 타이머)에 밟는 걸음은 많아야 300걸음(5초 분량)이고, 화면이 보일 때는 한 틱에 걸음 밟기로 쓰는 실제 시간이 12 ms를 넘으면 그 틱은 거기서 멈춘다. 남은 밀림은 다음 틱이 잇는다. 밀림(`elapsed - simMs`)이 1000 ms를 넘는 동안은 "따라잡는 중…" 알약을 판 위에 띄우고 조준·떨어뜨리기 입력을 받지 않는다(자동 떨어뜨리기는 일어난다). 느린 기기에서 걸음이 실제 시간을 못 따라가면 판이 느리게 흐를 뿐이고(타이머도 함께 느려진다) 경기 상한(R17)이 끝을 보장한다.
- **R17 경기 상한 10분**: 서버 시계로 경기 시작에서 600000 ms(`MATCH_LIMIT`)가 지나면 서버가 지금 점수로 경기를 끝낸다(끝난 이유 `TIME_UP`). 이 시각이 세션의 유일한 마감(`deadline`)이다.

### 2.6 점수·탈락 보고(행동, `/app/rooms/{code}/actions`)

- **R18 점수 보고(`SCORE`)**: 합쳐져 내 점수가 서버가 아는 내 점수(가장 최근 화면의 내 `score`)보다 커지면 브라우저가 `SCORE { score: 지금 총점 }`을 보낸다. 마지막으로 보낸 지 500 ms(`SCORE_REPORT_GAP_MS`)가 안 되었으면 500 ms가 될 때 그때의 총점을 한 번 보낸다(앞 가장자리 + 뒤 가장자리, 사이의 합치기는 총점 하나로 묶인다). 경기 경과 시간이 597000 ms 이상이면 묶지 않고 합칠 때마다 바로 보낸다. 보고는 늘 누적 총점이라 하나를 건너뛰어도 다음 보고가 덮는다. (D5)
- **R19 서버 검증**: 서버는 `SCORE`·`OUT`의 `score`를 차례로 본다. 없거나 음수면 `INVALID_INPUT`. 보낸 사람이 이미 탈락했으면 `FRUIT_STACK_SCORE_REJECTED`. 서버가 아는 그 사람 점수보다 작으면(줄어듦) `FRUIT_STACK_SCORE_REJECTED`. 점수 상한 `22 × (경과 ms ÷ 500의 몫 + 5)`(경과 = 서버가 받은 시각 - 경기 시작 시각)를 넘으면 `FRUIT_STACK_SCORE_REJECTED`. 통과하면 그 사람 점수를 그 값으로 바꾼다(같은 값이면 그대로 두고 받아들인다). 거절된 보고는 점수를 바꾸지 않는다. 받아들인 `SCORE` 뒤에도 끝 조건(R26)을 본다. (D6)
- **R20 탈락 보고(`OUT`)**: 내 판이 탈락하면(R13) 브라우저가 `OUT { score: 마지막 총점 }`을 묶지 않고 바로 보낸다. 서버는 R19로 점수를 받아들인 뒤 그 사람을 탈락(`OUT`)으로 바꾸고 끝 조건(R26)을 본다.
- **R21 맞추기와 끊김**: 브라우저는 화면을 받을 때마다 내 판과 서버를 맞춘다. (1) 내 점수 = max(내 점수, 화면의 내 점수). (2) 화면에서 내가 `OUT`인데 내 판이 살아 있으면 내 판을 탈락으로 멈춘다. (3) 내 판은 탈락인데 화면에서 내가 `PLAYING`이면 `OUT`을 보낸다(화면이 `OUT`이 될 때까지 1000 ms에 한 번까지). (4) 내 점수가 화면의 내 점수보다 크면 R18로 `SCORE`를 보낸다. 연결이 끊긴 동안에는 아무것도 보내지 않고(보내기 실패 알림을 띄우지 않는다) 판만 계속 돌리며, 다시 붙어 방 채널의 동기화 화면이 오면 (1)~(4)가 가장 최근 점수·탈락을 다시 보낸다. 보낸 보고가 거절되거나 답이 없어 `errorSeq`가 오르면 다음 `SCORE`·`OUT`을 5000 ms 미룬다.

### 2.7 판 신호(상대 판 보기, `/app/rooms/{code}/signals`)

- **R22 보내기**: 참가자의 브라우저는 내 판이 살아 있는 동안 250 ms(`BOARD_SIGNAL_MS`)마다, 탈락한 뒤에는 멈춘 판을 2000 ms마다 `BOARD { board }` 신호를 보낸다(나중에 들어온 관전자·새로고침한 사람도 탈락한 판을 2초 안에 본다). 연결이 끊겨 있으면 조용히 버린다. 가려진 탭은 타이머가 느려져 초당 1번까지 보낸다.
- **R23 인코딩**: `board`는 6비트 글자표 `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_`(값 0~63)로 쓴 30비트 낱말들의 이음이다. 낱말 하나는 5글자, 높은 6비트부터 쓴다.
  - 첫 낱말(머리): 비트 29~26 = 들고 있는 과일 단계(없으면 0), 25~16 = `aimQ`, 15 = 위험(`overMs > 0`이면 1), 14~0 = 0.
  - 다음 낱말들(과일, 물리 세계에 들어온 순서, 오래된 것부터, 많아야 239개. 넘으면 앞의 239개만): 비트 29~26 = 단계(1~11), 25~16 = `xQ`, 15~6 = `yQ`, 5~0 = `angleQ`.
  - `xQ`·`aimQ` = `clamp(round(x ÷ 360 × 1023), 0, 1023)`, `yQ` = `clamp(round(y ÷ 540 × 1023), 0, 1023)`, `angleQ` = `round(((angle mod 2π) + 2π) mod 2π ÷ 2π × 64) mod 64`.
  - 길이는 `5 × (1 + 과일 수)`, 5 이상 1200 이하. 확인 값은 4.6의 예(`WAAAAGAPqA`).
- **R24 서버 검증·속도 제한·중계**: 서버는 `board`를 풀어 보지 않는다. 게임 중이고, 보낸 사람이 기권하지 않은 참가자(살아 있거나 탈락)이고, `board`가 있고 길이가 5 이상 1200 이하의 5의 배수이며 모든 글자가 R23 글자표 안이고, 같은 사람의 마지막으로 받아 준 신호에서 200 ms(`BOARD_MIN_GAP`)가 지났을 때만 받는다. 그 밖(관전자, 끝난 게임, 형식 어긋남, 너무 빠름)은 오류 없이 조용히 버린다. 모르는 신호 type만 `INVALID_INPUT`. 받아 준 신호는 사람마다 1씩 오르는 순번(`seq`)을 붙여 방의 모든 사람(참가자·관전자)에게 그대로 보낸다. 서버는 판 내용을 저장하지 않는다(사람마다 마지막으로 받아 준 시각과 순번만 기억한다).
- **R25 받기와 보간**: 브라우저는 `startedAt`이 지금 화면과 다른 신호와 내 신호(`playerId` = 나)를 버린다. 사람마다 가장 최근 판 2개(이전·최신)를 기억하고, 최신 판을 받은 시각부터 250 ms 동안 이전 → 최신으로 과일 위치·각도·조준 x를 선형 보간해 그린다(각도는 짧은 쪽으로). 두 판의 과일 짝짓기(`matchFruits`): 최신 판의 과일을 순서대로, 아직 안 쓴 이전 판 과일 가운데 단계가 같고 거리가 80 이하인 가장 가까운 것과 잇는다. 짝이 없는 최신 과일은 제자리에 바로 나타나고, 짝이 없는 이전 과일은 바로 사라진다. 동작 줄이기면 보간 없이 최신 판을 바로 그린다. 상대 점수는 신호가 아니라 화면(`players[].score`)에서 읽는다.

### 2.8 끝과 결과

- **R26 끝나는 조건**: 받아들인 `SCORE`·`OUT`과 기권 처리 뒤마다 (가) → (나) 순서로 본다. (가) 살아 있는(`PLAYING`) 참가자가 없으면 끝(이유 `ALL_OUT`). (나) 살아 있는 참가자가 정확히 1명이고, 그 사람의 점수가 다른 겨루는 사람(기권하지 않은 다른 참가자, R27) 모두의 점수보다 엄격히 높으면 그 순간 끝이고 그 사람이 이긴다. 다른 겨루는 사람이 한 명도 없으면(모두 기권) 이유 `FORFEIT`, 있으면 이유 `DECIDED`(승부가 정해짐). 동점이거나 낮으면 끝나지 않고 이어진다: 이후 점수 보고로 엄격히 높아지는 순간 `DECIDED`로 끝나고, 그 전에 그 사람이 탈락하면 (가), 상한이면 (다)로 끝난다. (다) 경기 상한(R17)이면 끝(이유 `TIME_UP`). 기권한 사람의 점수는 승패에 쓰지 않으므로(R27) (나)의 비교에도 넣지 않는다. (D13, D23)
- **R27 승패**: 기권하지 않은 참가자(겨루는 사람) 가운데 최고 점수가 한 명이면 그 사람이 `WIN`, 나머지는 `LOSE`. 최고 점수가 여럿이면 그 사람들끼리 `DRAW`, 나머지는 `LOSE`(페이퍼 사파리 동점과 같은 규칙). 기권한 사람은 점수와 상관없이 `LOSE`. 겨루는 사람이 1명이면 점수와 상관없이 `WIN`. 등수(`rank`)는 겨루는 사람끼리 점수 내림차순으로 매기고 동점은 같은 등수(1, 1, 3), 기권한 사람은 모두 `겨루는 사람 수 + 1`등.
- **R28 기권**: 살아 있는 참가자가 게임 중에 방을 나가거나(로그아웃 포함) 연결이 60초 넘게 끊겨 자동 기권되면 `FORFEITED`가 된다. 그때까지 받아들여진 점수는 화면에 남지만 승패에는 쓰지 않는다(R27).
- **R29 탈락한 사람**: 탈락한 사람은 더 이상 "게임 중"이 아니다(`isPlaying = false`). 방을 나가도, 연결이 끊겨도 기권이 아니고 탈락 때의 점수로 그대로 겨룬다(도둑잡기에서 손패를 비운 사람과 같은 처리).
- **R30 기록**: 끝날 때 딱 한 번 결과를 낸다. 경기 기록 `GameCompleted`에는 처음 참가자 모두가 들어간다(`result` = R27, `tokens` = 0, `seat` = 세션이 받은 `memberIds` 순서). 라운드 기록 `RoundCompleted(1, …)`는 끝난 이유가 `ALL_OUT`·`DECIDED`·`TIME_UP`일 때만 내고, 겨루는 사람만 들어간다(`score` = 마지막 점수, `result` = R27). 이유가 `FORFEIT`이면 라운드 기록을 내지 않는다. 그래서 전적의 "평균 점수"는 끝까지 한 판의 점수 평균이다. (D12)
- **R31 다음 게임**: 끝나면 방은 대기 상태로 돌아가고 기존 "다음 게임 준비" 흐름으로 새 게임을 연다. 새 게임은 새 씨앗.

### 2.9 저장과 이어 하기

- **R32 저장**: 참가자의 브라우저는 `localStorage` 키 `bg.fruit:{방 코드}:{내 회원 id}`에 내 판을 JSON으로 저장한다. 판이 살아 있는 동안 1000 ms마다, 탈락한 순간, `pagehide`와 탭이 가려질 때(`visibilitychange` → hidden). 내용: `{ v: 1, startedAt, seed, simMs, dropIndex, score, aimX, heldSinceMs, lastDropMs, overMs, out, fruits }`. `fruits`는 물리 세계에 들어온 순서의 `[level, x, y, vx, vy, angle, angularVelocity, landed(0 또는 1)]` 목록. `heldSinceMs`는 지금 과일을 든 판의 시각(들고 있지 않으면 `null`), `lastDropMs`는 마지막으로 떨어뜨린 판의 시각(아직 없으면 `null`). 소수는 둘째 자리까지 반올림한다. 저장할 수 없는 환경이면 조용히 넘어간다(이번 방문 동안만 이어진다).
- **R33 무효화**: 저장된 판은 `v = 1`이고 `startedAt`·`seed`가 지금 화면과 모두 같을 때만 쓴다. 다르면 버린다(같은 방의 다음 게임, 다른 게임). 테이블이 열릴 때와 화면의 `startedAt`이 바뀔 때 지금 키가 아닌 `bg.fruit:`로 시작하는 키를 모두 지운다(한 회원은 한 방에만 있을 수 있다). 게임이 끝난 화면을 받으면 지금 키도 지운다.
- **R34 복원**: 테이블이 열려 진행 중인 화면을 받으면, 쓸 수 있는 저장된 판이 있으면 그대로 물리 세계를 다시 만들고(과일의 위치·속도·각도·착지 여부), 없으면 빈 판(`simMs = 0`)으로 시작한다. 그다음 R21로 서버와 맞추고 R15로 지금까지 따라잡는다. 저장이 1초 간격이라 복원된 판은 최대 1초 전 모습일 수 있다(그사이 보고된 점수는 R21 (1)로 지킨다).

### 2.10 컴퓨터 없음

- **R35 서버**: 과일 쌓기 방에 컴퓨터를 앉히려 하면(`POST /api/rooms/{code}/bots`) `BOTS_NOT_SUPPORTED`로 거절한다. 방장·대기 중 검사보다 뒤, 자리 만들기보다 앞에서 본다.
- **R36 화면**: 과일 쌓기 방의 대기실은 컴퓨터 추가·난이도 바꾸기를 넘기지 않는다. 빈자리 메뉴에는 "친구 초대"만 보이고, 꽉 찬 방에 "컴퓨터 추가"용 의자를 하나 더 그리지 않는다.

## 3. 상태 기계

- 게임 상태 `status`: `IN_PROGRESS` | `GAME_OVER`. 참가자 상태 `state`: `PLAYING` | `OUT` | `FORFEITED`.

```
시작 ─ 씨앗 정함, 모두 PLAYING·0점, 마감 = 시작 + 10분

IN_PROGRESS
 ├─ SCORE s (PLAYING인 참가자) → R19 통과면 점수 = s → 끝 판정
 ├─ OUT s   (PLAYING인 참가자) → R19 통과면 점수 = s, 그 사람 OUT → 끝 판정
 ├─ BOARD (신호, PLAYING·OUT인 참가자) → 상태 그대로, 방에 중계만
 ├─ 기권 x (PLAYING인 참가자만 기권이 된다) → x FORFEITED → 끝 판정
 └─ 시간 초과(마감) → GAME_OVER(TIME_UP)

끝 판정(R26, 위에서부터)
 ├─ PLAYING 0명 → GAME_OVER(ALL_OUT)
 ├─ PLAYING 1명이고 다른 겨루는 사람이 없음 → GAME_OVER(FORFEIT)
 ├─ PLAYING 1명이고 그 점수 > 다른 겨루는 사람 모두의 점수 → GAME_OVER(DECIDED)
 └─ 아니면 그대로
```

- 마감은 경기 내내 하나(시작 + 10분)이고 어떤 행동으로도 바뀌지 않는다. 게임이 끝나면 `deadline()`은 비어 있다.
- 한 사람의 판(브라우저) 상태: `들고 있음 → (떨어뜨림/자동) → 쿨다운 500 ms → 들고 있음 …`, 어느 때든 R12로 `탈락`(멈춤).

## 4. 백엔드 설계

### 4.1 게임 종류와 컴퓨터 지원 여부

- `GameType`에 `FRUIT_STACK("과일 쌓기", 2, 5)`를 `OLD_MAID` **뒤에** 추가한다(`/api/games`·전적 목록은 enum 선언 순서를 따른다).
- `GameType`에 `boolean supportsBots()`를 더한다. `FRUIT_STACK`만 false, 나머지는 true(기존 세 게임 동작 그대로).
- `Room.addBot`이 `requireHost` → `requireWaiting` 다음에 `gameType().supportsBots()`가 아니면 `BOTS_NOT_SUPPORTED`를 던진다(R35). 컴퓨터가 없으므로 이 게임의 방은 늘 연습 경기가 아니다(`practice = false`).
- DB: `game_match.game_type`, `member_game_stat.game_type`은 `VARCHAR(30)`(`@JdbcTypeCode(SqlTypes.VARCHAR)`, CHECK 없음)이라 `FRUIT_STACK`(11글자)에 변경이 필요 없다. `sql/schema.sql`도 게임 종류를 나열하지 않는다. 게임 종류를 나열하는 다른 곳은 `GameOccupancies`(로비 인원)와 `RecordQueryService`(전적 목록)의 `GameType.values()`뿐이라 새 게임이 0으로 자동으로 나온다.

### 4.2 `GameAction` 넓히기

- 칸 2개를 끝에 더한다: `Integer score`(점수·탈락 보고), `String board`(판 신호). 기존 3·6·7칸 생성자는 그대로 두고, 지금의 8칸 정식 생성자와 같은 모양의 편의 생성자를 더해 기존 호출부(게임 3종·컴퓨터·테스트)가 한 글자도 바뀌지 않게 한다. `GameActionTest`는 그대로 통과한다.

```java
public record GameAction(String type, Integer column, Integer row, Integer cardId, String color, Long targetId,
                         Integer index, List<Integer> cardIds, Integer score, String board) {
    public GameAction(String type, Integer column, Integer row, Integer cardId, String color, Long targetId,
                      Integer index, List<Integer> cardIds) { this(type, column, row, cardId, color, targetId, index, cardIds, null, null); }
    // 3·6·7칸 생성자는 지금처럼 위 8칸 생성자로 이어진다.
}
```

| 경로 | type | 필드 | 설명 |
|---|---|---|---|
| `/app/rooms/{code}/actions` | `SCORE` | `score`(필수, 0 이상) | 지금 내 총점(R18·R19) |
| `/app/rooms/{code}/actions` | `OUT` | `score`(필수, 0 이상) | 내 판 탈락과 마지막 총점(R20) |
| `/app/rooms/{code}/signals` | `BOARD` | `board`(R23) | 내 판 모습(R22~R24) |

- 모르는 type은 `INVALID_INPUT`. `score`가 정수가 아니면 메시지 변환 오류로 기존대로 `INVALID_INPUT`.

### 4.3 공통 경로는 그대로 쓴다

- 행동: `GameMessageController.act` → `RoomService.act` → `Room.act` → 세션. 받아들인 행동마다 방 정보와 사람마다 화면을 방송하고 타이머를 다시 건다(마감이 같으므로 같은 시각으로 다시 걸린다). 바꾸지 않는다.
- 신호: `GameMessageController.signal` → `RoomService.signal` → `Room.signal`(게임 중이 아니거나 참가자가 아니면 빈 값) → 세션 `signal` → `RoomNotifier.gameSignal`로 방의 모든 사람에게(`/user/queue/signal`). 바꾸지 않는다. 보낸 사람 자신에게도 가는 것은 그대로 두고 화면이 버린다(R25, D8).
- 시간 초과: `RoomService.rearm`이 세션의 `deadline()`(시작 + 10분)으로 `TurnTimer`를 걸고, 마감에 `autoAct`를 부른다. 바꾸지 않는다.
- 자동 기권: `DisconnectForfeitScheduler` → `forfeitLongDisconnected`가 `room::isPlaying`인 사람만 기권시킨다. 탈락한 사람은 `isPlaying = false`라 대상이 아니다(R29). 방장의 손 기권(`forfeitDisconnected`)도 `isOutOfRunningGame`으로 이미 걸러진다. 바꾸지 않는다.
- 플레이 순서 섞기(`PlayOrder`): 세션이 받는 `memberIds`가 섞여 오지만 이 게임에는 순서의 뜻이 없다. 받은 순서를 `participantIds`와 `seat`로만 쓴다.
- 게임 중에 들어온 관전자: 기존 관전 입장(`Room.watch`) 그대로다. 입장 방송으로 같은 화면(점수·상태·씨앗·마감)을 받고, 판 모습은 서버가 저장하지 않으므로 다음 신호부터 본다(살아 있는 판 250 ms 안, 탈락한 판 2초 안, R22). 관전자는 행동·신호를 보낼 수 없다(방 층이 거른다).
- 나갔다 다시 들어온 사람에게 끝난 게임 결과를 보내지 않는 `RoomGame` `Departures` 규칙은 공통이라 그대로 적용된다.

### 4.4 패키지 `com.boardgame.fruitstack`

| 클래스 | 책임 |
|---|---|
| `PlayerId`, `Score`(VO, 0 이상, `isBelow`, `exceeds(ScoreCeiling)`), `Seed`(VO, 0 이상) | 원시값 VO |
| `SeedSource`(인터페이스 `Seed next()`), `RandomSeedSource`, `FruitStackConfig`(`@Configuration`, `SeedSource` 빈) | 씨앗(R4). 테스트는 고정 |
| `PlayerState`(enum `PLAYING`, `OUT`, `FORFEITED`) | 참가자 상태 |
| `Stacker`(`Score` + `PlayerState`: `report`, `goOut`, `forfeit`, `isPlaying`, `isContender`) | 한 사람의 점수와 상태(R19·R20·R28) |
| `Stackers`(일급 컬렉션, 자리 순서 `PlayerId → Stacker`: `report`, `out`, `forfeit`, `playingCount`, `contenders`) | 참가자 묶음 |
| `MatchClock`(`Clock` + 시작 시각: `elapsed()`, `limitAt()`, `isTimeUp()`), `ScoreCeiling`(VO, 경과 시간에서 R19 상한) | 경기 시각과 점수 상한 |
| `BoardSnapshot`(VO, R24 형식 검사 `isValid`), `SnapshotGate`(마지막으로 받아 준 시각·순번, `tryPass(now)`), `SnapshotGates`(`PlayerId → SnapshotGate`) | 판 신호 검증·속도 제한 |
| `FruitStackEndReason`(enum `ALL_OUT`, `DECIDED`, `TIME_UP`, `FORFEIT`), `Standing`(사람·점수·결과·등수·상태), `Standings`(R27 계산), `FruitStackResult`(이유 + `Standings`) | 결과 |
| `FruitStackMatch`(`Seed` + `MatchClock`), `Contest`(`Stackers` + 끝난 이유) | 묶음(필드 수 제한) |
| `FruitStackGame`(`FruitStackMatch`·`Contest`·`SnapshotGates`) | 애그리거트: `report`, `out`, `forfeit`, `timeUp`, `relay`, 끝 판정(R26), 질의 |
| `FruitStackCommand`(enum `SCORE`, `OUT`), `FruitStackSignal`(enum `BOARD`) | type → 게임 메서드 |
| `FruitStackViewAssembler`, `view/*` | 4.6의 JSON record |
| `FruitStackSession implements GameSession`, `FruitStackSessionFactory`(`@Component`, `Clock`·`SeedSource` 주입) | 세션·등록 |

- 행동 검사 순서: 형식(모르는 type, `score` 없음·음수 → `INVALID_INPUT`) → 게임 끝남(`GAME_ALREADY_OVER`) → 참가자 아님(`NOT_A_PLAYER`) → 탈락·기권한 사람 / 줄어듦 / 상한 초과(모두 `FRUIT_STACK_SCORE_REJECTED`). 형식은 게임 상태를 보기 전에 행동을 읽을 때 걸린다. 방 층이 먼저 거르는 것(방의 참가자 아님, 게임이 없거나 끝남 → `GAME_NOT_STARTED`)은 기존 그대로다.
- 참가자 수가 2~5가 아니면 세션 생성에서 `FRUIT_STACK_INVALID_PLAYER_COUNT`.

### 4.5 `FruitStackSession` 계약

- `act`: `FruitStackCommand` 실행 → 끝 판정(R26) → 끝났으면 결과.
- `signal`: `FruitStackSignal.BOARD` → 받아 주면 `FruitStackBoardSignal`, 아니면 빈 값(R24). 점수·상태·마감·기록은 바뀌지 않는다.
- `forfeit(memberId)`: 살아 있는 참가자면 `FORFEITED`로 바꾸고 끝 조건(R26)을 본다. 살아 있지 않으면(탈락·이미 기권) 게임에 손대지 않고 빈 결과.
- `autoAct(random)`: 경기 상한이 지났으면 `TIME_UP`으로 끝내고 결과. 아직 아니면(이른 호출) 아무것도 하지 않고 빈 결과(방 층이 같은 마감으로 다시 건다). `random`은 쓰지 않는다.
- `deadline()`: 게임 중이면 시작 + 10분, 끝나면 빈 값.
- `isPlaying(id)`: 게임 중이고 그 사람이 `PLAYING`일 때만 true(R29).
- `isFinished()`: `status = GAME_OVER`. `roundNumber()` = 1.
- `pendingActors()`: 기본 구현(빈 목록) 그대로. 차례가 없고 컴퓨터가 없어 쓰는 곳이 없다.
- `viewFor(id)`: `new FruitStackSessionView(view)`. 참가자가 아니어도(관전자) 같은 화면. 컴퓨터가 없으므로 `ClockFreeView`는 구현하지 않는다.
- 결과(끝나는 행동·기권·시간 초과에서 딱 한 번): `ALL_OUT`·`DECIDED`·`TIME_UP`이면 `[RoundCompleted(1, 겨루는 사람 등수 순 RoundEntry), GameCompleted(자리 순 MatchEntry)]`, `FORFEIT`이면 `[GameCompleted(자리 순 MatchEntry)]`(R30). 끝난 게임은 행동을 받지 않으므로 다시 내지 않는다.

### 4.6 화면 JSON

`{"gameType":"FRUIT_STACK","game":{...}}`. `FruitStackView`(`game`):

```json
{
  "viewerId": 7,
  "status": "IN_PROGRESS",
  "startedAt": 1791900000000,
  "seed": 12345,
  "participantIds": [7, 12, 15],
  "players": [
    { "playerId": 7, "score": 128, "state": "PLAYING" },
    { "playerId": 12, "score": 311, "state": "OUT" },
    { "playerId": 15, "score": 40, "state": "FORFEITED" }
  ],
  "result": null,
  "winnerId": null,
  "deadline": 1791900600000,
  "serverNow": 1791900123120
}
```

| 칸 | 값 |
|---|---|
| `viewerId` | 보는 사람(관전자도 자기 id). 이 칸 말고는 모두에게 같다 |
| `startedAt` | 경기 시작 시각(epoch ms). 판의 시계(R15), 저장 무효화(R33), 신호 가리기(R25), 결과 창 닫음 기억 키에 쓴다 |
| `seed` | 씨앗(R4) |
| `participantIds`, `players` | 처음 참가자 전체(세션이 받은 순서). 점수는 서버가 받아들인 마지막 값 |
| `result` | 끝났을 때만: `{ "reason": "ALL_OUT" \| "DECIDED" \| "TIME_UP" \| "FORFEIT", "standings": [ { "playerId", "score", "outcome": "WIN" \| "DRAW" \| "LOSE", "rank", "state" } ] }`. `standings`는 등수 순(같은 등수는 자리 순), `state`는 끝난 순간의 상태 |
| `winnerId` | 끝났고 `WIN`이 한 명이면 그 사람, 무승부거나 게임 중이면 `null` |
| `deadline`, `serverNow` | 경기 상한 시각과 서버 시각(epoch ms). 끝나면 `deadline = null`. 다른 게임과 같은 계약(시계 차이 보정) |

- 다른 게임 화면에 있는 `currentPlayerId`·`stage`·`turnSeq`·`lastAutoActorIds`·`autoActSeq`·`events`는 없다(차례·사람별 자동 행동·이벤트가 없다, D10).
- 신호 메시지(`FruitStackBoardSignal`, `/user/queue/signal`):

```json
{ "gameType": "FRUIT_STACK", "type": "BOARD", "startedAt": 1791900000000, "playerId": 12, "seq": 418, "board": "WAAAAGAPqA" }
```

- 위 `board`는 R23의 확인 값이기도 하다: 감(5단계)을 `aimX = 180`에 들고 있고 위험이 아닌 머리 `WAAAA` + 바닥에 놓인 체리(1단계, x 180, y 529, 각도 0) `GAPqA`.

### 4.7 오류 코드(새로 추가)

| 코드 | 상태 | 메시지 |
|---|---|---|
| `FRUIT_STACK_INVALID_PLAYER_COUNT` | 400 | 과일 쌓기는 2~5명이 플레이할 수 있습니다. |
| `FRUIT_STACK_SCORE_REJECTED` | 409 | 점수를 반영할 수 없어요. |
| `BOTS_NOT_SUPPORTED` | 409 | 이 게임은 컴퓨터와 할 수 없어요. |

- 그대로 쓰는 코드: `INVALID_INPUT`, `NOT_A_PLAYER`, `GAME_ALREADY_OVER`, `GAME_NOT_STARTED`.
- 화면: `FRUIT_STACK_SCORE_REJECTED`는 `QUIET_ERROR_CODES`에 넣어 알림 없이 넘긴다(정상 브라우저는 받을 일이 없고, 받아도 사용자가 할 수 있는 일이 없다). `GAME_ALREADY_OVER`·`GAME_NOT_STARTED`는 이미 조용하다.

## 5. 프론트엔드: 공통 이음매

| 파일 | 바꿀 점 |
|---|---|
| `package.json` | `dependencies`에 `matter-js@^0.20.0`, `devDependencies`에 `@types/matter-js@^0.20.2` |
| `api/types.ts` | `GameType`에 `'FRUIT_STACK'`. `GameAction`에 `score?: number`, `board?: string`, type에 `'SCORE' \| 'OUT' \| 'BOARD'`. 과일 쌓기 타입(6.1). `SessionView`에 `FruitStackSessionView`, `GameSignal`에 `FruitStackBoardSignal` |
| `games/gameModule.ts` | `TableProps`에 `subscribeSignal?: (listener: (signal: GameSignal) => void) => () => void`. `GameModule`에 `supportsBots?: boolean`(없으면 true) |
| `room/useRoomChannel.ts` | 신호 구독자 묶음(`Set`)과 `subscribeSignal`을 돌려준다. `/user/queue/signal`을 받으면 구독자가 있을 때는 구독자에게만 넘기고 `signal` 상태는 건드리지 않으며, 구독자가 없으면 지금처럼 `setSignal`한다(도둑잡기는 구독하지 않으므로 그대로). `QUIET_ERROR_CODES`에 `FRUIT_STACK_SCORE_REJECTED` |
| `pages/RoomPage.tsx` | `subscribeSignal`을 테이블에 넘긴다. `game.supportsBots === false`면 `WaitingRoom`에 `onAddBot`·`onChangeBot`을 넘기지 않는다(R36) |
| `lib/sound.tsx` | `SoundName`에 `'merge'`와 그 소리(사인파 520 Hz → 780 Hz, 90 ms) |
| `games/registry.ts` | `GAME_ORDER = ['PAPER_SAFARI', 'UNO', 'OLD_MAID', 'FRUIT_STACK']`, `GAMES.FRUIT_STACK` |

- 초당 최대 20개쯤 오는 판 신호를 React 상태 하나(`signal`)로 받으면 사이 값이 묶여 사라지고 `RoomPage`가 신호마다 다시 그려진다. 그래서 구독(ref로 바로 전달) 경로를 더한다(D9). 구독자가 없을 때의 동작은 지금과 같아 `useRoomChannel`·도둑잡기 테스트가 그대로 통과한다.
- `WaitingRoom`·`MemberList`·`SeatMenu`는 고치지 않는다: `onAddBot`이 없으면 이미 "친구 초대"만 보이고(`SeatMenu`), 여분 의자도 그리지 않는다(`seatCountOf`의 `canAdd = false`).
- 게임 선반·로비·전적 탭·전적 창 줄·대기실 규칙·인원 선택은 등록부(`GAME_ORDER`, `GAMES`)에서 만들어지므로 모듈을 등록하면 따라온다. 기존 테스트 가운데 게임 목록 전체를 단언하는 것(`catalog.test`의 소개 문구 배열, `registry.test`의 `GAME_ORDER`)은 네 번째 항목을 더한다. 백엔드의 `/api/games` 개수 단언도 4로 맞춘다.
- 행동 감시(`useActionWatchdog`)와의 관계: `SCORE`·`OUT`은 `send`로 보내는 보통 행동이라, 받아들여지면 화면이, 거절되면 오류가 바로 돌아와 감시가 풀린다. 2.5초 안에 답이 없으면 지금처럼 "연결이 불안정해요. 다시 연결하고 있어요."를 띄우고 다시 연결한다(판은 R15로 계속 돈다). 끊겨 있을 때 `send`를 부르면 뜨는 "연결이 끊겨 있어요…" 알림을 피하려고 보고 훅은 `useRealtime().connected`가 false인 동안 `send`를 부르지 않는다(R21). 감시 코드는 고치지 않는다.

## 6. 프론트엔드: 과일 쌓기 화면

### 6.1 타입

`FruitStackPlayerState = 'PLAYING' | 'OUT' | 'FORFEITED'`, `FruitStackPlayerView { playerId; score; state }`, `FruitStackStanding { playerId; score; outcome: ResultType; rank; state }`, `FruitStackResult { reason: 'ALL_OUT' | 'DECIDED' | 'TIME_UP' | 'FORFEIT'; standings }`, `FruitStackView`(4.6 그대로), `FruitStackSessionView = { gameType: 'FRUIT_STACK'; game: FruitStackView }`, `FruitStackBoardSignal`(4.6).

### 6.2 파일(`F/games/fruitstack/`)

| 파일 | 책임 | DOM·캔버스 |
|---|---|---|
| `engine/constants.ts` | 2장의 모든 숫자(판, 과일 표, 시간, 신호 간격) | 없음 |
| `engine/prng.ts` | `levelAt`(R4) | 없음 |
| `engine/world.ts` | `matter-js` 감싸기: 세계 만들기, 과일 넣기·빼기, 한 걸음 밟고 합치기·착지 알림 돌려주기(R3·R8·R9·R11·R14) | 없음 |
| `engine/game.ts` | 한 판의 상태와 규칙: `createGame(seed)`, `aim(game, x)`, `drop(game)`, `advance(game, untilMs, maxSteps)` → 일어난 일(`merge`, `drop`, `autoDrop`, `out`) 목록(R5~R7, R10, R12, R13, R15·R16의 걸음 수 계산) | 없음 |
| `engine/snapshot.ts` | `encodeBoard(game)`, `decodeBoard(text)`(R23) | 없음 |
| `engine/interpolate.ts` | `matchFruits`, `blend(prev, next, t)`(R25) | 없음 |
| `engine/persist.ts` | `serialize(game)`, `restore(saved, view)`, 키·무효화(R32~R34). 저장소는 인자로 받는다 | 없음 |
| `engine/reconcile.ts` | 내 판과 화면에서 보낼 것을 정하는 순수 함수(R18·R21) | 없음 |
| `fit.ts` | `fitBoard`(6.4의 크기 계산) | 없음 |
| `art/fruitArt.ts` | 과일 11가지의 그림 자료(도형 목록) | 없음 |
| `FruitIcon.tsx` | 그림 자료 → 인라인 SVG(미리보기·규칙·상자·결과 창) | SVG |
| `paint.ts` | `paintBoard(painter, frame, options)`: 최소 인터페이스 `Painter`(원·경로·선·글자 그리기)에만 그린다 | 인터페이스 |
| `BoardCanvas.tsx` | `<canvas>`를 잡아 `Painter`를 만들고 프레임마다 `paintBoard`를 부른다. `getContext`가 없으면(jsdom) 아무것도 그리지 않는다 | 캔버스 |
| `useFruitGame.ts` | 틱 돌리기(rAF·가려진 탭 타이머), 화면과 맞추기, 저장 | 타이머 |
| `useScoreReporter.ts`, `useBoardSignals.ts` | 보고(R18·R20·R21), 판 신호 보내기·받기(R22·R25) | 타이머 |
| `MyBoard.tsx`, `MiniBoard.tsx`, `Hud.tsx`, `FruitStackTable.tsx`, `FruitStackGameOverPanel.tsx` | 화면 | React |
| `describe.ts`, `rules.ts`, `FruitStackBoxArt.tsx`, `module.tsx`, `fruitStackFixtures.ts`, 각 테스트 | 기록 문구·규칙·상자·등록 | |

- `engine/*`은 `Engine`, `Bodies`, `Body`, `Composite`, `Events`만 import하고 `window`·`document`·캔버스를 만지지 않는다. 그래서 Vitest(jsdom)에서 캔버스 없이 그대로 돈다.
- 물리와 그리기는 React 렌더와 떨어져 있다: 판 상태는 ref에 두고 캔버스는 rAF에서 직접 그린다. 화면(`view`)·방 정보가 초당 여러 번 와 테이블이 다시 그려져도 캔버스·세계를 다시 만들지 않는다(`BoardCanvas`는 `memo`).

### 6.3 과일 그림

- 과일마다 viewBox `-50 -50 100 100`, 반지름 50인 몸 원 + 꼭지·잎·무늬 + 얼굴(점 눈 두 개와 웃는 입). 얼굴이 있어 구를 때 각도가 보인다. 몸 색은 R2 표, 윤곽선은 몸 색을 30% 어둡게 한 색(폭 4), 윗왼쪽에 흰 반사광(투명도 0.35).
- 무늬: 체리(꼭지 두 가닥), 딸기(노란 씨 점 6개와 초록 꼭지잎), 포도(작은 알 3개 겹침 무늬), 귤(작은 잎 하나), 감(네 갈래 꼭지잎), 사과(갈색 꼭지와 잎), 배(위쪽이 좁아 보이는 밝은 띠와 꼭지), 복숭아(가운데 골과 분홍 볼), 파인애플(마름모 격자와 초록 관), 멜론(그물 선), 수박(짙은 초록 `#1F6B32` 세로 줄무늬 5개).
- 그림 자료는 `{ shape: 'circle' | 'ellipse' | 'path', … , fill, stroke }` 목록 하나다. `FruitIcon`은 이를 SVG 요소로, 캔버스는 같은 자료를 `Path2D`로 그려 단계 × 화면 반지름마다 한 번 만든 작은 캔버스(스프라이트)에 담아 둔다. 그림의 원천이 하나라 SVG와 캔버스 모습이 같다.
- 이름(접근성): R2의 이름 그대로("체리"…"수박").

### 6.4 배치

- 공통: `RoomStatusBar`, `TurnBar`(안내 문구·진행 기록, `myTurn = false`, `deadline`·`serverNow`는 경기 상한이라 마지막 5초에만 카운트다운 고리가 뜬다), 채팅 자리, 닉네임 메뉴, 테마 변수를 다른 게임과 똑같이 쓴다. 테이블 바닥은 `Felt` 대신 테마 색의 둥근 판(`paper`)이고 그 위에 판들이 놓인다.
- **판 한 개의 모습**: 2:3 상자, 안쪽은 어두운 반투명 바탕, 위쪽 선은 y = 90에 점선. 내 판에는 들고 있는 과일에서 바닥까지 내려가는 조준 점선.
- **두 가지 모드**: `play`(내가 살아 있는 참가자) — 내 판이 크게 가운데, 다른 참가자 판은 작게. `watch`(내가 탈락했거나 관전자) — 살아 있는 사람들의 판을 크게, 탈락한 사람(나 포함)의 판은 작게. 기권한 사람은 방을 나갔으므로 판을 그리지 않고 결과 창에만 나온다.
- 크기는 `fitBoard({ layout, box, mode, big, mini })`가 정한다. `box`는 테이블 몸통이 쓸 수 있는 상자로, 폭은 감싼 요소의 폭, 높이는 `window.innerHeight - 감싼 요소의 화면 위쪽 위치 - 아래 여백`(아래 여백: `pc` 24, `portrait` 8, `landscape` 4)을 `ResizeObserver`·`resize`로 잰다. 표의 높이는 목표 높이다. 판 폭 = 목표 높이 × 2/3의 내림(정수 px), 실제 높이 = 폭 × 1.5, 그리기 배율 = `폭 ÷ 360`. 줄·칸 계산에는 목표 높이를 쓴다. 간격(`GAP`)은 12, 작은 판 아래 이름·점수 줄은 22, 점수 띠(`Hud`) 높이는 44.

| 배치 | `play` 모드 | `watch` 모드 |
|---|---|---|
| `pc` | 점수 띠 44 + 내 판(높이 = min(600, box 높이 - 56)). 작은 판은 내 판 양옆 세로 줄: 상대 1명 → 오른쪽 1, 2명 → 왼쪽 1·오른쪽 1, 3명 → 왼쪽 1·오른쪽 2, 4명 → 왼쪽 2·오른쪽 2. 작은 판 높이 = min(300, (내 판 높이 + 44 - (줄의 판 수 - 1) × 12) ÷ 줄의 판 수 - 22), 양옆 폭이 모자라면 더 줄인다 | 큰 판을 한 줄로(살아 있는 사람 1명 → 1칸, 2명 → 2칸, 3명 → 3칸, 4명 → 2칸 2줄, 5명 → 3칸 2줄), 그 아래 작은 판 한 줄(작은 판 폭 48, 높이 72). 큰 판 폭 = min(400, 칸 폭, 줄 높이에서 구한 폭) |
| `portrait` | 위에 작은 판 한 줄(작은 판 높이 = clamp(box 높이 × 0.16의 내림, 60, 120), 폭이 모자라면 `(box 폭 - (판 수 - 1) × 8) ÷ 판 수`까지 줄인다), 점수 띠 44, 내 판(높이 = box 높이 - 작은 판 줄 - 44 - 24, 폭 = min(box 폭, 높이 × 2/3)) | 큰 판 2칸(살아 있는 사람 1명이면 1칸), 줄 수 = 올림(사람 수 ÷ 2), 그 위에 작은 판 한 줄(작은 판 폭 40, 높이 60) |
| `landscape` | 왼쪽부터 점수 세로 띠(폭 64) · 내 판(높이 = box 높이) · 작은 판 격자(상대 2명까지 1칸, 3~4명은 2칸 2줄, 작은 판 높이 = min(300, (box 높이 - (줄 수 - 1) × 8) ÷ 줄 수 - 22)) | 점수 띠를 높이 28의 한 줄로 줄이고, 큰 판을 한 줄로(사람 수만큼 칸), 오른쪽에 작은 판 세로 한 줄(작은 판 폭 40) |

- 확인 값(`fit.test`): `pc`·`play`·상대 4명·box 844×660 → 내 판 폭 400(높이 600), 작은 판 폭 196(목표 높이 294), 전체 폭 400 + 2 × (196 + 12) = 816 ≤ 844. `portrait`·`play`·상대 4명·box 328×500(360×640 화면) → 작은 판 폭 53(목표 높이 80), 내 판 폭 220(높이 330). `portrait`·`play`·상대 4명·box 328×660 → 작은 판 폭 70(목표 높이 105), 내 판 폭 310(높이 465). `landscape`·`play`·상대 4명·box 632×326 → 내 판 폭 217(목표 높이 326), 작은 판 폭 91(목표 높이 137), 전체 폭 64 + 12 + 217 + 12 + 91 × 2 + 8 = 495 ≤ 632. 어느 경우에도 가로·세로 스크롤이 생기지 않는다. 휴대폰 세로에서 채팅 줄은 판 아래에 온다(작은 화면에서는 채팅 줄만 화면 아래로 내려갈 수 있다).
- 가로 휴대폰은 기존 게임처럼 왼쪽 칸(`aside`: 상태 바·`TurnBar`·채팅 줄, 폭 10.5rem) | 오른쪽(테이블) 나눔을 쓴다.
- **점수 띠(`Hud`)**: "점수" + 내 점수(`RollingNumber`, 천 단위 쉼표), "다음" + 다음 과일 그림(`FruitIcon`, 28px), "남은 시간" `m:ss`(`deadline - serverNow`로 보정, 마지막 10초는 붉은 글자). `watch` 모드의 관전자에게는 점수·다음 대신 "관전 중"만 보인다.
- **작은 판·큰 판(`MiniBoard`)**: 판 + 그 아래 이름표(프로필 그림, 닉네임, 연결 끊김이면 "연결 끊김 N초") + 점수("N점"). 상태 표시: 위험(신호 머리의 위험 비트)이면 붉은 테두리, 탈락이면 판을 흐리게 하고 "탈락" 배지. 아직 신호를 못 받은 판은 빈 판에 "불러오는 중…". 감정 표현 말풍선(`EmoteBubble`)은 이름표 위에 뜬다. 차례가 없으므로 `turn-ring` 강조 테두리·"차례" 배지·사람별 카운트다운은 쓰지 않는다.
- **내 자리**: 내 판 왼쪽 위 모서리에 `EmoteDock`. 내 판이 탈락하면 판 위에 "가득 찼어요!"와 "N점"을 띄운 뒤 1.5초 뒤 `watch` 모드로 바뀐다(동작 줄이기면 바로).
- **관전자**: 처음부터 `watch` 모드. 판을 누를 수 없다. `SpectatorNotice`를 점수 띠 자리에 쓴다.

### 6.5 상호작용

- **포인터(터치·마우스·펜)**: 내 판 위에서 누르면 조준을 시작하고(누른 자리의 x → 물리 단위 → R5로 자름), 누른 채 움직이면 조준 x가 따라가며(판 밖으로 나가도 포인터를 잡아 `setPointerCapture` 계속 따라간다), 떼면 떨어뜨린다. 누르는 순간 과일을 들고 있지 않았으면(쿨다운) 그 누름으로는 떨어뜨리지 않는다. `pointercancel`은 떨어뜨리지 않는다.
- **정밀 포인터**(`(pointer: fine)`): 누르지 않아도 판 위에서 움직이면 조준 x가 따라간다. 누르고 떼면 떨어뜨린다.
- **키보드**: 내 판은 초점을 받는다(`tabIndex = 0`). ←/→로 조준 x를 12씩(Shift와 함께면 36씩), Space·Enter로 떨어뜨린다.
- **자동 떨어뜨리기 안내**: 남은 시간이 3000 ms 이하면 들고 있는 과일 위에 남은 초(3, 2, 1)를 띄우고 3초가 되는 순간 `tick` 소리를 한 번 낸다.
- **위험 안내**: `overMs > 0`이면 위쪽 선이 붉게 깜박이고 선 오른쪽 끝에 "위험"을 쓴다(동작 줄이기면 깜박임 없이 붉은 선과 글자).
- **보내기 중복 방지**: 떨어뜨리기는 서버에 보내지 않으므로 다른 게임의 보내기 잠금(`PENDING_MS`)을 쓰지 않는다. 쿨다운(R6)이 잇단 떨어뜨리기를 막는다.
- 판은 자기 소리가 있으므로 `data-no-click-sound`.
- 탭을 떠났다 돌아오면 R16의 "따라잡는 중…"이 잠깐 보일 수 있다.

### 6.6 안내 문구(TurnBar)

| 상황 | PC | 좁은 화면 |
|---|---|---|
| 내 판이 살아 있음 | 끌어서 자리를 정하고 놓으면 떨어져요. | 끌어서 놓으면 떨어져요 |
| 나만 살아 있고 1등이 아님 | 혼자 남았어요. {N}점만 더 얻으면 이겨요. | {N}점만 더 얻으면 이겨요 |
| 내 판이 탈락함(게임 중), 살아 있는 사람이 둘 이상 | 판이 가득 찼어요. 남은 사람의 판을 지켜보세요. | 남은 판을 지켜보세요 |
| 내가 탈락했거나 관전자이고 살아 있는 사람이 한 명 | {닉네임}님이 {N}점만 더 얻으면 이겨요. | {닉네임}님 {N}점 남음 |
| 관전자, 살아 있는 사람이 둘 이상 | 모두 과일을 쌓는 중… | 과일을 쌓는 중… |
| 끝남 | 게임이 끝났어요. | 같음 |

- `{N}` = (다른 겨루는 사람의 최고 점수) - (살아 있는 한 사람의 점수) + 1. 다른 사람의 점수와 남의 판의 점수는 화면(`players[].score`)에서, 내가 그 한 사람이면 내 점수는 내 판의 점수(보고 전의 합치기까지 담긴 값)에서 읽는다. `{N}`이 1 미만이면(보고가 서버에 닿기 직전) 이 줄 대신 바로 윗줄의 보통 문구를 쓴다. 살아 있는 사람이 한 명이 되면 이 안내가 곧 "끝 조건"(R26 (나))의 남은 거리다.

### 6.7 진행 기록 문구(`describe.ts`)

- 이벤트 목록이 없으므로 이전 화면과 새 화면을 견준다. 처음 받은 화면(이전 화면 없음)은 게임 중이고 모든 점수가 0일 때만 시작 줄을 쓴다. `startedAt`이 바뀌었으면 새 게임이다.

| 변화 | 기록 종류 | 문구 |
|---|---|---|
| 새 게임 | start | 새 게임을 시작해요. 과일을 합쳐 점수를 쌓아요 |
| 어떤 사람이 `PLAYING` → `OUT` | finish | {닉네임}님의 판이 가득 찼어요 ({N}점) |
| 끝, `TIME_UP` | timeout | 10분이 지나 지금 점수로 끝났어요 |
| 끝, 승자 한 명 | result | {닉네임}님이 {N}점으로 이겼어요! |
| 끝, 무승부 | result | {닉네임}님, {닉네임}님이 {N}점으로 비겼어요 |
| 끝, `FORFEIT` | result | 모두 나가서 {닉네임}님이 이겼어요 |

- 끝 줄은 이유에 따라 하나만 쓴다: `FORFEIT`이면 마지막 줄, `TIME_UP`이면 시간 줄 다음에 승자·무승부 줄, `ALL_OUT`·`DECIDED`면 승자·무승부 줄(`DECIDED`는 늘 승자 한 명).

- 기권(`FORFEITED`)은 방 채널의 나간 사람 알림·기록이 이미 쓰므로 여기서 쓰지 않는다. 점수 변화는 기록하지 않는다. 새 `LogKind`는 없다.

### 6.8 효과와 효과음

- 합치기: 새 과일 자리에 150 ms 동안 퍼지는 흰 고리(동작 줄이기면 없음). 소리 `merge`(80 ms에 한 번까지).
- 떨어뜨리기: 소리 `place`. 자동 떨어뜨리기 3초 전 `tick`. 내 판 탈락: `roundLose`.
- 게임 끝: 공통 `useFinalePhase`(끝난 이유가 `FORFEIT`이면 바로 결과 창) → 공통 `GameEndBanner`(아랫줄은 기본 "점수를 계산하고 있어요") → 결과 창. 공통 `useGameOverCue`로 모두에게 게임 끝 소리 한 번(승자는 밝은 소리). 게임 시작 3-2-1은 방 화면의 공통 `StartCountdownOverlay`가 이미 보여 주며, 게임은 카운트다운이 끝난 뒤 만들어지므로 테이블은 할 일이 없다.
- 그리기 부담 줄이기: 캔버스 해상도 배율은 `min(devicePixelRatio, 2)`, 스프라이트는 한 번만 만든다. `play` 모드의 작은 판은 두 프레임에 한 번(초당 30번) 그리고, 큰 판은 매 프레임 그린다.

### 6.9 결과 창(`FruitStackGameOverPanel`)

- 공통 `Modal`("게임 결과"), `Confetti`(승자 본인), `HeadlineIcon`, `ReadyChips`, `FooterButton`.
- 머리말: 내가 `WIN`이면 "내가 이겼어요!", 다른 사람이 `WIN`이면 "{닉네임}님이 이겼어요!", 무승부면 "비겼어요!". 그 아래 이유 줄: `TIME_UP`이면 "10분이 지나 지금 점수로 끝났어요", `FORFEIT`이면 "상대가 나가서 게임이 끝났어요", `DECIDED`이면 "마지막 한 사람의 점수가 가장 높아 바로 끝났어요", `ALL_OUT`이면 없음.
- 순위 표: `standings` 순으로 한 줄씩("{N}등", 프로필 그림, 닉네임, "{N}점"(천 단위 쉼표), 오른쪽 표시). 오른쪽 표시: `WIN`은 메달 아이콘, `DRAW`는 "무승부", 기권은 흐리게 "기권". 내 줄은 강조 바탕.

### 6.10 규칙 캐러셀(`rules.ts`, 6장)

제목 "과일 쌓기 규칙".

1. **목표** — "같은 과일 두 개를 붙여 더 큰 과일로 합쳐요.", "합칠 때마다 점수를 얻고, 끝났을 때 점수가 가장 높은 사람이 이겨요." (체리 2개, 딸기)
2. **과일** — "체리부터 수박까지 11가지예요. 큰 과일을 합칠수록 점수가 커요.", "떨어뜨릴 과일은 작은 다섯 가지(체리·딸기·포도·귤·감) 중에서 나오고, 모두 같은 순서로 받아요." (11가지 한 줄)
3. **떨어뜨리기** — "내 판을 끌어 자리를 정하고 손을 떼면 떨어져요.", "10초 안에 떨어뜨리지 않으면 그 자리에 저절로 떨어져요." (귤)
4. **탈락** — "과일이 위쪽 선을 2초 넘게 넘어 있으면 판이 가득 찬 거예요.", "가득 차도 내 점수는 그대로 남고, 남은 사람들의 판을 크게 지켜봐요." (감, 사과)
5. **끝** — "모두 가득 차거나 10분이 지나면 끝나요. 한 사람만 남았을 때 그 사람 점수가 가장 높으면 바로 끝나요.", "가장 높은 점수가 이기고, 가장 높은 점수가 같으면 그 사람들끼리 비겨요." (수박)
6. **나가기와 끊김** — "게임 중에 나가면 기권이라 점수와 상관없이 져요.", "연결이 잠깐 끊겨도 내 판은 계속 움직여요. 60초 넘게 끊기면 기권이 돼요." (그림 없음)

대기실 요약: "같은 과일 두 개를 합쳐 점수를 쌓아요.", "10초 안에 떨어뜨리지 않으면 저절로 떨어져요.", "과일이 선을 2초 넘게 넘으면 탈락이에요.", "가장 높은 점수가 이겨요."

### 6.11 상자 그림·등록

- `FruitStackBoxArt`: 연두색 상자 위에 수박을 맨 아래로 멜론·복숭아·귤·체리가 쌓인 모습(`FruitIcon` 5개), 아래 "과일 쌓기" 글자(흰 글자, 어두운 테두리).
- 등록 `module.tsx`: `gameType 'FRUIT_STACK'`, `name '과일 쌓기'`, `slug 'fruit-stack'`, `tagline '2~5인 · 합쳐서 점수를 쌓아라!'`, `minPlayers 2`, `maxPlayers 5`, `supportsBots false`, `averageScoreLabel '평균 점수'`, `roundScoreText` 없음(기본 "N점"), `isGameOver = status === 'GAME_OVER'`, `wasParticipant = participantIds.includes(meId)`, `gameOverKey = `${code}:FRUIT_STACK:${startedAt}``, `stepKey = `${status}:${startedAt}``, `isStaleRejection` 없음.
- `stepKey`에 점수·상태를 넣지 않는 이유: 이 게임의 행동(`SCORE`·`OUT`)은 사용자가 누른 것이 아니라 훅이 보내는 보고라, 거절은 `FRUIT_STACK_SCORE_REJECTED`·`GAME_ALREADY_OVER`·`GAME_NOT_STARTED`(모두 조용한 코드)뿐이다. 걸음 비교로 가릴 것이 없다.

### 6.12 접근성

- 내 판: `role="application"`, `aria-label="내 판. 점수 {N}점, 들고 있는 과일 {이름}. 좌우 화살표로 자리를 정하고 스페이스로 떨어뜨려요"`.
- 작은 판·큰 판: `role="img"`, `aria-label="{닉네임}님의 판, {N}점{, 위험}{, 탈락}"`.
- 점수 띠의 점수는 `aria-live="polite"`(1초에 한 번까지 읽히게 값만 바뀐다). 탈락 안내는 `role="status"`.

## 7. 테스트 전략

### 7.1 백엔드 단위(`fruitstack/`, `MutableClock`, 고정 `SeedSource`)

- `Score`·`Seed`: 음수 거절. `ScoreCeiling`: 경과 0 ms → 110, 499 ms → 110, 500 ms → 132, 600000 ms → 26510(R19).
- 점수 보고(R19): 올라가는 점수 받아들임, 같은 점수 받아들이고 그대로, 줄어든 점수 거절, 상한 초과 거절(거절 뒤 점수 그대로), `score` 없음·음수 `INVALID_INPUT`, 탈락한 사람의 보고 거절, 끝난 뒤 `GAME_ALREADY_OVER`, 참가자 아님 `NOT_A_PLAYER`.
- 탈락(R20·R26): `OUT`이 점수를 받아들이고 탈락시킴, 마지막 사람이 탈락하면 `ALL_OUT`으로 끝, 두 명 이상 살아 있으면 끝나지 않음.
- 일찍 끝내기(R26 (나), `FruitStackDecidedTest`): 한 명이 탈락해 한 명만 남는 순간 남은 사람 점수가 더 높으면 `DECIDED`로 끝·남은 사람 `WIN`, 같거나 낮으면 이어짐, 이어지다 `SCORE`로 엄격히 높아지는 순간 `DECIDED`, 같은 점수가 되는 `SCORE`로는 안 끝남, 3명에서 두 번째 탈락 때 판정(첫 탈락 때는 두 명이 살아 있어 안 끝남), 탈락한 두 사람 가운데 높은 쪽과 견줌, 기권한 사람의 점수가 더 높아도 견주지 않고 끝남, 남은 사람이 못 넘고 탈락하면 `ALL_OUT`·상한이면 `TIME_UP`, `DECIDED`의 결과는 `[RoundCompleted, GameCompleted]`.
- 기권(R26·R28·R29): 2명에서 한 명 기권 → `FORFEIT`으로 끝·남은 사람 `WIN`, 3명(모두 0점)에서 한 명 기권 → 이어짐, 탈락 1명 + 그보다 점수가 낮은 살아 있는 1명에서 살아 있는 사람이 기권 → `ALL_OUT`으로 끝·탈락한 사람 `WIN`, 탈락한 사람의 `forfeit`은 손대지 않고 빈 결과, `isPlaying`은 탈락·기권·끝 뒤 false.
- 승패(R27, `StandingsTest`): 최고 점수 한 명 `WIN`·나머지 `LOSE`, 최고 동점 `DRAW`·나머지 `LOSE`, 모두 0점 동점 `DRAW`, 기권자는 최고 점수여도 `LOSE`, 등수 1·1·3과 기권자 마지막 등수.
- 시간(`FruitStackSessionTimerTest`): `deadline()` = 시작 + 10분, 점수 보고·탈락·신호 뒤에도 그대로, 마감 전 `autoAct`는 빈 결과·상태 그대로, 마감 뒤 `autoAct`는 `TIME_UP`으로 끝, 끝나면 `deadline()` 빈 값.
- 신호(R24): 형식이 맞는 `board` 중계·`seq` 증가, 200 ms 안의 두 번째는 버림, 길이 0·4·1205·5의 배수 아님·글자표 밖 글자는 버림, 탈락한 사람의 신호는 중계, 모르는 type `INVALID_INPUT`, 신호가 점수·상태·마감을 바꾸지 않음.
- 화면(`FruitStackViewTest`, `ObjectMapper.valueToTree`): `gameType = "FRUIT_STACK"`, 칸 이름·값(4.6), 참가자와 관전자 화면이 `viewerId` 말고 같음, 끝난 화면의 `result.standings`·`winnerId`(무승부면 `null`), `deadline = null`.
- 결과(`FruitStackSessionTest`): `ALL_OUT`·`DECIDED`·`TIME_UP`은 `[RoundCompleted, GameCompleted]`(라운드에 기권자 없음, `score` = 마지막 점수), `FORFEIT`은 `[GameCompleted]`만, `MatchEntry`의 `tokens = 0`·`seat`, 딱 한 번.
- 공통: `GameActionTest`(새 칸 JSON 읽기, 기존 생성자 동등성 그대로), `GameType.supportsBots`.

### 7.2 백엔드 통합

- `FruitStackStompFlowTest`: 2명 방 만들기·시작 → 두 사람이 같은 `seed`·`startedAt` 화면을 받음, `SCORE` → 두 화면의 점수 갱신, 줄어든 `SCORE` → 보낸 사람에게만 `FRUIT_STACK_SCORE_REJECTED`(409), `BOARD` 신호가 상대·관전자의 `/user/queue/signal`로 감, 관전자의 `BOARD`는 아무에게도 안 감, 한 사람 `OUT` 뒤 남은 사람의 `SCORE`가 그 점수를 넘는 순간 `DECIDED`로 끝난 화면(R26).
- `FruitStackRoomTimeoutTest`: 가짜 예약기로 10분 뒤 `TIME_UP`·방 대기 상태·타이머 취소.
- `FruitStackRoomApiTest`: `/api/games` 4개(네 번째 `FRUIT_STACK`), 정원 5 허용·6 거절, 컴퓨터 추가 `BOTS_NOT_SUPPORTED`(409, 통일 오류 본문), 다른 게임 방의 컴퓨터 추가는 그대로 성공, 탈락한 사람이 나가도 게임이 이어지고 결과에 남음, 60초 끊긴 살아 있는 사람만 자동 기권(탈락한 사람은 아님).
- `FruitStackRecordApiTest`: 끝나면 `game_type = 'FRUIT_STACK'`, 승·무·패 반영, 평균 점수 = 끝까지 한 판 평균, `FORFEIT` 끝은 경기만 기록.
- 회귀: 기존 세 게임의 모든 테스트가 그대로 통과(`GameAction`·`GameType`·`Room.addBot` 변경 확인).

### 7.3 프론트 단위(Vitest/jsdom, 캔버스 없음)

- `prng`: R4 확인 값 세 줄, 값이 늘 1~5.
- `world`·`game`(실제 `matter-js`, 가짜 시계 없이 걸음 수로): 같은 x에 체리 두 개를 떨어뜨리면 정해진 걸음 안에 딸기 하나가 되고 점수 1(R8·R10), 수박 두 개는 사라지고 66점(R9), 한 걸음에 과일 하나는 한 번만 합쳐짐, 쿨다운 500 ms 전에는 들고 있지 않음(R6), 10000 ms 뒤 자동 떨어뜨리기(R7), 조준 자르기(R5), 착지 전 과일은 선 넘김으로 세지 않음(R11·R12), 선 위에 과일을 쌓아 2000 ms를 넘기면 탈락하고 판이 멈춤(R12·R13), `advance`가 `maxSteps`에서 멈추고 이어 밟으면 같은 결과(R16). 위치의 정확한 소수는 단언하지 않고 과일 수·단계·점수·일어난 일을 단언한다.
- `snapshot`: 인코딩 → 디코딩 왕복(양자화 오차 안), 머리 낱말, 240개째 과일 잘림, 길이 규칙, 글자표(R23).
- `interpolate`: 짝짓기(같은 단계·거리 80), 새 과일·사라진 과일, 각도 짧은 쪽 보간(R25).
- `persist`: 직렬화 → 복원 왕복, `startedAt`·`seed`·`v` 불일치 버림, 다른 키 지움, 저장소 예외 삼킴(R32~R34).
- `reconcile`·`useScoreReporter`(가짜 타이머): 500 ms 묶기와 뒤 가장자리, 마지막 3초는 바로, 끊긴 동안 `send`를 부르지 않음, 다시 붙어 화면이 오면 최근 점수 한 번, 내 판 탈락인데 화면이 `PLAYING`이면 `OUT`, 화면 점수가 더 크면 내 점수를 올림, `errorSeq`가 오르면 5초 미룸(R18·R20·R21).
- `useBoardSignals`: 250 ms·탈락 뒤 2000 ms, 내 신호·다른 `startedAt` 버림(R22·R25).
- `fit`: 6.4 확인 값 네 줄, 상대 1~4명·세 배치·두 모드에서 전체가 `box` 안.
- `fruitArt`·`FruitIcon`: 11가지, 모든 도형이 viewBox 안, 이름.
- `paint`: 가짜 `Painter`에 선·조준선·과일·위험 표시가 그려짐.
- `describe`: 6.7 표 전부, 같은 화면 두 번에 중복 없음.
- `FruitStackTable`(가짜 `getContext`): 배치 3가지, `play`·`watch` 전환, 안내 문구(6.6, 혼자 남았을 때 "{N}점만 더 얻으면 이겨요"와 `{N}` 계산 포함), 점수 띠, 작은 판 상태 배지, 관전자, 탈락 안내, 결과 창(승·무승부·시간 종료·기권 끝·승부가 정해져 끝).
- 상호작용: 포인터 누름·끌기·뗌, 정밀 포인터 올림, 키보드, 쿨다운 중 누름 무시, 자동 떨어뜨리기 3초 안내와 `tick`.
- 공통 이음매: `useRoomChannel`(구독자가 있으면 구독자에게만, 없으면 기존 `signal` 상태), `RoomPage`(과일 쌓기 방은 컴퓨터 추가를 넘기지 않음), 대기실 빈자리 메뉴에 "친구 초대"만, 등록(선반·로비·규칙 6장·상자 그림·전적 탭·"평균 점수"), `noEmoji`.
- 최종: 실제 브라우저에서 3계정(PC 1280×860, 휴대폰 세로 360, 휴대폰 가로)으로 한 판 끝까지(끌어 놓기, 자동 떨어뜨리기, 합치기 점수, 상대 판 보간, 탈락 뒤 크게 보기, 새로고침 이어 하기, 탭 가렸다 돌아오기, 연결 끊었다 붙이기, 10분 상한, 기권, 결과 창, 다음 게임), 과일이 많은 판의 휴대폰 프레임 확인, 기존 세 게임 한 판씩 회귀.

## 8. 범위 밖

- 공격·방해(상대 판에 과일 보내기 등) 모드.
- 컴퓨터 플레이어.
- 최고 점수 순위표(기존 승률 순위표는 다른 게임처럼 자동으로 생긴다).
- 서버가 물리를 다시 계산해 점수를 검증하는 것, 조작 방지.
- 같은 계정으로 탭 두 개를 열었을 때 두 판을 하나로 맞추기(각 탭이 따로 돌고 서버 점수는 큰 쪽이 된다).
- 방 옵션(경기 시간·자동 떨어뜨리기 시간 바꾸기), 다시 보기.

## 9. 구현 순서 제안

1. 백엔드 공통(`GameAction` 칸, `GameType.supportsBots`·`Room.addBot` 거절, 오류 코드).
2. 엔진(`Stacker`·점수 검증 → 탈락·기권·끝·승패 → 신호 검증) → 세션·화면·등록, 통합 테스트.
3. 프론트 `engine/*`(prng → world·game → snapshot·interpolate·persist·reconcile)와 단위 테스트.
4. 프론트 공통 이음매(타입, 신호 구독, 컴퓨터 메뉴 감추기, 소리) → 그림·캔버스 → 내 판·입력 → 보고·신호 훅 → 작은 판·배치 → 결과·규칙·상자·등록.
5. 실제 브라우저 확인(특히 휴대폰 성능).

## 10. 위험과 대응

- 점수 보고가 잦아 방송이 무거워짐 → 500 ms 묶기로 사람마다 초당 2번까지(5명 방에서 초당 행동 10개, 화면은 사람·점수·상태뿐이라 작다). 캔버스는 React 렌더와 떨어져 있다.
- 판 신호가 방을 채움 → 250 ms 간격·1200글자 상한·서버 200 ms 간격. 5명 방에서 초당 신호 20개 × 받는 사람 수.
- 휴대폰에서 과일이 많으면 느려짐 → 스프라이트·해상도 배율 2 상한·작은 판 초당 30번. 그래도 못 따라가면 판이 느리게 흐르고(R16) 상한이 끝을 보장한다. 만들면서 실제 기기로 확인한다(받아들인 한계).
- 기기마다 물리 결과가 다름 → 받아들인 한계. 같은 과일 순서(R4)만 보장한다.
- 조작한 브라우저가 탈락을 보고하지 않거나 점수를 꾸밈 → 받아들인 한계. 상한 10분이 기다림을 끝내고, 점수 상한(R19)이 터무니없는 값만 막는다. 꾸민 점수로 R26 (나)의 끝을 앞당길 수도 있지만 꾸민 점수로 이기는 것과 같은 한계다.
- 탭을 오래 가렸다 돌아오면 한꺼번에 따라잡느라 잠깐 굳음 → 한 틱 300걸음·12 ms 상한과 "따라잡는 중…" 안내.
- 저장이 1초 간격이라 새로고침하면 최대 1초 전 판으로 돌아가 그사이 합친 점수를 한 번 더 얻을 수 있음 → 점수 조작을 받아들인 것과 같은 수준이라 그대로 둔다.

## 11. 결정과 이유

| ID | 결정 | 이유 |
|---|---|---|
| D1 | 판 360×540, 선 y = 90, 과일 반지름 11~80, 물리 값은 R3 | 2:3 판이 세로 휴대폰·PC 옆 작은 판 모두에 맞는다. 수박 지름(160)이 판 폭의 44%라 수박 두 개가 나란히 놓이고, 체리(지름 22)는 폭 220px 판에서도 13px로 보인다. 숫자는 `engine/constants.ts` 한 곳에 둔다. |
| D2 | 합칠 때 점수 = `level × (level + 1) / 2`(1, 3, 6 … 66), 수박 두 개는 사라지며 66점 | 큰 과일일수록 값지되 표가 단순하다. 수박 두 개가 사라지면 판이 넓어져 끝까지 갈 이유가 생긴다. |
| D3 | 과일 순서는 mulberry32의 `n`번째 출력을 바로 셈하는 `levelAt(seed, n)` | 상태가 숫자 하나씩 오르는 생성기라 `n`번째를 순서대로 돌리지 않고 구할 수 있다. 새로고침 뒤 `dropIndex`만으로 이어 가고, 32비트 정수 연산(`Math.imul`)만 써서 모든 브라우저에서 같은 값이 나온다. 확인 값을 문서에 박아 테스트로 지킨다. |
| D4 | 판의 시계는 경기 경과 시간을 따라가고, 10초 자동 떨어뜨리기·2초 선 넘김·쿨다운은 판의 시계로 브라우저가 지킨다. 탭을 가려도 멈추지 않는다. 서버는 이 셋을 검사하지 않는다 | 서버는 물리를 볼 수 없어 지킬 수 없다. 경과 시간에 묶으면 탭 가리기·새로고침·저장 지우기로 판을 멈추거나 되돌릴 수 없고(정직한 브라우저 기준), 끊김 중에도 판이 도는 승인 설계와 한 규칙으로 맞는다. 타이머를 걸음 수로 세면 느린 기기에서도 판 안의 시간이 일관된다. |
| D5 | 점수 보고는 `/actions`의 `SCORE`로 하되 500 ms에 한 번까지로 묶고 늘 누적 총점을 보낸다 | 승인 설계는 "합칠 때마다 보고"다. 그런데 행동 경로는 받아들일 때마다 방 정보와 사람마다 화면을 방송하고 타이머를 다시 건다. 연쇄 합치기를 하나하나 보내면 5명 방에서 초당 수십 번의 방송이 생긴다. 모든 합치기가 500 ms 안에 보고에 담기고 총점이라 빠뜨림이 없다. 행동 경로를 쓰는 이유는 받아들임·거절에 답이 오고(감시와 맞음) 화면으로 모두에게 점수가 퍼지기 때문이다. |
| D6 | "말이 안 되게 뛴 점수"는 누적 상한 `22 × (경과 ms ÷ 500 + 5)`로 본다 | 과일 하나의 값어치를 `V(11) = 33`, `V(L) = 점수(L) ÷ 2 + V(L + 1) ÷ 2`로 두면 `판의 점수 + 판 위 과일 값어치의 합 = 떨어뜨린 과일 값어치의 합`이 늘 성립한다. 떨어뜨릴 수 있는 가장 큰 과일(감)의 값어치가 21.28125라 점수는 `22 × 떨어뜨린 횟수`를 넘을 수 없고, 쿨다운 500 ms라 떨어뜨린 횟수는 `경과 ÷ 500 + 1`을 넘을 수 없다. 여유 4번(2초)은 시계 차이용이다. 한 번의 큰 연쇄(최대 286점)도 이 상한 안이라 정직한 브라우저는 걸리지 않는다. |
| D7 | 판 신호는 `GameAction`의 새 칸 `board`(문자열)에 과일마다 5글자로 싣는다. 점수는 새 칸 `score` | 기존 칸(`index`, `cardIds`)을 다른 뜻으로 돌려 쓰면 읽기 어렵고 `cardIds`(정수 목록)는 JSON이 3배 길다. 과일 40개 판이 205글자다. 서버는 길이·글자표만 보면 되어 풀 필요가 없다. 생성자를 더해 기존 호출부는 그대로다. |
| D8 | 신호는 지금 경로 그대로 보낸 사람에게도 돌아가고, 화면이 자기 신호를 버린다 | `RoomService.sendSignal`을 "보낸 사람 빼고"로 바꾸면 도둑잡기 신호 동작이 바뀐다. 한 사람에게 초당 4개의 작은 메시지가 더 가는 값으로 기존 게임을 건드리지 않는다. |
| D9 | `useRoomChannel`에 신호 구독(`subscribeSignal`)을 더하고, 구독자가 있으면 `signal` 상태를 건드리지 않는다 | `signal` 상태는 마지막 하나만 남고(여러 사람의 판 신호가 한 렌더에 묶이면 사라진다) 신호마다 방 화면 전체가 다시 그려진다. 구독은 ref로 바로 넘겨 캔버스만 갱신한다. 구독자가 없는 게임은 지금과 같다. |
| D10 | 차례 개념은 모두 비운다: 강조 테두리·사람별 타이머 없음, 플레이 순서 섞기는 참가자 순서로만, `pendingActors` 빈 목록, `stepKey`는 `status:startedAt`, 화면에 `lastAutoActorIds`·`autoActSeq`·`events` 없음. `deadline`은 경기 상한, `autoAct`는 상한에 경기를 끝낸다 | 차례가 없는 게임이다. `deadline`·`autoAct`를 경기 상한에 쓰면 방의 타이머(`TurnTimer`·`rearm`)를 고치지 않고 10분 상한이 서버에서 보장된다. `pendingActors`는 컴퓨터 구동만 쓰는데 컴퓨터가 없다. |
| D11 | 보고를 멈춘 사람에 대한 더 촘촘한 서버 규칙은 두지 않는다(10분 상한과 60초 끊김 기권이 전부) | 정직한 브라우저는 D4로 늘 진행한다(가려도 자동으로 떨어진다). 연결이 끊기면 60초 기권이 있다. 조작한 브라우저는 판 신호·점수를 꾸밀 수 있어 "신호가 끊기면 탈락" 같은 규칙으로는 못 막고, 느린 기기의 정직한 사람만 다친다. 탈락한 사람은 기다리지 않고 나가도 점수가 남는다(R29). |
| D12 | 탈락한 사람은 "게임 중"이 아니다(나가도·끊겨도 기권 아님). 라운드 기록은 끝까지 한 사람만, `FORFEIT` 끝은 경기만 기록한다 | 탈락한 사람은 할 일이 없어 붙잡아 둘 이유가 없다(도둑잡기 끝낸 사람과 같다). 기권이나 상대의 기권으로 잘린 점수를 "평균 점수"에 넣으면 평균이 뜻을 잃는다(페이퍼 사파리도 기권 끝은 라운드를 기록하지 않는다). |
| D13 | 기권하지 않은 사람이 한 명만 남고 그 사람이 살아 있으면 곧바로 끝내 승리로 한다(이유 `FORFEIT`) | 다른 게임의 "혼자 남으면 승리"와 같다. 겨룰 상대가 없는데 혼자 10분을 채우게 하지 않는다. R26 (나)에서 견줄 사람이 없는 경우로 한 규칙에 들어간다. |
| D14 | 저장은 `localStorage`, 키는 방 코드 + 회원 id, 무효화는 `startedAt` + `seed` + 판 번호 | 방 코드는 다음 게임에도 같아 경기를 가리려면 `startedAt`이 필요하고, 서버가 경기 id를 화면에 주지 않아 다른 게임의 결과 창 키와 같은 방식(`startedAt`)을 쓴다. 한 기기를 여러 계정이 쓸 수 있어 회원 id를 넣는다. `localStorage`라 탭을 닫았다 열어도 이어진다. |
| D15 | 저장된 판이 없이 게임 중에 들어오면 빈 판으로 처음부터 지금까지 따라잡는다 | D4와 한 규칙이다. 저장을 지워 깨끗한 판을 얻는 길을 막고(그동안의 자동 떨어뜨리기가 쌓인다) 따로 예외를 두지 않는다. |
| D16 | 컴퓨터 지원 여부는 `GameType.supportsBots()`(서버)와 `GameModule.supportsBots`(화면)에 둔다 | 서버 거절은 방 도메인(`Room.addBot`)에서 게임 종류에 묻는 것이 가장 가깝다. 화면은 이미 게임 모듈이 인원·이름을 갖고 있어 같은 곳에 둔다. 방 응답을 넓히지 않는다. |
| D17 | 그리기는 캔버스, 과일 그림의 원천은 도형 자료 하나(SVG 컴포넌트와 캔버스 스프라이트가 함께 쓴다) | 과일 수십 개를 프레임마다 SVG 요소로 옮기면 휴대폰에서 무겁다. 도형 자료를 함께 쓰면 "인라인 SVG 그림"이라는 원칙과 캔버스 성능을 모두 얻고, 그림이 jsdom에서도 검사된다. |
| D18 | 물리·규칙은 DOM 없는 `engine/*`, 그리기는 `Painter` 인터페이스 뒤 | jsdom에는 캔버스가 없다. 엔진을 순수하게 두면 실제 `matter-js`로 규칙을 단위 테스트하고, 그리기는 가짜 `Painter`로 검사한다. |
| D19 | 탈락한 판은 2초마다 멈춘 모습을 계속 보낸다 | 서버가 판을 저장하지 않으므로(승인 설계) 나중에 들어온 관전자·새로고침한 사람이 탈락한 판을 볼 길이 이것뿐이다. |
| D20 | 상대 판 보간은 id 없이 "같은 단계·가장 가까운 것" 짝짓기 | 과일마다 id를 실으면 신호가 20% 넘게 길어진다. 250 ms 사이 과일은 조금만 움직이므로 가까운 것 짝짓기로 충분하고, 틀려도 한 틱 뒤에 바로잡힌다. |
| D21 | 모든 점수·탈락 보고의 거절은 한 코드 `FRUIT_STACK_SCORE_REJECTED`이고 화면은 조용히 넘긴다 | 정직한 브라우저는 받을 일이 없고 사용자가 할 수 있는 일도 없다. 원인별 코드를 나누면 조작하는 쪽에만 도움이 된다. |
| D22 | 내 판 탈락 뒤 1.5초 "가득 찼어요!"를 보이고 `watch` 모드로 바꾼다 | 탈락 순간을 알아챌 틈을 주고, 승인 설계의 "남은 판을 크게 본다"로 넘어간다. |
| D23 | 살아 있는 사람이 한 명이고 그 점수가 다른 겨루는 사람 모두보다 엄격히 높으면 그 순간 끝낸다(이유 `DECIDED`). 견주는 대상에서 기권한 사람은 뺀다. 라운드 기록은 낸다. 마지막 사람에게는 "{N}점만 더 얻으면 이겨요"를 보인다 | 사용자 결정(2026-10-13, 승부가 정해지면 바로 끝내기). 점수는 줄지 않으므로 그 순간 승자가 바뀔 길이 없어 나머지 사람을 최대 10분 기다리게 할 이유가 없다. 동점은 아직 무승부가 될 수 있어 끝내지 않는다. 기권자는 점수와 상관없이 패배라(R27) 견주면 이미 이긴 사람이 끝나지 않는다. 탈락한 사람들의 점수는 끝까지 한 값이고 승자의 점수도 규칙이 정한 끝의 값이라(상한 종료와 같다) 평균 점수에 넣는다. 남은 거리를 보여 주지 않으면 마지막 사람이 왜 계속하는지·언제 끝나는지 알 수 없다. |
