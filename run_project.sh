#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOG_DIR="$ROOT_DIR/.logs"

BACKEND_PORT="${BACKEND_PORT:-8001}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
INSTALL_DEPS=0

usage() {
  cat <<'EOF'
Usage: ./run_project.sh [options]

Options:
  --install      Install backend/frontend dependencies before start
  --no-install   Skip dependency installation (default)
  -h, --help     Show this help

Environment overrides:
  BACKEND_PORT   Backend port (default: 8001)
  FRONTEND_PORT  Frontend port (default: 3000)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --install)
      INSTALL_DEPS=1
      shift
      ;;
    --no-install)
      INSTALL_DEPS=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

require_cmd python3
require_cmd npm
require_cmd curl

mkdir -p "$LOG_DIR"

if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  ENV_NOTICE="Warning: $BACKEND_DIR/.env was not found."
  if [[ -f "$BACKEND_DIR/.env.example" ]]; then
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    ENV_NOTICE="Created $BACKEND_DIR/.env from .env.example. Update values before production use."
  fi
  cat <<EOF
$ENV_NOTICE
Create it with at least:
  OPENAI_API_KEY=...
  LLM_PROVIDER=openai
  LLM_MODEL=gpt-4o-mini
  MONGO_URL=mongodb://localhost:27017/mission_platform
  JWT_SECRET=change-this
Optional local testing with OpenRouter:
  OPENROUTER_API_KEY=...
  LLM_PROVIDER=openrouter
EOF
fi

if [[ ! -d "$BACKEND_DIR/.venv" ]]; then
  echo "Creating backend virtual environment..."
  python3 -m venv "$BACKEND_DIR/.venv"
fi

if [[ "$INSTALL_DEPS" -eq 1 ]]; then
  echo "Installing backend dependencies..."
  "$BACKEND_DIR/.venv/bin/pip" install -r "$BACKEND_DIR/requirements.txt"
  echo "Installing frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm install)
fi

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "Frontend dependencies missing. Running npm install..."
  (cd "$FRONTEND_DIR" && npm install)
fi

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    echo ""
    echo "Stopping backend (PID $BACKEND_PID)..."
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Starting backend on http://localhost:$BACKEND_PORT ..."
(
  cd "$BACKEND_DIR"
  source .venv/bin/activate
  exec uvicorn server:app --host 0.0.0.0 --port "$BACKEND_PORT" --reload
) >"$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

BACKEND_READY=0
for _ in {1..45}; do
  if curl -fsS "http://localhost:$BACKEND_PORT/api/health" >/dev/null 2>&1; then
    BACKEND_READY=1
    break
  fi
  sleep 1
done

if [[ "$BACKEND_READY" -ne 1 ]]; then
  echo "Backend failed to become healthy. Last backend logs:"
  tail -n 60 "$LOG_DIR/backend.log" || true
  exit 1
fi

echo "Backend ready. Logs: $LOG_DIR/backend.log"
echo "Starting frontend on http://localhost:$FRONTEND_PORT ..."
echo "Press Ctrl+C to stop both services."

cd "$FRONTEND_DIR"
PORT="$FRONTEND_PORT" BROWSER=none npm start
