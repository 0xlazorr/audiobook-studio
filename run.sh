#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

PORT=${PORT:-8000}
HOST=${HOST:-"0.0.0.0"}

echo "=========================================================="
echo " Starting Audiobook Studio Web App..."
echo " Listening on: http://localhost:${PORT}"
echo "=========================================================="

python3 -m uvicorn app.main:app --host "$HOST" --port "$PORT" --reload
