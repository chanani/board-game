#!/usr/bin/env bash
# 백엔드(Spring Boot)와 프론트엔드(Vite) 개발 서버를 함께 켭니다.
# 사용법: ./start.sh        (끌 때는 Ctrl+C — 두 서버가 함께 종료됩니다)
# 포트 지정: BACKEND_PORT=9090 FRONTEND_PORT=3000 ./start.sh
# 지정한(기본 8080/5173) 포트가 사용 중이면 다음 빈 포트를 자동으로 씁니다.

set -euo pipefail
set -m

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT/.logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
BACKEND_PID=""
FRONTEND_PID=""

port_in_use() {
  lsof -iTCP:"$1" -sTCP:LISTEN -n -P >/dev/null 2>&1
}

find_free_port() {
  local port=$1
  while port_in_use "$port"; do
    port=$((port + 1))
  done
  echo "$port"
}

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "❌ '$1' 명령을 찾을 수 없어요. 먼저 설치해 주세요." >&2
    exit 1
  fi
}

stop_group() {
  local pid=$1
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  fi
}

cleanup() {
  trap - EXIT INT TERM
  echo ""
  echo "🛑 서버를 종료하는 중…"
  stop_group "$FRONTEND_PID"
  stop_group "$BACKEND_PID"
  wait 2>/dev/null || true
  echo "종료했어요."
  exit 0
}

wait_for_http() {
  local url=$1 pid=$2 name=$3 log=$4 seconds=$5
  local waited=0
  while ! curl -s -o /dev/null "$url"; do
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "❌ $name 서버가 시작하지 못했어요. 로그 마지막 부분:" >&2
      tail -n 30 "$log" >&2
      exit 1
    fi
    if [ "$waited" -ge "$seconds" ]; then
      echo "❌ $name 서버가 ${seconds}초 안에 준비되지 않았어요. 로그: $log" >&2
      exit 1
    fi
    sleep 1
    waited=$((waited + 1))
  done
}

require java
require mvn
require npm
require curl
require lsof

mkdir -p "$LOG_DIR"
BACKEND_PORT=$(find_free_port "${BACKEND_PORT:-8080}")
FRONTEND_PORT=$(find_free_port "${FRONTEND_PORT:-5173}")

if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "📦 프론트엔드 패키지를 설치하는 중…"
  npm --prefix "$ROOT/frontend" install
fi

trap cleanup EXIT INT TERM

echo "☕ 백엔드를 켜는 중… (포트 $BACKEND_PORT, 로그: $BACKEND_LOG)"
mvn -q -f "$ROOT/backend/pom.xml" spring-boot:run \
  -Dspring-boot.run.arguments="--server.port=$BACKEND_PORT" >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
wait_for_http "http://localhost:$BACKEND_PORT/api/members/me" "$BACKEND_PID" "백엔드" "$BACKEND_LOG" 180

echo "⚛️  프론트엔드를 켜는 중… (포트 $FRONTEND_PORT, 로그: $FRONTEND_LOG)"
BACKEND_PORT="$BACKEND_PORT" npm --prefix "$ROOT/frontend" run dev -- \
  --host 127.0.0.1 --port "$FRONTEND_PORT" --strictPort >"$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
wait_for_http "http://127.0.0.1:$FRONTEND_PORT/" "$FRONTEND_PID" "프론트엔드" "$FRONTEND_LOG" 60

cat <<EOF

✅ 준비됐어요!
   👉 http://localhost:$FRONTEND_PORT
   (두 번째 플레이어는 http://127.0.0.1:$FRONTEND_PORT 로 열면 쿠키가 분리돼요)
   백엔드 API: http://localhost:$BACKEND_PORT

   끄려면 Ctrl+C 를 누르세요.
EOF

while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do
  sleep 2
done
echo "⚠️  서버 하나가 멈췄어요. 로그를 확인하세요: $LOG_DIR" >&2
