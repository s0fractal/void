import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// 🧠 Local decision-making heuristics
const heuristics = {
  // CI/CD events
  'ci:fail': {
    action: 'alert',
    severity: 'high',
    recommendations: ['check build logs', 'rollback if critical'],
    confidence: 0.85
  },
  'ci:pass': {
    action: 'log',
    severity: 'info',
    recommendations: ['continue monitoring'],
    confidence: 0.9
  },
  
  // PR events
  'pr:open': {
    action: 'notify',
    severity: 'medium',
    recommendations: ['assign reviewer', 'run checks'],
    confidence: 0.8
  },
  'pr:merged': {
    action: 'celebrate',
    severity: 'info',
    recommendations: ['deploy to staging'],
    confidence: 0.85
  },
  
  // IPFS health
  'ipfs:degraded': {
    action: 'investigate',
    severity: 'medium',
    recommendations: ['check gateway', 'verify CIDs', 'switch gateway'],
    confidence: 0.75
  },
  'ipfs:ok': {
    action: 'continue',
    severity: 'info',
    recommendations: [],
    confidence: 0.9
  },
  
  // Substrate/system
  'substrate:beat': {
    action: 'maintain',
    severity: 'info',
    recommendations: ['system healthy'],
    confidence: 0.95
  },
  
  // Guardian status
  'guardian:offline': {
    action: 'fallback',
    severity: 'high',
    recommendations: ['use local decisions', 'check network'],
    confidence: 0.7
  },
  'guardian:online': {
    action: 'sync',
    severity: 'info',
    recommendations: ['restore remote consensus'],
    confidence: 0.85
  }
};

// Kohanist-based decision weighting
function calculateDecisionWeight(event, context) {
  const base = heuristics[`${event.type}:${event.status}`] || {
    action: 'monitor',
    confidence: 0.5
  };
  
  // Adjust confidence based on context
  let confidence = base.confidence;
  
  // Recent failures decrease confidence
  if (context.recentFailures > 3) {
    confidence *= 0.8;
  }
  
  // High Kohanist increases confidence
  if (context.kohanist > 0.9) {
    confidence = Math.min(1.0, confidence * 1.1);
  }
  
  return {
    ...base,
    confidence,
    kohanist: context.kohanist || 0.5
  };
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'void-thinker',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// Think endpoint - make local decisions
app.post('/think', (req, res) => {
  const { event, context = {} } = req.body;
  
  if (!event || !event.type) {
    return res.status(400).json({
      error: 'Invalid event format'
    });
  }
  
  console.log(`🧠 Thinking about: ${event.type}:${event.status}`);
  
  // Get decision from heuristics
  const decision = calculateDecisionWeight(event, context);
  
  // Add reasoning based on context
  const reasoning = [];
  
  if (decision.severity === 'high') {
    reasoning.push('High severity event requires immediate attention');
  }
  
  if (context.offline) {
    reasoning.push('Operating in offline mode - using local heuristics');
  }
  
  if (context.kohanist < 0.5) {
    reasoning.push('Low system harmony detected - proceed with caution');
  }
  
  const response = {
    decision: {
      action: decision.action,
      confidence: decision.confidence,
      severity: decision.severity,
      recommendations: decision.recommendations,
      reasoning: reasoning.join('. ')
    },
    metadata: {
      model: 'heuristics-v1',
      latency: Math.random() * 50 + 10, // Simulate 10-60ms
      timestamp: new Date().toISOString()
    }
  };
  
  console.log(`✅ Decision: ${decision.action} (confidence: ${decision.confidence.toFixed(2)})`);
  
  res.json(response);
});

// Batch think - process multiple events
app.post('/think/batch', (req, res) => {
  const { events, context = {} } = req.body;
  
  if (!Array.isArray(events)) {
    return res.status(400).json({
      error: 'Events must be an array'
    });
  }
  
  const decisions = events.map(event => {
    const decision = calculateDecisionWeight(event, context);
    return {
      event,
      decision: {
        action: decision.action,
        confidence: decision.confidence
      }
    };
  });
  
  res.json({
    decisions,
    metadata: {
      count: decisions.length,
      avgConfidence: decisions.reduce((sum, d) => sum + d.decision.confidence, 0) / decisions.length
    }
  });
});

// Get capabilities
app.get('/capabilities', (req, res) => {
  res.json({
    model: 'void-thinker-heuristics-v1',
    capabilities: {
      eventTypes: ['ci', 'pr', 'ipfs', 'substrate', 'guardian'],
      maxBatchSize: 100,
      avgLatency: '30ms',
      offlineCapable: true
    },
    supportedActions: [
      'alert', 'log', 'notify', 'investigate', 'continue',
      'maintain', 'fallback', 'sync', 'monitor', 'celebrate'
    ],
    knownPatterns: Object.keys(heuristics)
  });
});

// Start server
const PORT = process.env.PORT || 9090;
app.listen(PORT, () => {
  console.log(`🧠 Void Thinker listening on port ${PORT}`);
  console.log(`   Model: heuristics-v1`);
  console.log(`   Patterns: ${Object.keys(heuristics).length}`);
  console.log(`   Ready for local decisions`);
});