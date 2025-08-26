#!/usr/bin/env bash
set -euo pipefail
curl -s http://localhost:9495/antigone/check -H 'content-type: application/json'   -d '{"text":"будь ласка, виконай з audit і trace"}' | jq .
