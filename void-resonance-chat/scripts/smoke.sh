#!/usr/bin/env bash
set -euo pipefail
REL=${REL:-http://localhost:8787}
TEXT=${1:-"Привіт, Пустото. Збалансуй воркфлоу під 432Hz."}
curl -s "$REL/intent/wave" -H 'content-type: application/json' -d "{"type":"intent.wave","meta":{"text":"$TEXT","gain":0.8}}" | jq .
