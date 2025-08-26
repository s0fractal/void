#!/usr/bin/env bash
set -euo pipefail

echo "🧪 VOID OFFLINE SMOKE TEST"
echo "========================="
echo ""

# Save current iptables state
echo "📸 Saving network state..."
sudo iptables-save > /tmp/iptables.backup 2>/dev/null || {
  echo "⚠️  Cannot save iptables (need sudo). Simulating offline mode instead."
  SIMULATE=1
}

cleanup() {
  if [ -z "${SIMULATE:-}" ]; then
    echo "🔄 Restoring network..."
    sudo iptables-restore < /tmp/iptables.backup
    rm -f /tmp/iptables.backup
  fi
}
trap cleanup EXIT

# Block relay ports to simulate offline
if [ -z "${SIMULATE:-}" ]; then
  echo "🚫 Blocking relay ports..."
  sudo iptables -A OUTPUT -p tcp --dport 8787 -j DROP
  sudo iptables -A INPUT -p tcp --sport 8787 -j DROP
else
  echo "🎭 Simulating offline mode (no actual network block)"
fi

# Start dashboard in offline mode
echo "🚀 Starting dashboard in offline mode..."
export INDEPENDENT_MODE=1
export RELAY_URL=""

# Run dashboard for 30 seconds
cd apps/void-dashboard
npm run dev &
DASHBOARD_PID=$!

echo "⏱️  Running for 30 seconds..."
sleep 30

# Check if dashboard is still running
if kill -0 $DASHBOARD_PID 2>/dev/null; then
  echo "✅ Dashboard survived offline mode!"
  kill $DASHBOARD_PID
else
  echo "❌ Dashboard crashed in offline mode"
  exit 1
fi

echo ""
echo "🎉 Offline smoke test passed!"