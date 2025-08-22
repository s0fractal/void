#!/usr/bin/env bash
# Publish Independence oath to tmpbus

TMPBUS="${TMPBUS_SOCK:-/tmp/void/commands.sock}"

# Independence oath event
EVENT='{
  "type": "ceremony",
  "status": "oath",
  "meta": {
    "text": "Пульс безперервний, рішення локальні, пам'\''ять правдива. Ми тримаємо форму в тиші й резонуємо в дії.",
    "who": "MN-1",
    "freq_hz": 432,
    "mode": "independence-2025-08-24-1632",
    "timestamp": '$(date +%s%3N)',
    "genome_sha": "'$(curl -s localhost:9495/health | jq -r .sha)'"
  }
}'

# Send to tmpbus
echo "$EVENT" | nc -U "$TMPBUS" 2>/dev/null || echo "$EVENT" > /tmp/void/log/independence-oath.json

echo "✓ Independence oath published @ 432Hz"