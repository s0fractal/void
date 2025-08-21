#!/usr/bin/env bash
# Capture metrics snapshot for ceremony documentation

set -euo pipefail

TIMESTAMP=$(date -u +%Y%m%d-%H%M%S)
OUTPUT_DIR="${1:-./ceremony-artifacts}"
METRICS_URL="${METRICS_URL:-http://localhost:9479/metrics}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"

echo "📸 Capturing metrics snapshot at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# 1. Raw metrics from exporter
echo "  → Fetching raw metrics..."
curl -sS "$METRICS_URL" > "$OUTPUT_DIR/metrics-raw-$TIMESTAMP.txt"

# 2. Key metrics in JSON
echo "  → Extracting key metrics..."
cat > "$OUTPUT_DIR/metrics-key-$TIMESTAMP.json" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "timestamp_unix": $(date +%s),
  "metrics": {
EOF

# Extract key metrics
METRICS=$(curl -sS "$METRICS_URL")
for metric in session_id relay_connected ws_connected spool_depth events_ingested_total events_forwarded_total lease_age_seconds; do
  value=$(echo "$METRICS" | awk "/^tmpbus_$metric[[:space:]]/ {print \$2; exit}")
  if [[ -n "$value" ]]; then
    echo "    \"tmpbus_$metric\": $value," >> "$OUTPUT_DIR/metrics-key-$TIMESTAMP.json"
  fi
done

# Remove trailing comma and close JSON
sed -i '$ s/,$//' "$OUTPUT_DIR/metrics-key-$TIMESTAMP.json"
cat >> "$OUTPUT_DIR/metrics-key-$TIMESTAMP.json" <<EOF
  }
}
EOF

# 3. Prometheus instant queries (if available)
if curl -s "$PROMETHEUS_URL/-/healthy" >/dev/null 2>&1; then
  echo "  → Querying Prometheus..."
  
  # Rate calculations
  for query in \
    "rate(tmpbus_events_ingested_total[5m])*60|events_per_minute" \
    "tmpbus:spool_growth_2m|spool_growth_2min" \
    "tmpbus:cmd_latency:p95|cmd_latency_p95" \
    "up{job='tmpbus'}|exporter_up"
  do
    IFS='|' read -r expr name <<< "$query"
    result=$(curl -sS -G "$PROMETHEUS_URL/api/v1/query" \
      --data-urlencode "query=$expr" \
      --data-urlencode "time=$(date +%s)" 2>/dev/null || echo "{}")
    
    echo "  $name: $result" >> "$OUTPUT_DIR/prometheus-queries-$TIMESTAMP.json"
  done
fi

# 4. Markdown summary
echo "  → Creating markdown summary..."
cat > "$OUTPUT_DIR/metrics-summary-$TIMESTAMP.md" <<'EOF'
# Void TmpBus Metrics Snapshot

**Captured**: $(date -u +%Y-%m-%dT%H:%M:%SZ)

## System Status

| Metric | Value | Status |
|--------|-------|--------|
EOF

# Parse and format key metrics
session_id=$(echo "$METRICS" | awk '/^tmpbus_session_id/ {print $2}' | head -1)
relay=$(echo "$METRICS" | awk '/^tmpbus_relay_connected/ {print $2}' | head -1)
ws=$(echo "$METRICS" | awk '/^tmpbus_ws_connected/ {print $2}' | head -1)
spool=$(echo "$METRICS" | awk '/^tmpbus_spool_depth/ {print $2}' | head -1)
ingested=$(echo "$METRICS" | awk '/^tmpbus_events_ingested_total/ {print $2}' | head -1)
forwarded=$(echo "$METRICS" | awk '/^tmpbus_events_forwarded_total/ {print $2}' | head -1)
lease_age=$(echo "$METRICS" | awk '/^tmpbus_lease_age_seconds/ {print $2}' | head -1)

# Add to markdown
{
  echo "| Session ID (hash) | ${session_id:-N/A} | $([ "${session_id:-0}" != "0" ] && echo '✅' || echo '❌') |"
  echo "| Relay Connected | ${relay:-0} | $([ "${relay:-0}" = "1" ] && echo '✅ Connected' || echo '⚠️ Offline') |"
  echo "| WebSocket Connected | ${ws:-0} | $([ "${ws:-0}" = "1" ] && echo '✅ Connected' || echo 'ℹ️ Disconnected') |"
  echo "| Spool Depth | ${spool:-0} | $([ "${spool:-0}" -lt 100 ] && echo '✅ Normal' || echo '⚠️ High') |"
  echo "| Events Ingested | ${ingested:-0} | - |"
  echo "| Events Forwarded | ${forwarded:-0} | $([ "${forwarded:-0}" = "${ingested:-0}" ] && echo '✅ All forwarded' || echo '⚠️ Buffering') |"
  echo "| Lease Age | ${lease_age:-0}s | $([ "${lease_age%.*}" -lt 60 ] && echo '✅ Fresh' || echo '⚠️ Aging') |"
} >> "$OUTPUT_DIR/metrics-summary-$TIMESTAMP.md"

cat >> "$OUTPUT_DIR/metrics-summary-$TIMESTAMP.md" <<'EOF'

## Independence Mode Readiness

- [x] Exporter accessible
- [$([ "${relay:-0}" = "1" ] && echo 'x' || echo ' ')] Relay connected (or acceptable degradation)
- [$([ "${spool:-0}" -lt 100 ] && echo 'x' || echo ' ')] Spool depth < 100
- [$([ "${lease_age%.*}" -lt 600 ] && echo 'x' || echo ' ')] Session fresh (< 10 min)

## Artifacts

- Raw metrics: `metrics-raw-*.txt`
- Key metrics JSON: `metrics-key-*.json`
- Prometheus queries: `prometheus-queries-*.json` (if available)

---

*432Hz resonance maintained* 🖤
EOF

# 5. Create tarball
echo "  → Creating archive..."
cd "$OUTPUT_DIR"
tar -czf "metrics-snapshot-$TIMESTAMP.tar.gz" \
  "metrics-raw-$TIMESTAMP.txt" \
  "metrics-key-$TIMESTAMP.json" \
  "metrics-summary-$TIMESTAMP.md" \
  "prometheus-queries-$TIMESTAMP.json" 2>/dev/null || true
cd - >/dev/null

echo "✅ Metrics captured to: $OUTPUT_DIR/"
echo "   Summary: $OUTPUT_DIR/metrics-summary-$TIMESTAMP.md"
echo "   Archive: $OUTPUT_DIR/metrics-snapshot-$TIMESTAMP.tar.gz"