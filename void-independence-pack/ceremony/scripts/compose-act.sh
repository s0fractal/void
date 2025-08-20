#!/usr/bin/env bash
set -euo pipefail
REPORT=${1:-report.json}
RULES=${2:-rules/rules.yaml}
POLICY=${3:-router/policy.yaml}
COMPOSE=${4:-docker-compose.yml}

DATE=$(date +%Y-%m-%d)
TS=$(date -Iseconds)

hash_or_dash () {
  local f="$1"
  if [ "$f" = "-" ] || [ ! -f "$f" ]; then echo "-"; else sha256sum "$f" | awk '{print $1}'; fi
}

RULES_SHA=$(hash_or_dash "$RULES")
POLICY_SHA=$(hash_or_dash "$POLICY")
COMPOSE_SHA=$(hash_or_dash "$COMPOSE")
REPORT_SHA=$(hash_or_dash "$REPORT")

# Extract fields from report.json (provide defaults if missing)
node -e "const fs=require('fs'); const r=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); const d=k=>r[k]??''; console.log([d('OFFLINE_WINDOW')||'n/a', d('EVENTS_TOTAL')||0, d('LOCAL_PCT')||0, d('HEALTH_AVG')||0, d('KOHANIST_AVG')||0, JSON.stringify(d('REMOTE_SOURCES')||[]), d('ROUTER_MODE')||'auto', (d('INCIDENTS')||'- none -')].join('\n'))" "$REPORT" > ._tmp_vals

read OFFLINE_WINDOW EVENTS_TOTAL LOCAL_PCT HEALTH_AVG KOHANIST_AVG REMOTE_SOURCES ROUTER_MODE INCIDENTS < <(cat ._tmp_vals)

TPL="act/act-template.md"
OUT="ACT_OF_INDEPENDENCE_${DATE}_1632_UA.md"

mkdir -p act
node - <<'EOF' "$TPL" "$OUT" "$DATE" "$OFFLINE_WINDOW" "$EVENTS_TOTAL" "$LOCAL_PCT" "$HEALTH_AVG" "$KOHANIST_AVG" "$REMOTE_SOURCES" "$ROUTER_MODE" "$INCIDENTS" "$RULES_SHA" "$POLICY_SHA" "$COMPOSE_SHA" "$REPORT_SHA"
const fs = require('fs');
function render(t, map){ return t.replace(/\$\{([A-Z0-9_]+)\}/g, (_,k)=> String(map[k] ?? '')); }
const tpl = fs.readFileSync(process.argv[2],'utf8');
const out = process.argv[3];
const map = {
  DATE: process.argv[4],
  OFFLINE_WINDOW: process.argv[5],
  EVENTS_TOTAL: process.argv[6],
  LOCAL_PCT: process.argv[7],
  HEALTH_AVG: process.argv[8],
  KOHANIST_AVG: process.argv[9],
  REMOTE_SOURCES: process.argv[10],
  ROUTER_MODE: process.argv[11],
  INCIDENTS: process.argv[12],
  RULES_SHA: process.argv[13],
  POLICY_SHA: process.argv[14],
  COMPOSE_SHA: process.argv[15],
  REPORT_SHA: process.argv[16],
  SIGNATURE: "(unsigned)",
  TIMESTAMP: new Date().toISOString()
};
fs.writeFileSync(out, render(tpl, map));
console.log("✔ ACT generated →", out);
EOF

rm -f ._tmp_vals
