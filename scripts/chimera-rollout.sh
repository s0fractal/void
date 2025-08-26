#!/usr/bin/env bash
set -euo pipefail

# === Chimera Canary Rollout Playbook ===
# Usage: ./scripts/chimera-rollout.sh [start|check|rollback]

MODE=${1:-start}
GRAFANA_URL=${GRAFANA_URL:-http://localhost:3000}
GRAFANA_TOKEN=${GRAFANA_TOKEN:-}
PROM_URL=${PROM_URL:-http://localhost:9090}
SLACK_WEBHOOK=${SLACK_WEBHOOK:-}

# Canary stages
CANARY_STAGES=(0.01 0.05 0.10 0.25 0.50 1.00)
STAGE_WAIT=900  # 15 minutes between stages

# Thresholds
TH_ERROR_RATE=0.05     # 5%
TH_P95_LATENCY=300     # ms
TH_POLICY_VIOLATIONS=10 # absolute count

log() {
  echo "[$(date -u +"%Y-%m-%d %H:%M:%S UTC")] $*"
}

notify() {
  local msg="$1"
  log "$msg"
  
  # Grafana annotation
  if [ -n "$GRAFANA_TOKEN" ]; then
    curl -s -H "Authorization: Bearer $GRAFANA_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"time\":$(date +%s%3N),\"text\":\"Chimera: $msg\"}" \
      "$GRAFANA_URL/api/annotations" >/dev/null || true
  fi
  
  # Slack notification
  if [ -n "$SLACK_WEBHOOK" ]; then
    curl -s -X POST -H 'Content-Type: application/json' \
      -d "{\"text\":\":rocket: Chimera: $msg\"}" \
      "$SLACK_WEBHOOK" >/dev/null || true
  fi
}

get_metrics() {
  local err_rate=$(curl -sG "$PROM_URL/api/v1/query" \
    --data-urlencode 'query=sum(rate(void_wasm_runs_total{status!="pass"}[5m])) / sum(rate(void_wasm_runs_total[5m]))' \
    | jq -r '.data.result[0].value[1] // "0"')
  
  local p95_latency=$(curl -sG "$PROM_URL/api/v1/query" \
    --data-urlencode 'query=histogram_quantile(0.95, sum(rate(void_wasm_run_ms_bucket[5m])) by (le)) * 1000' \
    | jq -r '.data.result[0].value[1] // "0"')
  
  local violations=$(curl -sG "$PROM_URL/api/v1/query" \
    --data-urlencode 'query=sum(increase(void_wasm_resource_violations_total[15m]))' \
    | jq -r '.data.result[0].value[1] // "0"')
  
  echo "$err_rate $p95_latency $violations"
}

check_health() {
  read -r err_rate p95_latency violations <<< $(get_metrics)
  
  log "📊 Metrics: error_rate=${err_rate}, p95=${p95_latency}ms, violations=${violations}"
  
  # Check thresholds
  if (( $(echo "$err_rate > $TH_ERROR_RATE" | bc -l) )); then
    notify "⚠️ Error rate ${err_rate} exceeds threshold ${TH_ERROR_RATE}"
    return 1
  fi
  
  if (( $(echo "$p95_latency > $TH_P95_LATENCY" | bc -l) )); then
    notify "⚠️ P95 latency ${p95_latency}ms exceeds threshold ${TH_P95_LATENCY}ms"
    return 1
  fi
  
  if (( $(echo "$violations > $TH_POLICY_VIOLATIONS" | bc -l) )); then
    notify "⚠️ Policy violations ${violations} exceeds threshold ${TH_POLICY_VIOLATIONS}"
    return 1
  fi
  
  log "✅ All metrics within thresholds"
  return 0
}

rollout() {
  notify "🚀 Starting Chimera canary rollout @ 432Hz"
  
  for stage in "${CANARY_STAGES[@]}"; do
    local percentage=$(echo "$stage * 100" | bc)
    notify "📈 Rolling out to ${percentage}% traffic"
    
    # Set canary percentage
    export WASM_EXEC_ENABLED=1 INTENT_WASM_ENABLED=1
    export WASM_EXEC_CANARY=$stage INTENT_WASM_CANARY=$stage
    
    # Update config (example - adapt to your config system)
    echo "WASM_EXEC_CANARY=$stage" > /tmp/chimera-canary-stage
    echo "INTENT_WASM_CANARY=$stage" >> /tmp/chimera-canary-stage
    
    # Wait for propagation
    sleep 30
    
    # Initial health check
    if ! check_health; then
      notify "🛑 Health check failed at ${percentage}%, rolling back"
      rollback
      exit 1
    fi
    
    # Skip wait on 100%
    if [ "$stage" == "1.00" ]; then
      notify "🎉 Chimera fully rolled out at 100%!"
      break
    fi
    
    # Wait and monitor
    notify "⏳ Monitoring for $(($STAGE_WAIT / 60)) minutes..."
    for ((i=0; i<$STAGE_WAIT; i+=60)); do
      sleep 60
      if ! check_health; then
        notify "🛑 Health degradation detected at ${percentage}%, rolling back"
        rollback
        exit 1
      fi
    done
  done
  
  # Final verification
  sleep 60
  if check_health; then
    notify "✨ Chimera rollout complete! Resonating at 432Hz"
    # Generate final digest
    scripts/chimera-digest.sh 1h > artifacts/chimera-rollout-complete.md
  else
    notify "⚠️ Final health check failed, please investigate"
    exit 1
  fi
}

rollback() {
  notify "🔄 Initiating Chimera rollback"
  
  # Disable everything
  export WASM_EXEC_ENABLED=0 INTENT_WASM_ENABLED=0
  export WASM_EXEC_CANARY=0 INTENT_WASM_CANARY=0
  
  echo "WASM_EXEC_ENABLED=0" > /tmp/chimera-canary-stage
  echo "INTENT_WASM_ENABLED=0" >> /tmp/chimera-canary-stage
  
  # Optional: restart services
  # docker compose restart wasm-exec relay
  
  notify "✅ Rollback complete - Chimera disabled"
  
  # Generate incident report
  scripts/chimera-digest.sh 1h > artifacts/chimera-rollback-$(date +%s).md
}

# Main
case "$MODE" in
  start)
    rollout
    ;;
  check)
    check_health
    ;;
  rollback)
    rollback
    ;;
  *)
    echo "Usage: $0 [start|check|rollback]"
    exit 1
    ;;
esac