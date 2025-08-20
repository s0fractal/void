#!/usr/bin/env bash
set -euo pipefail

RELAY=${RELAY:-http://localhost:8787/event}

say() { printf "▶ %s\n" "$*"; }

say "PR open"
curl -sS -X POST "$RELAY" -H 'content-type: application/json' -d '{"type":"pr","status":"open","meta":{"who":"tester"}}' >/dev/null

say "CI pass"
curl -sS -X POST "$RELAY" -H 'content-type: application/json' -d '{"type":"ci","status":"pass"}' >/dev/null

say "CI fail"
curl -sS -X POST "$RELAY" -H 'content-type: application/json' -d '{"type":"ci","status":"fail"}' >/dev/null

say "IPFS degraded"
curl -sS -X POST "$RELAY" -H 'content-type: application/json' -d '{"type":"ipfs","status":"degraded","meta":{"worst":2100}}' >/dev/null

say "Substrate beat"
curl -sS -X POST "$RELAY" -H 'content-type: application/json' -d '{"type":"substrate","status":"beat","meta":{"k":0.91}}' >/dev/null

say "Done. Check your glyph/pulse.log"
