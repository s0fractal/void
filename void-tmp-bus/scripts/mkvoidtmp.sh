#!/usr/bin/env bash
set -euo pipefail
DIR=${TMP_DIR:-/tmp/void}
echo "Creating $DIR ..."
mkdir -p "$DIR"/{sock,log}
chmod 700 "$DIR" "$DIR/sock" "$DIR/log"
if id void >/dev/null 2>&1; then
  chown -R void:void "$DIR"
fi
echo "OK"
