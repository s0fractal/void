#!/usr/bin/env bash
set -euo pipefail
REL=${REL:-http://localhost:8787}
curl -s "$REL/eyes/url" -H 'content-type: application/json' -d "{"url":"${1:-https://example.com}"}" | jq .
