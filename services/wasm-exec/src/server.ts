import express from 'express';
import { register as metricsRegistry } from 'prom-client';
import { createLogger } from 'winston';
import { nanoid } from 'nanoid';
import { WasmRuntime } from './runtime.js';
import { PolicyEngine } from './policy.js';
import { getConfig, shouldExecute } from './config.js';
import { recordMetric, initMetrics } from './metrics.js';
import { emitEvent } from './util.js';

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: {
    simple: () => (info: any) => `${info.timestamp} ${info.level}: ${info.message}`,
  }(),
  transports: [new (require('winston').transports.Console)()],
});

const app = express();
app.use(express.json());

// Global state (would use Redis in production)
const runStates = new Map<string, any>();

// Initialize
const config = getConfig();
const runtime = new WasmRuntime(config);
const policy = new PolicyEngine(config);

initMetrics(config);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    config: {
      enabled: config.wasmExecEnabled,
      frozen: config.frozen,
      canary: config.canaryPercentage,
    },
  });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
});

// Execute WASM
app.post('/v1/exec', async (req, res) => {
  const runId = nanoid(12);
  const startTime = Date.now();
  
  try {
    const { target, entry, args = [], idempotency_key, labels = {} } = req.body;
    
    // Check if enabled
    if (!config.wasmExecEnabled) {
      return res.status(503).json({ error: 'WASM execution disabled' });
    }
    
    // Check if frozen
    if (config.frozen) {
      logger.warn('WASM execution frozen - accepting but not executing');
      recordMetric('wasm_runs_total', { status: 'frozen', mode: 'fail-open' });
      return res.status(202).json({ 
        run_id: runId, 
        accepted: true, 
        mode: 'frozen',
        warning: 'System frozen - execution skipped' 
      });
    }
    
    // Idempotency check
    if (idempotency_key && runStates.has(idempotency_key)) {
      const existing = runStates.get(idempotency_key);
      return res.status(200).json({ 
        run_id: existing.run_id, 
        accepted: true, 
        mode: 'cached' 
      });
    }
    
    // Check canary
    const executeMode = shouldExecute(config, runId) ? 'canary' : 'dry-run';
    
    // Store initial state
    const runState = {
      run_id: runId,
      target,
      entry,
      args,
      labels,
      mode: executeMode,
      status: 'accepted',
      created_at: new Date().toISOString(),
    };
    
    runStates.set(runId, runState);
    if (idempotency_key) {
      runStates.set(idempotency_key, runState);
    }
    
    // Emit start event
    emitEvent('wasm.exec.started', {
      run_id: runId,
      target,
      mode: executeMode,
      labels,
    });
    
    // Return accepted immediately
    res.status(202).json({
      run_id: runId,
      accepted: true,
      mode: executeMode,
    });
    
    // Execute async
    if (executeMode === 'canary') {
      executeAsync(runId, runState);
    } else {
      // Dry run - just mark as finished
      runState.status = 'finished';
      runState.result = { dry_run: true };
      recordMetric('wasm_runs_total', { status: 'dry-run', mode: 'dry-run' });
    }
    
  } catch (error) {
    logger.error('Exec error:', error);
    recordMetric('wasm_runs_total', { status: 'error', mode: 'error' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get run status
app.get('/v1/runs/:runId', (req, res) => {
  const runState = runStates.get(req.params.runId);
  
  if (!runState) {
    return res.status(404).json({ error: 'Run not found' });
  }
  
  res.json({
    status: runState.status,
    result: runState.result,
    error: runState.error,
    usage: runState.usage,
    policy: runState.policy,
    created_at: runState.created_at,
    finished_at: runState.finished_at,
  });
});

// Async execution
async function executeAsync(runId: string, runState: any) {
  const startTime = Date.now();
  
  try {
    runState.status = 'running';
    
    // Check policy
    const policyDecision = await policy.evaluate(runState);
    runState.policy = policyDecision;
    
    if (!policyDecision.allowed) {
      throw new Error(`Policy denied: ${policyDecision.reason}`);
    }
    
    // Execute WASM
    const result = await runtime.execute(runState);
    
    // Update state
    runState.status = 'finished';
    runState.result = result.value;
    runState.usage = result.usage;
    runState.finished_at = new Date().toISOString();
    
    // Metrics
    const duration = Date.now() - startTime;
    recordMetric('wasm_runs_total', { status: 'success', mode: 'canary' });
    recordMetric('wasm_run_duration_ms', duration);
    
    // Emit finished event
    emitEvent('wasm.exec.finished', {
      run_id: runId,
      duration_ms: duration,
      usage: result.usage,
    });
    
  } catch (error: any) {
    runState.status = 'error';
    runState.error = error.message;
    runState.finished_at = new Date().toISOString();
    
    logger.error(`Run ${runId} failed:`, error);
    recordMetric('wasm_runs_total', { status: 'error', mode: 'canary' });
    
    // Emit error event
    emitEvent('wasm.exec.error', {
      run_id: runId,
      error: error.message,
    });
  }
}

// Start server
const port = process.env.PORT || 3456;
app.listen(port, () => {
  logger.info(`WASM executor listening on port ${port}`);
  logger.info(`Config: enabled=${config.wasmExecEnabled}, canary=${config.canaryPercentage}`);
});