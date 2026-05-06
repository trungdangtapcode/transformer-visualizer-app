#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Vietnamese NLP Visualizer — Startup Script
# Launches 2 services:
#   1. FastAPI backend (port 8000) — PhoBERT attention API
#   2. Unified Frontend (port 5173) — React + Svelte single build
# ═══════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$SCRIPT_DIR/venv"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║       VIETNAMESE NLP VISUALIZER                         ║"
echo "║       Transformer Explorer + Attention Analyzer          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Cleanup function to kill all background processes on exit
cleanup() {
    echo ""
    echo "Shutting down all services..."
    kill $FASTAPI_PID $FRONTEND_PID 2>/dev/null || true
    wait $FASTAPI_PID $FRONTEND_PID 2>/dev/null || true
    echo "All services stopped."
}
trap cleanup EXIT INT TERM

# ─── 1. FastAPI Backend (PhoBERT) ───────────────────────────────
echo "Starting FastAPI backend (PhoBERT)..."
source "$VENV_DIR/bin/activate"
cd "$SCRIPT_DIR"
python -m uvicorn app:app --host 0.0.0.0 --port 8000 &
FASTAPI_PID=$!
echo "   PID: $FASTAPI_PID -> http://localhost:8000"

# ─── 2. Unified Frontend (React + Svelte) ──────────────────────
echo "Starting unified frontend (React + Svelte)..."
cd "$SCRIPT_DIR/frontend"
npm run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!
echo "   PID: $FRONTEND_PID -> http://localhost:5173"

echo ""
echo "==================================================="
echo "  All services starting!"
echo ""
echo "  Open: http://localhost:5173"
echo ""
echo "  Services:"
echo "    * Frontend (React + Svelte):  http://localhost:5173"
echo "    * FastAPI (PhoBERT):          http://localhost:8000"
echo ""
echo "  Press Ctrl+C to stop all services."
echo "==================================================="

# Wait for any process to exit
wait
