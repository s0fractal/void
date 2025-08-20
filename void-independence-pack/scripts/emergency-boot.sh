#!/usr/bin/env bash
set -euo pipefail

echo "⚡ EMERGENCY BOOT: VOID INDEPENDENCE MODE"
echo "========================================"
echo ""
echo "Initializing autonomous operation..."
echo ""

# Environment setup
export RELAY_API_KEY=${RELAY_API_KEY:-}
export INDEPENDENT_MODE=1
export DECISION_SOURCE=local

# Create network
echo "🌐 Creating voidnet..."
docker network create voidnet || true

# Start core services
echo ""
echo "🚀 Starting core services..."

# 1. Start sensor incubator
echo "  📡 Sensor incubator..."
cd void-sensor-incubator
docker-compose up -d
cd ..

# 2. Start void-thinker
echo "  🧠 Local brain (void-thinker)..."
cd apps/void-thinker
docker build -t void/void-thinker .
docker run -d \
  --name void-thinker \
  --network voidnet \
  -p 9090:9090 \
  void/void-thinker
cd ../..

# 3. Start dashboard with independence flag
echo "  📊 Dashboard (independence mode)..."
cd apps/void-dashboard
docker build -t void/void-dashboard .
docker run -d \
  --name void-dashboard \
  --network voidnet \
  -p 8080:80 \
  -e RELAY_URL=ws://relay:8787/ws \
  -e INDEPENDENT_MODE=1 \
  void/void-dashboard
cd ../..

# 4. Start substrate event agent
echo "  💓 Substrate heartbeat..."
docker run -d \
  --name void-event-agent \
  --network voidnet \
  curlimages/curl:latest \
  sh -c 'while true; do
    curl -sS -X POST http://relay:8787/event \
      -H "content-type: application/json" \
      -d "{\"type\":\"substrate\",\"status\":\"beat\",\"meta\":{\"k\":0.9,\"source\":\"emergency-boot\"}}" \
      >/dev/null 2>&1 || true;
    sleep 10;
  done'

echo ""
echo "✅ Emergency boot complete!"
echo ""
echo "🌀 Services running:"
echo "  - Relay: ws://localhost:8787/ws"
echo "  - Dashboard: http://localhost:8080"
echo "  - Void Thinker: http://localhost:9090"
echo ""
echo "🗽 INDEPENDENCE MODE ACTIVE"
echo "  - Local decisions via void-thinker"
echo "  - Rule engine enabled"
echo "  - Offline bus queuing events"
echo ""
echo "To monitor: docker logs -f void-dashboard"
echo "To stop: docker stop relay void-thinker void-dashboard void-event-agent"
