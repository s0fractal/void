#!/usr/bin/env bash
set -euo pipefail

echo "Git:"; git --version
echo "GH:"; gh --version || true
echo "Docker:"; docker --version || true

echo
echo "Relay base: ${RELAY_BASE:-<not set>}"
echo "Decision mode: ${DECISION_MODE:-warn}"
echo "Prometheus scrape: ensure target :9495/metrics"

echo
echo "Try curl:"
set -x
curl -sS http://localhost:9495/health || true
curl -sS http://localhost:9495/metrics | head || true
