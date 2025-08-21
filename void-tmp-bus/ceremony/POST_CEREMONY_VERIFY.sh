#!/bin/bash
# Post-ceremony verification (T+5)

echo "🔍 POST-CEREMONY VERIFICATION"
echo "============================"
echo ""

# Set pulse path
PULSE_PATH=${PULSE_PATH:-/tmp/void/log/pulse.jl}

# 1. Check oath in pulse
echo "📜 Oath in pulse.jl:"
if grep -F '"status":"oath"' "$PULSE_PATH" | tail -1 | jq . 2>/dev/null; then
  echo "   ✅ Oath found"
else
  echo "   ❌ Oath not found in pulse ($PULSE_PATH)"
fi
echo ""

# 2. GitHub release
echo "🚀 GitHub Release:"
TAG="independence-2025-08-24-1632"
if gh release view "$TAG" --json name,tagName,createdAt 2>/dev/null | jq .; then
  echo "   ✅ Release published"
else
  echo "   ❌ Release not found"
fi
echo ""

# 3. Current metrics
echo "📊 Current Metrics:"
curl -s http://localhost:9479/metrics | awk '
  /^tmpbus_spool_depth/ { print "   Spool Depth: " $2 }
  /^tmpbus_relay_connected/ { print "   Relay Connected: " $2 }
  /^tmpbus_ws_connected/ { print "   WS Connected: " $2 }
  /^tmpbus_events_ingested_total/ { print "   Events Total: " $2 }
  /^tmpbus_lease_age_seconds/ { 
    age = $2
    if (age < 60) status = "(fresh)"
    else if (age < 600) status = "(active)"
    else status = "(aging)"
    print "   Lease Age: " age "s " status
  }
'
echo ""

# 4. Artifacts check
echo "📦 Ceremony Artifacts:"
if [ -d ceremony-artifacts ]; then
  ls -la ceremony-artifacts/*.{json,md,sha256,tar.gz} 2>/dev/null | tail -5
else
  echo "   ❌ No artifacts directory found"
fi