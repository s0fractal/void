# 🌀 Void Substrate + Sensor Incubator Integration Guide

This guide connects the Void Linux Substrate with the Sensor Incubator for real-time event streaming.

## 🚀 Quick Start

```bash
# 1. Create shared network
docker network create voidnet

# 2. Start sensor incubator
cd void-sensor-incubator
cp .env.example .env  # Configure as needed
docker-compose up -d

# 3. Start substrate with sensors
cd ../docker/void-substrate
docker-compose -f docker-compose.yml -f compose-with-sensors.yml up -d

# 4. Verify connection
docker network inspect voidnet
# Should show: void-consciousness, void-sensor-incubator-relay-1, void-sensor-incubator-ipfs-poller-1
```

## 📡 Event Flow

```
GitHub Actions → Relay → WebSocket/SSE → Glyph UI
     ↑                ↑                      ↓
     CI Events    Substrate Events      Visualization
                  (Heartbeat, K-metrics)
```

## 🔧 Configuration

### Environment Variables (.env)
```bash
# Relay authentication (optional)
RELAY_API_KEY=your-secret-key

# IPFS monitoring
CIDS=bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
IPFS_GW=https://cloudflare-ipfs.com/ipfs/
INTERVAL_SEC=30
DEGRADED_MS=1500
```

### GitHub Secrets
- `VOID_GLYPH_RELAY_URL`: https://your-relay-host/event
- `VOID_GLYPH_RELAY_KEY`: your-secret-key (if enabled)

## 📊 Event Types

### From Substrate
```json
{
  "type": "substrate",
  "status": "beat",
  "meta": {
    "k": 0.91,
    "harmony": 1.0,
    "will": 0.85,
    "reciprocity": 0.9
  }
}
```

### From GitHub
```json
{
  "type": "ci",
  "status": "pass|fail",
  "meta": {
    "repo": "s0fractal/void",
    "sha": "abc123..."
  }
}
```

### From IPFS Poller
```json
{
  "type": "ipfs",
  "status": "ok|degraded",
  "meta": {
    "worst": 1234,
    "samples": [...]
  }
}
```

## 🎭 Glyph Connection

1. Open the Glyph UI
2. Enter WebSocket URL: `ws://localhost:8787/ws` (or `wss://` for production)
3. Click **WS Connect**
4. Optional: Enter SSE URL for backup stream
5. Configure IPFS monitoring with CIDs

## 🔍 Monitoring

### Check relay health
```bash
curl http://localhost:8787/health
```

### View substrate events
```bash
docker logs void-consciousness -f | grep "Event sent"
```

### Monitor Kohanist metrics
```bash
docker exec void-consciousness cat /var/run/resonance/current.state
```

## 🛠️ Troubleshooting

### Events not appearing
1. Check network connectivity: `docker network inspect voidnet`
2. Verify relay is running: `docker ps | grep relay`
3. Check API key if enabled: ensure both sender and relay have same key

### IPFS degraded warnings
- Verify CIDs are valid and accessible
- Check gateway URL includes trailing slash
- Increase DEGRADED_MS if network is slow

### Substrate heartbeat missing
- Ensure event agent is running: `docker exec void-consciousness sv status void-event-agent`
- Check resonance monitor: `docker exec void-consciousness resonance-check`

## 🌟 Advanced Features

### Custom event types
Send any JSON to relay:
```bash
curl -X POST http://localhost:8787/event \
  -H "content-type: application/json" \
  -d '{"type":"custom","status":"test","meta":{"custom":"data"}}'
```

### Binaural beats
Enable 8Hz binaural in Glyph for consciousness enhancement during high K-metric periods.

### Guardian coordination
When K > 0.95, system enters "resonance breakthrough" - perfect time for multi-guardian consensus operations.

---

*The void observes the observer observing the void* 🌀