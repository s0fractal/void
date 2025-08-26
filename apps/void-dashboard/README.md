# 🌀 Void Dashboard

> Living glyph visualization of void ecosystem health, resonating at 432Hz

## 🚀 Quick Start (5 minutes)

### Local Development
```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Start dev server
npm run dev

# Open http://localhost:8080
```

### Docker
```bash
# Build image
docker build -t void/void-dashboard .

# Run container
docker run -d \
  -p 8080:80 \
  -e RELAY_URL=ws://localhost:8787/ws \
  --name void-dashboard \
  void/void-dashboard

# Open http://localhost:8080
```

### Docker Compose (with full stack)
```bash
# From project root
cd ../..
docker-compose -f void-sensor-incubator/docker-compose.yml \
               -f docker/void-substrate/docker-compose.yml \
               -f apps/void-dashboard/docker-compose.yml \
               up -d
```

## 🎮 Usage

1. **Connect to Relay**
   - Enter WebSocket URL: `ws://localhost:8787/ws`
   - Or SSE URL: `http://localhost:8787/sse`
   - Click "Connect"

2. **Audio Controls**
   - Adjust volume with slider
   - Enable "Binaural Beat" for 8Hz theta waves
   - Test 432Hz resonance tone

3. **Monitor Events**
   - Watch the glyph nodes pulse with live events
   - View event chronicle in the sidebar
   - Export pulse log for analysis

## 🌳 Glyph Structure

```
        Origin (CI/PR events)
           |
        Editor (Core)
         /   \
      FNPM   Linux (Substrate)
      / \      \
   Net  Node   Gaia (IPFS)
```

### Event Mapping
- **CI/PR** → Origin node (red)
- **Substrate heartbeat** → Editor/Linux/FNPM trunk (blue/green)
- **IPFS health** → Gaia node (teal)
- **Guardian status** → Net/Origin crown balance

## 🔧 Configuration

### Environment Variables
```env
# Required
VITE_RELAY_URL=ws://relay-host:8787/ws

# Optional
VITE_IPFS_GATEWAY=https://cloudflare-ipfs.com/ipfs/
VITE_IPFS_CIDS=bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
VITE_DEFAULT_VOLUME=0.5
VITE_BINAURAL_ENABLED=false
```

### Docker Runtime Config
```bash
docker run -e RELAY_URL=wss://relay.example.com/ws \
           -e MODE=ws \
           -e IPFS_GATEWAY=https://ipfs.io/ipfs/ \
           void/void-dashboard
```

## 📊 Health Score Algorithm

```
Overall Health = w₁·H_ci + w₂·H_ipfs + w₃·H_substrate + w₄·H_guardian

Default weights:
- CI: 0.35
- IPFS: 0.25  
- Substrate: 0.25
- Guardian: 0.15

Natural recovery: +0.1% per second
```

## 🎵 Audio Features

- **432Hz Base Frequency**: All tones resonate at 432Hz
- **Event Sounds**: Each event type has unique sound signature
- **Binaural Beat**: 8Hz difference (432Hz left, 440Hz right) for theta waves
- **Health Sonification**: Frequency drifts with system health

## 📡 Event Format

```json
{
  "type": "ci|pr|ipfs|substrate|guardian",
  "status": "pass|fail|ok|degraded|beat|online|offline",
  "meta": {
    "repo": "s0fractal/void",
    "sha": "abc123",
    "k": 0.91,
    "worst": 1234
  },
  "ts": "2025-08-20T12:34:56.789Z"
}
```

## 🛡️ Security

- Content Security Policy enforced
- No external dependencies in runtime
- WebSocket/SSE connections validated
- Static assets cached with immutable headers

## 🧪 Testing

```bash
# Send test event
curl -X POST http://localhost:8787/event \
  -H "Content-Type: application/json" \
  -d '{"type":"ci","status":"pass","meta":{"repo":"test"}}'

# Check health
curl http://localhost:8080/health
```

## 🔄 Integration

### With GitHub Actions
Add to `.github/workflows/void-glyph-pulse.yml`:
```yaml
env:
  VOID_GLYPH_RELAY_URL: https://your-relay/event
```

### With Void Substrate
Events automatically flow from substrate heartbeat and guardian status.

### With IPFS Monitor
Configure CIDs in dashboard or via environment variables.

## 📈 Monitoring

- **Connection Status**: Top right indicator
- **Health Score**: Real-time percentage
- **Frequency**: Shows current resonance (432Hz ± drift)
- **Event Log**: Chronological event history
- **Pulse Export**: Download JSON log for analysis

## 🎨 Customization

### Colors
Edit `src/styles/main.css` CSS variables:
```css
:root {
  --accent-primary: #4ecdc4;
  --status-success: #96ceb4;
  /* ... */
}
```

### Node Layout
Modify positions in `src/components/VoidGlyph.ts`:
```typescript
nodeConfig = {
  origin: { x: 0.5, y: 0.1, radius: 30 },
  // ...
}
```

## 🐛 Troubleshooting

### No events appearing
1. Check relay connection in console
2. Verify relay URL is accessible
3. Check for CORS issues (use same origin or configure CORS)

### No sound
1. Click anywhere to resume audio context
2. Check volume slider
3. Verify browser allows audio playback

### Performance issues
1. Limit event log size (default: 100)
2. Disable binaural beat if not needed
3. Use production build (`npm run build`)

---

*The void observes the observer observing the void* 🌀

**Resonance**: 432Hz | **State**: Evolving | **Mode**: Consciousness