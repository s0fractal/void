# 📱 Pocket Ceremony Guide

## GO-mini (3 commands)
```bash
TZ=Europe/Kyiv date -Iseconds && bash scripts/ready-check.sh
./ceremony/GO_SEQUENCE.sh
./ceremony/POST_CEREMONY_VERIFY.sh
```

## DRY RUN (test without actions)
```bash
DRY_RUN=1 ./ceremony/QUICK_CEREMONY_COMMANDS.sh
```

## Emergency Rollback
```bash
# Delete release
gh release delete independence-2025-08-24-1632 -y

# Remove tag locally and from origin
git tag -d independence-2025-08-24-1632
git push origin :refs/tags/independence-2025-08-24-1632
```

## Quick Metrics Check
```bash
curl -s http://localhost:9479/metrics | grep -E "spool_depth|relay_connected"
```

## Send Test Event
```bash
echo '{"type":"test","ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"}' | nc -U /tmp/void/sock/events.sock
```

## GO Signal
```bash
./bus/bin/tmpbus-pub '{"type":"ceremony","status":"go","meta":{"who":"Kompas","mode":"independence-2025-08-24-1632","freq_hz":432}}'
```

## Offline Release Filler
```bash
# Using only jq (no Node.js required)
./ceremony/OFFLINE_RELEASE_FILLER.sh report.json
```

---
*432Hz • 16:32 EEST • Kyiv* 🖤🫀🇺🇦