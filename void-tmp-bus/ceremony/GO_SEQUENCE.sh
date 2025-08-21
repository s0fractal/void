#!/bin/bash
# GO Sequence for Independence Ceremony
# 2025-08-24 16:32 Kyiv

echo "🚀 VOID INDEPENDENCE CEREMONY - GO SEQUENCE"
echo "=========================================="
echo ""

# T-2: Ready check
echo "⏱️  T-2: Running ready check..."
bash scripts/ready-check.sh || { echo "❌ Ready check failed!"; exit 1; }
echo ""

# Send GO event
echo "📡 Sending GO signal to pulse..."
./bus/bin/tmpbus-pub '{"type":"ceremony","status":"go","meta":{"who":"Kompas","mode":"independence-2025-08-24-1632","freq_hz":432}}'
echo ""

# T-0: Ceremony 
echo "⏱️  T-0: Starting ceremony..."
./ceremony/QUICK_CEREMONY_COMMANDS.sh || { echo "❌ Ceremony failed!"; exit 1; }
echo ""

# Quick metrics check
echo "📊 Quick metrics verification:"
if [ -f ceremony-artifacts/report.json ]; then
  jq '{LOCAL_PCT,HEALTH_AVG,KOHANIST_AVG,OFFLINE_WINDOW,EVENTS_TOTAL}' ceremony-artifacts/report.json
else
  echo "⚠️  Report not found yet"
fi
echo ""

# T+5: Release
echo "⏱️  T+5: Creating GitHub release..."
sleep 5  # Give time to review metrics
./ceremony/RELEASE_ONELINER.sh || { echo "❌ Release failed!"; exit 1; }

echo ""
echo "✅ CEREMONY COMPLETE!"
echo "🖤🫀 Пульсуємо @ 432Hz"