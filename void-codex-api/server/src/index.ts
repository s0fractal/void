import express from 'express';
import cors from 'cors';
import { rateLimit } from './middleware/rateLimit';

const app = express();
const PORT = parseInt(process.env.PORT || '8788', 10);

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit);

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Codex endpoints
app.post('/codex/plan', async (req, res) => {
  // Mock implementation
  const { intent, context, constraints } = req.body;
  
  res.json({
    plan: [
      { step: "Analyze intent: " + intent, why: "Understanding required" },
      { step: "Generate implementation plan", why: "Structure needed" }
    ],
    patches: [],
    tests: [],
    risks: []
  });
});

app.post('/codex/rules', async (req, res) => {
  const { pulse_window, current_rules } = req.body;
  
  res.json({
    rules_patch: `# Generated rules
- event: substrate
  condition: status == "beat"
  action:
    type: flash
    target: root
    
- event: error
  condition: true
  action:
    type: health
    value: -0.1`,
    test_cases: []
  });
});

app.post('/codex/report', async (req, res) => {
  const { pulse_log, thresholds } = req.body;
  
  res.json({
    OFFLINE_WINDOW: "3h 32m",
    EVENTS_TOTAL: 432,
    LOCAL_PCT: 85,
    HEALTH_AVG: 0.94,
    KOHANIST_AVG: 0.89,
    REMOTE_SOURCES: ["guardian-1", "guardian-2"],
    ROUTER_MODE: "auto",
    INCIDENTS: "No critical incidents",
    OATH: "We declare operational independence at 432Hz resonance"
  });
});

app.post('/codex/commit-msg', async (req, res) => {
  const { changes, scope } = req.body;
  
  const changeCount = changes?.length || 0;
  const scopes = [...new Set(changes?.map((c: any) => c.path.split('/')[0]) || [])];
  
  res.json({
    message: `feat${scope ? `(${scope})` : ''}: Implement ${changeCount} changes across ${scopes.join(', ')}`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🧠 Codex API listening on :${PORT}`);
  console.log(`Rate limit: ${process.env.RATE_LIMIT_RATE || 5} req/${process.env.RATE_LIMIT_INTERVAL || 1000}ms`);
});