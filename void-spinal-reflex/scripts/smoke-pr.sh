#!/usr/bin/env bash
set -euo pipefail
RELAY=${RELAY:-http://localhost:8787}
REPO=${1:?repo like owner/name}
PR=${2:-1234}
SHA=${3:-}
curl -s "$RELAY/event" -H 'content-type: application/json' -d "{
  "type":"github.pull_request",
  "repo":"$REPO",
  "pr": $PR,
  "sha":"$SHA",
  "meta": { "action":"opened" }
}" | jq .
