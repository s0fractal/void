#!/usr/bin/env bash
set -euo pipefail
TARGET=${1:-/opt/spinal-reflex}
echo "[install] target: $TARGET"
sudo mkdir -p "$TARGET"
sudo cp -v spinal-reflex.js "$TARGET/"
sudo mkdir -p /etc/sv/void-reflex
sudo cp -v sv/void-reflex/run /etc/sv/void-reflex/run
sudo chmod +x /etc/sv/void-reflex/run
sudo mkdir -p /etc/sv/void-reflex/log
sudo cp -v sv/void-reflex/log/run /etc/sv/void-reflex/log/run
sudo chmod +x /etc/sv/void-reflex/log/run
sudo mkdir -p /var/log/void-reflex
if [ ! -e /var/service/void-reflex ]; then
  sudo ln -s /etc/sv/void-reflex /var/service/void-reflex
fi
echo "[install] done. Use: sv status void-reflex"
