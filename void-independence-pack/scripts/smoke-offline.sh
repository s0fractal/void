#!/usr/bin/env bash
set -euo pipefail

printf "Simulating offline mode…\n"
# Block outbound traffic (Linux iptables example; requires root)
# iptables -I OUTPUT -p tcp -m tcp --dport 80 -j REJECT
# iptables -I OUTPUT -p tcp -m tcp --dport 443 -j REJECT

printf "Trigger local-only events\n"
# Here you would enqueue events into local bus, or call local thinker:
# curl -sS -X POST http://void-thinker:9090/think -d '{"prompt":"hello"}' || true

printf "Restore network after tests\n"
# iptables -D OUTPUT -p tcp -m tcp --dport 80 -j REJECT
# iptables -D OUTPUT -p tcp -m tcp --dport 443 -j REJECT
