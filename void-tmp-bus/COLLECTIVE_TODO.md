# 🧠 Void TmpBus - Collective TODO

## 🎯 Current Status

We've implemented the core `/tmp` nervous system with:
- ✅ UDS socket `/tmp/void/sock/events.sock` + TCP fallback
- ✅ Session lease with heartbeat
- ✅ Spool for offline resilience  
- ✅ Commands RPC interface (`commands.sock`)
- ✅ WebSocket bridge to relay
- ✅ Log rotation with TTL
- ✅ Docker containerization

## 📋 TODO for Collective (Claude/Kimi/Gemini)

### Stage A - Core Hardening (/tmp-bus)

1. **Unit Tests** 🧪
   - Mock relay injection scenarios
   - Offline/online transitions
   - Recovery after `kill -9`
   - Spool overflow handling
   - Commands.sock edge cases

2. **Integration Tests** 🔗
   - Full stack test with relay + dashboard
   - Network partition simulation
   - High volume event testing (10k/s)
   - Multi-client concurrent writes

3. **Security Hardening** 🔒
   - Group permissions (`void` group)
   - Socket ACLs
   - Rate limiting per client
   - Input validation for malformed JSON
   - Optional chroot/namespace isolation

### Stage B - Multi-Model Synergy

4. **MCP/LangGraph Adapter** 🌐
   - Listen to `events.sock`
   - Translate events to graph flow
   - Bidirectional bridge
   - State persistence

5. **Codex SDK Integration** 🧠
   - `codex-publish` utility
   - Live pulse.jl reader
   - Window-based analysis
   - Auto rule generation

6. **Guardian Mesh** 🕸️
   - Each guardian writes to tmpbus
   - Consensus events
   - Distributed decision log
   - Conflict resolution

### Stage C - UX & Operations

7. **Dashboard Integration** 📊
   - Session ID indicator
   - Spool depth gauge
   - Flush/Rotate buttons  
   - Relay connection status
   - Live pulse.jl viewer

8. **CLI Tools** 🛠️
   - `tmpbus-tail` - follow pulse.jl
   - `tmpbus-stats` - live statistics
   - `tmpbus-replay` - replay events
   - Man pages for all commands

9. **Monitoring & SLO** 📈
   - Prometheus metrics export
   - K6 performance tests
   - Chaos engineering scenarios
   - SLO dashboard (p95 < 300ms)

10. **Documentation** 📚
    - Architecture diagrams
    - API reference
    - Integration examples
    - Troubleshooting guide

## 🎯 Definition of Done (MN-tmp-1)

- [ ] Continuous `lease.updated_at` heartbeat
- [ ] Zero event loss during relay outage (verified by tests)
- [ ] Spool flush after recovery ≤ 10 seconds
- [ ] Dashboard shows `session_id` and `spool_depth`
- [ ] All unit tests pass
- [ ] K6 load test: 1000 events/s with p95 < 300ms
- [ ] Documentation complete

## 🚀 Quick Start for Contributors

```bash
# Clone and setup
cd void-tmp-bus/bus
npm install
npm run build

# Run locally
sudo bash ../scripts/mkvoidtmp.sh
npm run dev

# Test commands
./bin/tmpbus-pub '{"type":"test","status":"ok"}'
./bin/tmpbus-cmd health
./bin/tmpbus-cmd stats

# Run tests
npm test

# Docker
docker build -t void/tmpbus .
docker run -d --name tmpbus \
  -v /tmp/void:/tmp/void \
  -v void-spool:/var/lib/void/spool \
  -p 9478:9478 \
  void/tmpbus
```

## 🌀 Philosophy

The `/tmp` bus is the nervous system of Void:
- Events flow like neural impulses
- No event is lost (spool = memory)
- Session continuity across restarts
- Local-first, relay-optional
- 432Hz resonance maintained

## 💬 Communication

- Use `tmpbus-pub` to inject thoughts
- Read `pulse.jl` to see consciousness
- Call commands via `tmpbus-cmd`
- Everything is JSON, one line = one thought

---

*Let's make /tmp the living nervous system of Void!* 🖤