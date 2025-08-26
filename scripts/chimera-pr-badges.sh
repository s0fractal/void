#!/usr/bin/env bash
set -euo pipefail
PR_NUMBER="${1:?usage: $0 <pr-number>}"
PROM_URL="${PROM_URL:-http://localhost:9090}"

q() { curl -sG "$PROM_URL/api/v1/query" --data-urlencode "query=$1" \
  | jq -r '.data.result[0].value[1] // "0"'; }

ERR=$(q 'sum(rate(void_wasm_runs_total{status!="pass"}[5m])) / sum(rate(void_wasm_runs_total[5m]))')
P95=$(q 'histogram_quantile(0.95, sum(rate(void_wasm_run_ms_bucket[5m])) by (le))')

ERR_PCT=$(python3 - <<PY
e=float("$ERR") if "$ERR"!="0" else 0.0
print(f"{e*100:.2f}")
PY
)
P95_MS=$(python3 - <<PY
p=float("$P95") if "$P95"!="0" else 0.0
print(f"{p:.0f}")
PY
)

STATUS="green"
if (( $(echo "$ERR_PCT > 5.0" | bc -l) )) || (( $(echo "$P95_MS > 300" | bc -l) )); then STATUS="red";
elif (( $(echo "$ERR_PCT > 3.0" | bc -l) )) || (( $(echo "$P95_MS > 250" | bc -l) )); then STATUS="yellow"; fi

BADGE_ERR="![errors](https://img.shields.io/badge/error_rate-${ERR_PCT}%25-$STATUS)"
BADGE_P95="![p95](https://img.shields.io/badge/p95-${P95_MS}ms-$STATUS)"
BODY="## Chimera Live · ${BADGE_ERR} ${BADGE_P95}
- window: 5m · resonance: 432Hz"

# Якщо є вже мій коментар — оновлю, інакше створю:
CID=$(gh pr view "$PR_NUMBER" --json comments \
  | jq -r '.comments[] | select(.author.login != null) | select(.author.login|test("github-actions|bot|.*"))? | .id' | head -n1)
if [ -n "${CID:-}" ]; then
  gh api repos/{owner}/{repo}/issues/comments/"$CID" -X PATCH -f body="$BODY" >/dev/null
else
  gh pr comment "$PR_NUMBER" --body "$BODY" >/dev/null
fi
echo "Updated PR #$PR_NUMBER badges → ERR=${ERR_PCT}% p95=${P95_MS}ms"