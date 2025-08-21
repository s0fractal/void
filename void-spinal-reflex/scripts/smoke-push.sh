#!/usr/bin/env bash
set -euo pipefail
RELAY=${RELAY:-http://localhost:8787}
REPO=${1:?repo like owner/name}
SHA=${2:-deadbeef}
curl -s "$RELAY/event" -H 'content-type: application/json' -d "{
  "type":"github.push",
  "repo":"$REPO",
  "sha":"$SHA",
  "meta": { "branch":"main" }
}" | jq .
