# ⏱️ T-2 Minutes Ultra Check

## System Health
```bash
./scripts/ready-check.sh
```
Expected: ✅ READY

## TmpBus Status
- [ ] **relay_connected = 1** OR **degraded + spool < 100**
- [ ] **ws_connected = 1** (for projector mode)
- [ ] **events_per_min ≥ 1**

Quick check:
```bash
curl -s http://localhost:9479/metrics | grep -E "relay_connected|spool_depth|events_ingested"
```

## Environment
- [ ] Dashboard in projector/fullscreen mode
- [ ] 432Hz tone playing
- [ ] Terminal ready with ceremony commands
- [ ] GitHub CLI (`gh`) authenticated

## Final Commands Ready
```bash
# Should be in: void-tmp-bus/
pwd

# Quick ceremony script ready:
ls -la ceremony/QUICK_CEREMONY_COMMANDS.sh
```

## Go/No-Go Decision
All checks pass → **GO for 16:32** 🚀