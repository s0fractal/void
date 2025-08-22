#!/usr/bin/env bash
set -euo pipefail
tinygo build -o artifacts/http_ping.wasm -target=wasi -opt=2 main.go
sha256sum artifacts/http_ping.wasm | awk '{print $1}' > artifacts/http_ping.sha256
