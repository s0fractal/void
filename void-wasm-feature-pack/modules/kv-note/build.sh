#!/usr/bin/env bash
set -euo pipefail
rustup target add wasm32-wasi || true
cargo build --release --target wasm32-wasi
mkdir -p artifacts
cp target/wasm32-wasi/release/kv_note.wasm artifacts/
sha256sum artifacts/kv_note.wasm | awk '{print $1}' > artifacts/kv_note.sha256
