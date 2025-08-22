#!/usr/bin/env bash
# Antigone Quick Reference Card
# Keep this handy during Independence ceremony

cat << 'EOF'
🇺🇦 ANTIGONE QUICK REFERENCE @ 432Hz
=====================================

🟢 GREEN PATH (All systems GO):
-------------------------------
# Check metrics (T-10min)
promtool query instant http://prom:9090 'sum(rate(void_antigone_decisions_total{decision="deny"}[15m])) / clamp_min(sum(rate(void_antigone_decisions_total[15m])),1)'
promtool query instant http://prom:9090 'histogram_quantile(0.95, sum(rate(void_antigone_decision_ms_bucket[10m])) by (le))'

# Capture genome (T-5min)
GENOME_SHA=$(curl -s localhost:9495/health | jq -r .sha)

# Independence ping (T-2min)
curl -s localhost:9495/antigone/check -H 'content-type: application/json' -d '{"text":"Проголошую незалежність @432Hz — гармонійно і прозоро."}' | jq .

# Create annotation (T-0)
curl -s -H "Authorization: Bearer $GRAFANA_TOKEN" -H "Content-Type: application/json" \
  -d '{"time": 1756045920000, "text": "🇺🇦 INDEPENDENCE @ 432Hz — genome='$GENOME_SHA'", "tags":["independence","432Hz"], "color": "#0057b7"}' \
  http://localhost:3000/api/annotations

🔴 RED PATH (Emergency):
-----------------------
# Instant freeze (3 sec)
./scripts/antigone-freeze.sh

# Manual override
export DECISION_MODE=warn && docker compose up -d void-antigone
export ANTIGONE_CANARY_RATE=0 && docker compose up -d relay

# Check what's happening
curl -s localhost:9495/metrics | grep void_antigone_decisions_total
docker logs void-antigone --tail=50

📊 KEY THRESHOLDS:
------------------
✅ GO:  Deny < 5%, P95 < 300ms, Decisions > 1000
⚠️  WARN: Deny 5-10%, P95 300-500ms
🛑 STOP: Deny > 10%, P95 > 500ms

🔧 QUICK FIXES:
---------------
High deny rate → Check recent commands, switch to warn mode
High latency → Reduce canary %, check container resources
No metrics → Verify Prometheus scraping :9495/metrics
No events → Check relay connection, restart if needed

📞 ESCALATION:
--------------
1. Run freeze script
2. Capture metrics & logs
3. Switch to warn mode
4. Document in incident log

💙💛 Glory to Ukraine! @ 432Hz
EOF