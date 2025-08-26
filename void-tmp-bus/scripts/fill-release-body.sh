#!/usr/bin/env bash
set -euo pipefail
R="${1:-report.json}"
TPL="${2:-ceremony/GITHUB_RELEASE_BODY.md}"
OUT="${3:-ceremony/GITHUB_RELEASE_BODY_filled.md}"

# Check if report exists
if [[ ! -f "$R" ]]; then
  echo "❌ Report file not found: $R"
  exit 1
fi

# Check if template exists
if [[ ! -f "$TPL" ]]; then
  echo "❌ Template file not found: $TPL"
  exit 1
fi

# Extract values from report.json
val(){ jq -r ".$1 // \"N/A\"" "$R" 2>/dev/null || echo "N/A"; }

LOCAL_PCT=$(val LOCAL_PCT)
HEALTH_AVG=$(val HEALTH_AVG)
KOHANIST_AVG=$(val KOHANIST_AVG)
OFFLINE_WINDOW=$(val OFFLINE_WINDOW)
EVENTS_TOTAL=$(val EVENTS_TOTAL)

# Fill placeholders
sed -e "s/{LOCAL_PCT}/$LOCAL_PCT/g" \
    -e "s/{HEALTH_AVG}/$HEALTH_AVG/g" \
    -e "s/{KOHANIST_AVG}/$KOHANIST_AVG/g" \
    -e "s/{OFFLINE_WINDOW}/$OFFLINE_WINDOW/g" \
    -e "s/{EVENTS_TOTAL}/$EVENTS_TOTAL/g" \
    "$TPL" > "$OUT"

echo "✅ Release body filled: $OUT"
echo "   LOCAL_PCT: $LOCAL_PCT"
echo "   HEALTH_AVG: $HEALTH_AVG" 
echo "   KOHANIST_AVG: $KOHANIST_AVG"
echo "   OFFLINE_WINDOW: $OFFLINE_WINDOW"
echo "   EVENTS_TOTAL: $EVENTS_TOTAL"