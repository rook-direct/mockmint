#!/bin/bash
# MockMint Development Server
# Starts both the Python API (port 3001) and Next.js dev server (port 3000)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Cleanup function
cleanup() {
  echo -e "\n${YELLOW}Shutting down...${NC}"
  if [ -n "$API_PID" ]; then
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
  if [ -n "$NEXT_PID" ]; then
    kill "$NEXT_PID" 2>/dev/null || true
    wait "$NEXT_PID" 2>/dev/null || true
  fi
  echo -e "${GREEN}Done.${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Check Python deps
echo -e "${GREEN}Checking Python dependencies...${NC}"
pip3 install --break-system-packages -q -r api/requirements.txt 2>/dev/null || {
  echo -e "${YELLOW}Installing Python dependencies...${NC}"
  pip3 install --break-system-packages -r api/requirements.txt
}

# Start Python API server
echo -e "${GREEN}Starting API server on port 3001...${NC}"
python3 api/server.py &
API_PID=$!
sleep 2

# Check API is up
if ! kill -0 "$API_PID" 2>/dev/null; then
  echo "ERROR: API server failed to start"
  exit 1
fi

echo -e "${GREEN}API server running (PID: $API_PID)${NC}"

# Start Next.js dev server
echo -e "${GREEN}Starting Next.js dev server on port 3000...${NC}"
npm run dev &
NEXT_PID=$!

echo -e "\n${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  MockMint is running!${NC}"
echo -e "${GREEN}  Frontend: http://localhost:3000${NC}"
echo -e "${GREEN}  API:      http://localhost:3001${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}\n"

# Wait for either process to exit
wait -n "$API_PID" "$NEXT_PID" 2>/dev/null || true
