# 🚨 TmpBus Operations Runbook

## Quick Health Check

```bash
# Check all components
./scripts/smoke-test.sh

# Check specific service
curl -s http://localhost:9479/metrics | grep tmpbus_relay_connected
./bin/tmpbus-cmd health
```

## Common Alerts & Resolution

### 🔴 TmpBusRelayDown
**Symptom**: `tmpbus_relay_connected == 0` for >60s

**Investigation**:
1. Check relay container:
   ```bash
   docker ps | grep relay
   docker logs relay -n 100
   ```

2. Test relay endpoint:
   ```bash
   curl -s http://localhost:8787/health
   # or inside container network:
   docker exec tmpbus curl -s http://relay:8787/health
   ```

3. Verify spool is buffering:
   ```bash
   curl -s http://localhost:9479/metrics | grep tmpbus_spool_depth
   # Should be increasing if relay is down
   ```

**Resolution**:
- If relay crashed: `docker restart relay`
- If network issue: Check docker network `docker network inspect voidnet`
- After recovery: Monitor spool flush (should drain within 10s)

### 🟡 TmpBusSpoolRapidGrowth
**Symptom**: Spool growing >50 events in 2 minutes

**Investigation**:
1. Check relay rate limits:
   ```bash
   docker logs relay | grep "429\|rate"
   ```

2. Check event volume:
   ```bash
   curl -s http://localhost:9479/metrics | grep tmpbus_events_ingested_total
   ```

3. Check pulse.jl size:
   ```bash
   ls -lh /tmp/void/logs/pulse.jl*
   ```

**Resolution**:
- If rate limited: Increase relay `RATE_LIMIT_BURST` env var
- If high volume: Check event sources, possible loop
- Force rotation if needed: `./bin/tmpbus-cmd rotate '{"reason":"manual"}'`

### 🟡 TmpBusCmdLatencyHighP95
**Symptom**: Command latency p95 >300ms

**Investigation**:
1. Check who's polling commands:
   ```bash
   netstat -an | grep commands.sock
   lsof /tmp/void/sock/commands.sock
   ```

2. Check exporter interval:
   ```bash
   docker logs tmpbus-exporter | grep -i poll
   ```

**Resolution**:
- Increase exporter `POLL_INTERVAL` (default 5000ms → 10000ms)
- Check for stuck commands: `strace -p $(pgrep -f tmpbus)`
- Restart if needed: `docker restart tmpbus`

### ℹ️ TmpBusWsDisconnected
**Symptom**: WebSocket clients disconnected >60s

**Investigation**:
1. Check dashboard connectivity
2. Look for WebSocket errors in browser console

**Resolution**:
- Usually self-healing when dashboard reconnects
- Check relay WebSocket endpoint: `wscat -c ws://localhost:8787/ws`

### 🟡 TmpBusLowEventFlow
**Symptom**: <1 event/minute for 5 minutes

**Investigation**:
1. Check event sources are running
2. Verify UDS socket exists: `ls -la /tmp/void/sock/events.sock`
3. Test manual event: `echo '{"type":"test"}' | nc -U /tmp/void/sock/events.sock`

**Resolution**:
- Restart event producers
- Check socket permissions
- Verify tmpbus is listening: `netstat -an | grep 9478`

## Emergency Procedures

### Force Flush Spool
```bash
./bin/tmpbus-cmd flush
# Monitor metrics after
curl -s http://localhost:9479/metrics | grep spool_depth
```

### Manual Log Rotation
```bash
./bin/tmpbus-cmd rotate '{"reason":"emergency"}'
```

### Full Stack Restart
```bash
cd /path/to/void-tmp-bus
docker compose down
docker compose up -d

# Wait for services
sleep 10

# Verify health
./scripts/smoke-test.sh
```

### Collect Debug Info
```bash
# For bug reports
docker logs tmpbus > tmpbus.log 2>&1
docker logs tmpbus-exporter > exporter.log 2>&1
tar -czf tmpbus-debug-$(date +%Y%m%d-%H%M%S).tar.gz \
  tmpbus.log exporter.log \
  /tmp/void/logs/pulse.jl* \
  prometheus.yml
```

## Performance Tuning

### Spool Parameters
- `SPOOL_BATCH_SIZE`: Events per file (default: 100)
- `SPOOL_MAX_FILES`: Max spool files (default: 1000)

### Rate Limiting
- Relay: `RATE_LIMIT_REQ_PER_SEC`, `RATE_LIMIT_BURST`
- Exporter: `POLL_INTERVAL` (ms)

### Memory Usage
Monitor with: `docker stats tmpbus tmpbus-exporter`

Expected usage:
- tmpbus: <50MB
- exporter: <30MB

## Monitoring URLs

- Metrics: http://localhost:9479/metrics
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/void432)
- Alerts: http://localhost:9090/alerts

## Contact

- Slack: #void-operations
- On-call: Check PagerDuty schedule
- Collective: @void-guardians

---

*Remember: The tmpbus is the nervous system of Void. Handle with care!* 🖤