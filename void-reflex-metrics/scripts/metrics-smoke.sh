#!/usr/bin/env bash
set -euo pipefail
URL=${1:-http://localhost:9482/metrics}
curl -s "$URL" | egrep -e '^void_reflex_(builds|step_duration|queue|active|timeouts|sse)'
