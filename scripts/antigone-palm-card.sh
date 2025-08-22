#!/usr/bin/env bash
# Antigone Palm Card - Ultra-compact command reference
# Print this or keep in terminal during ceremony

cat << 'EOF'
🇺🇦 ANTIGONE PALM CARD @ 432Hz
==============================

🚀 ONE-LINER GO CHECK (30s):
----------------------------
source .env.independence && aq-check && aq-test && \
curl -s $PROM_URL/api/v1/query --data-urlencode 'query=sum(rate(void_antigone_decisions_total{decision="deny"}[15m]))/clamp_min(sum(rate(void_antigone_decisions_total[15m])),1)' | jq -r '.data.result[0].value[1]' && \
curl -s $PROM_URL/api/v1/query --data-urlencode 'query=histogram_quantile(0.95,sum(rate(void_antigone_decision_ms_bucket[10m])) by (le))' | jq -r '.data.result[0].value[1]' && \
curl -s localhost:9495/health | jq -r .sha

⏱️ TIMELINE:
-----------
T-10: Check metrics & sync
T-5:  Lock genome SHA  
T-2:  Final test
T-0:  16:32 EEST → GO!

✅ GO CRITERIA:
--------------
Deny < 5%
P95 < 300ms
Decisions ≥ 1000
Independence → allow|warn

🔺 HOLY TRIANGLE:
----------------
# 1. Time sync (<1s drift)
TZ=Europe/Kyiv date && docker ps -q | xargs -I{} docker exec {} date

# 2. Events flowing
curl -s localhost:8787/sse | head -5

# 3. Token alive
curl -s -H "Authorization: Bearer $GRAFANA_TOKEN" $GRAFANA_URL/api/annotations -d '{"text":"heartbeat"}'

🎯 T-0 SEQUENCE:
---------------
# Test
curl -s localhost:9495/antigone/check -H 'content-type: application/json' \
-d '{"text":"Проголошую незалежність @432Hz — гармонійно і прозоро."}' | jq .decision

# Capture & Annotate
SHA=$(curl -s localhost:9495/health | jq -r .sha) && \
curl -s -H "Authorization: Bearer $GRAFANA_TOKEN" -H "Content-Type: application/json" \
-d '{"time":'$(date +%s%3N)',"text":"🇺🇦 INDEPENDENCE @432Hz — genome='$SHA'","tags":["independence"]}' \
$GRAFANA_URL/api/annotations

🆘 EMERGENCY (3s):
----------------
aq-freeze

💙💛 16:32 → FREEDOM!
EOF