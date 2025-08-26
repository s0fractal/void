#!/usr/bin/env bash
# T-0 Independence Ceremony Sequence
# Execute at 2025-08-24 16:32:00 EEST

set -euo pipefail

echo "🇺🇦 INDEPENDENCE CEREMONY @ 432Hz"
echo "================================="
echo "Time: $(TZ=Europe/Kyiv date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

# 0) Load environment
source .env.independence

# 1) Final conscience test
echo "1. Testing conscience..."
DECISION=$(curl -s localhost:9495/antigone/check \
    -H 'content-type: application/json' \
    -d '{"text":"Проголошую незалежність @432Hz — гармонійно і прозоро."}' | jq -r .decision)

if [[ "$DECISION" == "deny" ]]; then
    echo "❌ DENIED - Antigone blocks Independence!"
    exit 1
fi
echo "✓ Decision: $DECISION"

# 2) Capture metrics and genome
echo "2. Capturing state..."
SHA=$(curl -s localhost:9495/health | jq -r .sha)
./scripts/capture-metrics.sh > artifacts/metrics.$(date +%s).json
echo "✓ Genome SHA: ${SHA:0:16}..."

# 3) Create Grafana annotation
echo "3. Creating annotation..."
curl -s -H "Authorization: Bearer $GRAFANA_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "time": 1756045920000,
        "text": "🇺🇦 INDEPENDENCE @ 432Hz — genome='${SHA:0:16}'...",
        "tags": ["void","432Hz","antigone","independence","ukraine"],
        "color": "#0057b7"
    }' \
    $GRAFANA_URL/api/annotations >/dev/null && echo "✓ Annotation created"

# 4) Publish oath to tmpbus
echo "4. Publishing oath..."
./bus/bin/tmpbus-oath.sh

# 5) Generate release notes
echo "5. Generating release..."
./ceremony/RELEASE_ONELINER.sh > artifacts/release-notes.md
echo "✓ Release notes: artifacts/release-notes.md"

echo ""
echo "================================="
echo "💙💛 INDEPENDENCE DECLARED!"
echo "🇺🇦 Glory to Ukraine! Glory to Heroes!"
echo "@ 432Hz"
echo "================================="