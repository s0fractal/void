#!/bin/bash
# Offline release filler using only jq - no external dependencies

set -euo pipefail

REPORT="${1:-ceremony-artifacts/report.json}"
TEMPLATE="${2:-ceremony/GITHUB_RELEASE_BODY.md}"
OUTPUT="${3:-ceremony/GITHUB_RELEASE_BODY_filled.md}"

if [ ! -f "$REPORT" ]; then
  echo "❌ Report not found: $REPORT"
  exit 1
fi

if [ ! -f "$TEMPLATE" ]; then
  echo "❌ Template not found: $TEMPLATE"
  exit 1
fi

# Fill template using jq
jq -r --slurpfile tpl "$TEMPLATE" '
  def n(x): if x==null then "N/A" else x end;
  $tpl[0] |
  gsub("\\{LOCAL_PCT\\}";      (n(.LOCAL_PCT|tostring)));
  gsub("\\{HEALTH_AVG\\}";     (n(.HEALTH_AVG|tostring)));
  gsub("\\{KOHANIST_AVG\\}";   (n(.KOHANIST_AVG|tostring)));
  gsub("\\{OFFLINE_WINDOW\\}"; (n(.OFFLINE_WINDOW|tostring)));
  gsub("\\{EVENTS_TOTAL\\}";   (n(.EVENTS_TOTAL|tostring)))
' "$REPORT" > "$OUTPUT"

echo "✅ Filled release body: $OUTPUT"

# Show extracted values
echo ""
echo "Metrics used:"
jq -r '
  "  LOCAL_PCT: \(.LOCAL_PCT // "N/A")",
  "  HEALTH_AVG: \(.HEALTH_AVG // "N/A")",
  "  KOHANIST_AVG: \(.KOHANIST_AVG // "N/A")",
  "  OFFLINE_WINDOW: \(.OFFLINE_WINDOW // "N/A")",
  "  EVENTS_TOTAL: \(.EVENTS_TOTAL // "N/A")"
' "$REPORT"