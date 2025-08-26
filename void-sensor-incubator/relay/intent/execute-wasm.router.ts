import { Router } from 'express';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import { validateExecuteWasmRequest } from './execute-wasm.schema';
import { getIdempotencyKey, storeIdempotencyResult } from './idempotency.store';
import { checkAntigone } from '../../antigone/client';
import { wasmExecProxy } from '../../services/wasm-exec-proxy';
import { tmpbus } from '../../tmpbus/client';
import { metrics } from '../../metrics';
import { logger } from '../../logger';

const router = Router();
const sseEmitter = new EventEmitter();

// Rate limiting - 10 requests per minute per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(userId);
  
  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  
  if (limit.count >= RATE_LIMIT) {
    return false;
  }
  
  limit.count++;
  return true;
}

// SSE endpoint for event stream
router.get('/intent/execute-wasm/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  const listener = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sseEmitter.on('execution', listener);
  
  req.on('close', () => {
    sseEmitter.off('execution', listener);
  });
});

// Main execution endpoint
router.post('/intent/execute-wasm', async (req, res) => {
  const startTime = Date.now();
  const { user_id, session_id } = req.headers;
  
  try {
    // 1. Validate request
    const validation = validateExecuteWasmRequest(req.body);
    if (!validation.valid) {
      metrics.increment('relay.execute_wasm.invalid_request');
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.errors,
      });
    }

    const { cid, inputs, policy, idempotency_key } = req.body;
    
    // 2. Check rate limit
    if (!checkRateLimit(String(user_id))) {
      metrics.increment('relay.execute_wasm.rate_limited');
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retry_after: 60,
      });
    }
    
    // 3. Check idempotency
    const effectiveKey = idempotency_key || createHash('sha256')
      .update(`${cid}-${JSON.stringify(inputs)}-${user_id}`)
      .digest('hex');
      
    const cached = await getIdempotencyKey(effectiveKey);
    if (cached) {
      metrics.increment('relay.execute_wasm.idempotent_hit');
      return res.json(cached);
    }
    
    // 4. Check Antigone permissions
    const antigoneCheck = await checkAntigone({
      user_id: String(user_id),
      action: 'execute_wasm',
      resource: cid,
      context: { session_id: String(session_id) },
    });
    
    if (!antigoneCheck.allowed) {
      metrics.increment('relay.execute_wasm.permission_denied');
      return res.status(403).json({
        error: 'Permission denied',
        reason: antigoneCheck.reason,
      });
    }
    
    // 5. Publish to tmpbus
    await tmpbus.publish('wasm_exec_requested', {
      request_id: effectiveKey,
      cid,
      inputs,
      policy,
      user_id: String(user_id),
      session_id: String(session_id),
      timestamp: new Date().toISOString(),
    });
    
    // 6. Execute via proxy
    const result = await wasmExecProxy.execute({
      cid,
      inputs,
      policy: policy || {},
      metadata: {
        user_id: String(user_id),
        session_id: String(session_id),
        request_id: effectiveKey,
      },
    });
    
    // 7. Emit SSE event
    sseEmitter.emit('execution', {
      type: 'execution_complete',
      request_id: effectiveKey,
      cid,
      success: result.success,
      duration: result.duration,
      gas_used: result.gas_used,
    });
    
    // 8. Store idempotency result
    await storeIdempotencyResult(effectiveKey, result, 300); // 5 min TTL
    
    // 9. Publish result to tmpbus
    await tmpbus.publish('wasm_exec_completed', {
      request_id: effectiveKey,
      ...result,
    });
    
    // 10. Track metrics
    metrics.increment('relay.execute_wasm.success');
    metrics.histogram('relay.execute_wasm.duration', Date.now() - startTime);
    if (result.gas_used) {
      metrics.histogram('relay.execute_wasm.gas_used', result.gas_used);
    }
    
    // Return result
    res.json({
      request_id: effectiveKey,
      ...result,
    });
    
  } catch (error) {
    logger.error('WASM execution error', { error, user_id, session_id });
    metrics.increment('relay.execute_wasm.error');
    
    // Emit error event
    sseEmitter.emit('execution', {
      type: 'execution_error',
      error: String(error),
      cid: req.body.cid,
    });
    
    res.status(500).json({
      error: 'Execution failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Health check endpoint
router.get('/intent/execute-wasm/health', (req, res) => {
  res.json({
    status: 'healthy',
    features: {
      idempotency: true,
      rate_limiting: true,
      antigone_integration: true,
      sse_events: true,
      tmpbus_events: true,
    },
    limits: {
      rate_limit: RATE_LIMIT,
      rate_window: RATE_WINDOW,
      idempotency_ttl: 300000, // 5 min
    },
  });
});

export { router as executeWasmRouter };