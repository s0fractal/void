#!/usr/bin/env bash
set -euo pipefail
RELAY=${RELAY:-http://localhost:8787}
curl -s -X POST "$RELAY/codex/plan" -H 'content-type: application/json' -d '{"intent":"stabilize ipfs","context":{"incidents":["ipfs:degraded"]}}' | jq .
