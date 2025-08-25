#!/usr/bin/env bash
# PLAN_B_MONITOR.sh — Live watch @432Hz, оновлення кожні 5с
set -euo pipefail

PROM_URL="${PROM_URL:-http://localhost:9090}"
DENY_Q=${DENY_Q:-'sum(rate(void_antigone_decisions_total{decision="deny"}[15m])) / clamp_min(sum(rate(void_antigone_decisions_total[15m])), 1)'}
P95_Q=${P95_Q:-'histogram_quantile(0.95, sum(rate(void_antigone_decision_ms_bucket[10m])) by (le))'}
ANTI="${ANTI:-http://localhost:9495}"

color() { case "$1" in green) printf "\033[32m";; yellow) printf "\033[33m";; red) printf "\033[31m";; reset) printf "\033[0m";; esac; }

while true; do
  now=$(TZ=Europe/Kyiv date -Iseconds)
  deny=$(promtool query instant "$PROM_URL" "$DENY_Q" 2>/dev/null | awk 'NF{print $NF; exit}'); deny=${deny:-0}
  p95=$(promtool query instant "$PROM_URL" "$P95_Q" 2>/dev/null | awk 'NF{print $NF; exit}'); p95=${p95:-0}
  sha=$(curl -s "$ANTI/health" | jq -r .sha 2>/dev/null)

  # Кольори за порогами
  if awk "BEGIN{exit !($deny>0.10)}"; then dc=red; elif awk "BEGIN{exit !($deny>=0.05)}"; then dc=yellow; else dc=green; fi
  if awk "BEGIN{exit !($p95>500)}";  then pc=red; elif awk "BEGIN{exit !($p95>=300)}"; then pc=yellow; else pc=green; fi

  clear
  echo "🎛  PLAN-B MONITOR  @432Hz     $now"
  echo "   Genome SHA: ${sha:-unknown}"
  echo
  printf "   Deny-rate(15m): "; color "$dc"; printf "%.2f%%\n" "$(awk "BEGIN{print $deny*100}")"; color reset
  printf "   p95 latency(10m): "; color "$pc"; printf "%.0f ms\n" "$p95"; color reset
  echo
  echo "   GO thresholds → deny<5%, p95<300ms"
  echo "   Emergency     → aq-freeze (3s)"
  sleep 5
done