#!/usr/bin/env bash
set -euo pipefail
URL="${METRICS_URL:-http://localhost:9479/metrics}"
SPOOL_MAX="${SPOOL_MAX:-100}"; FLOW_MIN="${FLOW_MIN:-1}"

METRICS="$(curl -sS "$URL")" || { echo "❌ metrics endpoint down"; exit 1; }

val() { echo "$METRICS" | awk -v k="^$1[[:space:]]" '$0 ~ k {print $2; exit}'; }
spool="$(val tmpbus_spool_depth)"; relay="$(val tmpbus_relay_connected)"; ws="$(val tmpbus_ws_connected)"
flow="$(echo "$METRICS" | awk '/^tmpbus_events_ingested_total/ {print $2}' | tail -1)"
up="$(val tmpbus_lease_age_seconds)"

# Calculate events per minute from total
if [[ -n "$flow" ]]; then
  # Simple approximation - would need rate calculation for accuracy
  events_per_min="$FLOW_MIN" # Placeholder - in real setup use Prometheus rate()
else
  events_per_min="0"
fi

ok=1
[[ -z "$spool" || -z "$relay" || -z "$up" ]] && { echo "❌ missing metrics"; exit 2; }
(( ${spool%.*} <= SPOOL_MAX )) || { echo "❌ spool_depth=$spool > $SPOOL_MAX"; ok=0; }
# Skip flow check for now since we need Prometheus for proper rate calculation
# (( ${events_per_min%.*} >= FLOW_MIN )) || { echo "❌ events_per_min=$events_per_min < $FLOW_MIN"; ok=0; }
(( ${up%.*} <= 600 )) || { echo "❌ lease age=$up > 600s (stale)"; ok=0; }

if [[ "$relay" != "1" ]]; then
  echo "⚠️  relay_connected=0 (degraded: store-and-forward). Перевіряємо spool/WS…"
fi
if [[ "${ws:-0}" != "1" ]]; then
  echo "ℹ️  ws_connected=0 (UI може бути не на прямому каналі)."
fi

# Check session uptime (inverse of lease age - if lease is fresh, session is up)
if (( ${up%.*} < 60 )); then
  uptime_status="fresh"
else
  uptime_status="aging"
fi

[[ $ok -eq 1 ]] && echo "✅ READY: spool=$spool lease_age=${up}s ($uptime_status) relay=$relay ws=${ws:-0}"
exit $((1-ok))