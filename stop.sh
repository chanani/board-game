#!/usr/bin/env bash
# ./start.sh 로 켠 백엔드·프론트엔드 개발 서버를 종료합니다.
# 사용법: ./stop.sh

set -uo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
STATE_FILE="$ROOT/.logs/server.state"

alive() {
  [ -n "${1:-}" ] && kill -0 "$1" 2>/dev/null
}

stop_group() {
  local pid=${1:-} signal=$2
  if alive "$pid"; then
    kill "-$signal" -- "-$pid" 2>/dev/null || kill "-$signal" "$pid" 2>/dev/null || true
  fi
}

port_in_use() {
  [ -n "${1:-}" ] && lsof -iTCP:"$1" -sTCP:LISTEN -n -P >/dev/null 2>&1
}

# 이 프로젝트에서 띄운 프로세스만 종료한다 (같은 포트의 다른 프로그램은 건드리지 않음)
stop_project_listener() {
  local port=$1 pid
  for pid in $(lsof -t -iTCP:"$port" -sTCP:LISTEN -n -P 2>/dev/null); do
    if ps -p "$pid" -o command= | grep -q "$ROOT"; then
      kill -TERM "$pid" 2>/dev/null || true
    fi
  done
}

wait_until_stopped() {
  local waited=0
  while { alive "${SCRIPT_PID:-}" || port_in_use "${BACKEND_PORT:-}" || port_in_use "${FRONTEND_PORT:-}"; } && [ "$waited" -lt 15 ]; do
    sleep 1
    waited=$((waited + 1))
  done
}

if [ ! -f "$STATE_FILE" ]; then
  BACKEND_PORT=${BACKEND_PORT:-8899}
  FRONTEND_PORT=${FRONTEND_PORT:-5177}
  stop_project_listener "$BACKEND_PORT"
  stop_project_listener "$FRONTEND_PORT"
  echo "실행 정보가 없어서 포트 $BACKEND_PORT, $FRONTEND_PORT 에서 이 프로젝트 서버만 찾아 종료했어요."
  exit 0
fi

# shellcheck disable=SC1090
source "$STATE_FILE"

echo "🛑 서버를 종료하는 중… (백엔드 $BACKEND_PORT, 프론트엔드 $FRONTEND_PORT)"
if alive "${SCRIPT_PID:-}"; then
  kill -TERM "$SCRIPT_PID" 2>/dev/null || true
fi
stop_group "${FRONTEND_PID:-}" TERM
stop_group "${BACKEND_PID:-}" TERM
wait_until_stopped

if port_in_use "$BACKEND_PORT" || port_in_use "$FRONTEND_PORT"; then
  stop_group "${FRONTEND_PID:-}" KILL
  stop_group "${BACKEND_PID:-}" KILL
  stop_project_listener "$BACKEND_PORT"
  stop_project_listener "$FRONTEND_PORT"
  sleep 1
fi

rm -f "$STATE_FILE"
echo "종료했어요."
