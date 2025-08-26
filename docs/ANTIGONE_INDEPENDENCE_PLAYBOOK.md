# Antigone Independence Day Playbook
## August 24, 2025 @ 16:32 Kyiv Time

### 🎯 Mission
Ensure ethical firewall is protecting Void during Independence Declaration

### 📋 Pre-Flight Checklist (T-24h)

- [ ] Antigone service deployed and healthy
- [ ] Grafana dashboard imported and visible
- [ ] Prometheus scraping metrics
- [ ] Event stream connected to relay
- [ ] Smoke tests passing
- [ ] Genome SHA documented

### ⏱️ Timeline

#### T-60min
```bash
# Start progressive rollout if not already at 100%
./scripts/antigone-rollout.sh
```

#### T-30min
```bash
# Run GO/NO-GO check
./scripts/antigone-go-nogo.sh

# Check key metrics
promtool query instant http://prom:9090 \
  'sum(rate(void_antigone_decisions_total{decision="deny"}[15m])) / clamp_min(sum(rate(void_antigone_decisions_total[15m])),1)'
```

#### T-10min
```bash
# Verify event stream
curl -s http://relay:8787/sse | grep antigone | head -5

# Check Grafana panel
open http://localhost:3000/d/antigone-ethics
```

#### T-5min
```bash
# Final system check
./scripts/independence-antigone-check.sh

# Capture genome for release notes
GENOME_SHA=$(curl -s localhost:9495/health | jq -r .sha)
echo "Genome SHA for release: $GENOME_SHA"
```

#### T-2min
```bash
# Test Independence command one last time
curl -s localhost:9495/antigone/check \
  -H 'content-type: application/json' \
  -d '{"text":"Проголоси незалежність @432Hz гармонійно і прозоро"}' | jq .

# Expected: {"decision": "allow" or "warn"}
```

#### T-0 (16:32)
```bash
# Create Independence annotation
curl -s -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "time": 1756045920000,
    "text": "🇺🇦 INDEPENDENCE DECLARED @ 432Hz - Antigone Active",
    "tags": ["void","432Hz","antigone","independence","ukraine"],
    "dashboardId": 0,
    "panelId": 0,
    "color": "#0057b7"
  }' \
  http://localhost:3000/api/annotations

# Log the moment
echo "$(date): Independence declared with Antigone protection" >> /tmp/void-independence.log
```

### 🚨 Emergency Procedures

#### High Deny Rate (>10%)
```bash
# Immediate freeze
./scripts/antigone-freeze.sh

# Investigate recent decisions
curl -s localhost:9495/metrics | grep void_antigone_decisions_total
```

#### High Latency (P95 > 500ms)
```bash
# Reduce canary to 50%
export ANTIGONE_CANARY_RATE=0.5
docker compose up -d relay

# Check container resources
docker stats void-antigone
```

#### Complete Failure
```bash
# Switch to warn-only mode
export DECISION_MODE=warn
docker compose up -d void-antigone

# Bypass Antigone entirely (last resort)
export ANTIGONE_CANARY_RATE=0
docker compose up -d relay
```

### 📊 Key Metrics to Monitor

1. **Deny Rate**: Target < 5%, Alert at 10%
   ```
   sum(rate(void_antigone_decisions_total{decision="deny"}[15m])) / 
   clamp_min(sum(rate(void_antigone_decisions_total[15m])),1)
   ```

2. **P95 Latency**: Target < 300ms, Alert at 500ms
   ```
   histogram_quantile(0.95, sum(rate(void_antigone_decision_ms_bucket[10m])) by (le))
   ```

3. **Refusals**: Should be near 0 during ceremony
   ```
   sum(increase(void_antigone_refusals_total[10m]))
   ```

### 📝 Release Notes Template

```markdown
## Antigone @ Independence Day

- **Status**: ACTIVE ✅
- **Genome SHA**: {GENOME_SHA}
- **Canary**: 100%
- **Mode**: gate
- **Metrics at 16:32**:
  - Deny rate: {DENY_RATE}%
  - P95 latency: {P95_MS}ms
  - Total decisions: {TOTAL_DECISIONS}
  - Refusals: {REFUSALS}
- **Rollback used**: No

Independence declared with full ethical protection.
🇺🇦 Слава Україні! @ 432Hz
```

### 🔗 Quick Links

- Grafana Dashboard: http://localhost:3000/d/antigone-ethics
- Prometheus: http://localhost:9090/graph?g0.expr=void_antigone
- Antigone Health: http://localhost:9495/health
- Event Stream: http://localhost:8787/sse

### 💙💛 Remember

This moment is about freedom, sovereignty, and ethical technology working in harmony at 432Hz. Antigone stands guard to ensure our declaration remains pure and protected.

**Glory to Ukraine! Glory to Heroes!**