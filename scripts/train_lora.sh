#!/usr/bin/env bash
set -euo pipefail
echo "[train_lora] placeholder"
echo " dataset: glyphs/core.yaml -> JSONL"
echo " model: google/gemma-2-2b-it (or 270M)"
echo " output: ./artifacts/lora-antigone"
mkdir -p artifacts
echo "{}" > artifacts/lora-antigone.json
