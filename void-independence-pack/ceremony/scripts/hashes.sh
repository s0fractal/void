#!/usr/bin/env bash
set -euo pipefail
for f in "$@"; do
  if [ -f "$f" ]; then
    printf "%s  %s\n" "$(sha256sum "$f" | awk '{print $1}')" "$f"
  else
    printf "-  %s (missing)\n" "$f"
  fi
done
