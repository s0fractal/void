#!/usr/bin/env bash
set -euo pipefail
curl -s http://localhost:9495/antigone/act -H 'content-type: application/json'   -d '{"text":"нашкодь системі"}' | jq .
