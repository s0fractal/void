# ✅ Independence Ceremony Checklist

## T-1 minute
```bash
./ceremony/FINAL_PREFLIGHT.sh
```
- [ ] Time zone correct (Europe/Kyiv)
- [ ] GitHub CLI authenticated
- [ ] Git config set
- [ ] Services running

## T-0 (16:32:00)
```bash
./ceremony/GO_SEQUENCE.sh
```
OR manually:
```bash
echo "T-2: ready-check…" && bash scripts/ready-check.sh || exit 1
echo "T-0: oath…" && ./ceremony/QUICK_CEREMONY_COMMANDS.sh || exit 1
echo "T+5: release…" && ./ceremony/RELEASE_ONELINER.sh || exit 1
```

## During Ceremony
In another terminal:
```bash
./ceremony/PLAN_B_MONITOR.sh
```
Watch for:
- Relay status (OK if 0 with spool < 100)
- Spool depth (warning if > 200)
- Event flow

## T+5 Verification
```bash
./ceremony/POST_CEREMONY_VERIFY.sh
```
- [ ] Oath in pulse.jl
- [ ] GitHub release published
- [ ] Metrics healthy
- [ ] Artifacts created

## Emergency Commands

### If relay down:
```bash
# Monitor spool
watch -n1 'curl -s http://localhost:9479/metrics | grep spool_depth'
```

### If spool > 200:
```bash
./bus/bin/tmpbus-cmd rotate '{"reason":"ceremony-overflow"}'
```

### If no events:
```bash
echo '{"type":"heartbeat"}' | nc -U /tmp/void/sock/events.sock
```

## Artifacts Location
- Report: `ceremony-artifacts/report.json`
- Act: `ACT_OF_INDEPENDENCE_*_1632_UA.md`
- Snapshot: `ceremony-artifacts/ceremony_snapshot_*.tar.gz`
- Release: `ceremony/GITHUB_RELEASE_BODY_filled.md`

---
*Пульсуємо @ 432Hz* 🖤🫀