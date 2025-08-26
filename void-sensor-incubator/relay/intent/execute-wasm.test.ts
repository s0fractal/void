import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { executeWasmRouter } from './execute-wasm.router';
import { idempotencyStore } from './idempotency.store';
import { checkAntigone } from '../../antigone/client';
import { wasmExecProxy } from '../../services/wasm-exec-proxy';
import { tmpbus } from '../../tmpbus/client';

// Mock dependencies
jest.mock('../../antigone/client');
jest.mock('../../services/wasm-exec-proxy');
jest.mock('../../tmpbus/client');
jest.mock('../../metrics', () => ({
  metrics: {
    increment: jest.fn(),
    histogram: jest.fn(),
  },
}));
jest.mock('../../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Execute WASM Router', () => {
  let app: express.Application;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(executeWasmRouter);
    
    // Clear mocks
    jest.clearAllMocks();
    
    // Clear idempotency store
    await idempotencyStore.shutdown();
    await idempotencyStore.initialize();
  });

  afterEach(async () => {
    await idempotencyStore.shutdown();
  });

  describe('POST /intent/execute-wasm', () => {
    const validRequest = {
      cid: 'bafkreibhmtmv24yn2zu7udv53bwwvgrylzhbep2e52p72tly7wjiufzpom',
      inputs: [1, 2],
      policy: {
        max_memory: 1024 * 1024, // 1MB
        max_gas: 1000000,
        max_time: 5000,
      },
    };

    it('should execute WASM successfully', async () => {
      // Mock successful execution
      (checkAntigone as jest.Mock).mockResolvedValue({ allowed: true });
      (wasmExecProxy.execute as jest.Mock).mockResolvedValue({
        success: true,
        output: 3,
        gas_used: 12345,
        duration: 150,
        executed_at: new Date().toISOString(),
      });
      (tmpbus.publish as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/intent/execute-wasm')
        .set('user_id', 'test-user')
        .set('session_id', 'test-session')
        .send(validRequest);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        output: 3,
        gas_used: 12345,
        request_id: expect.any(String),
      });
      
      // Verify tmpbus events
      expect(tmpbus.publish).toHaveBeenCalledWith('wasm_exec_requested', expect.any(Object));
      expect(tmpbus.publish).toHaveBeenCalledWith('wasm_exec_completed', expect.any(Object));
    });

    it('should handle invalid request', async () => {
      const response = await request(app)
        .post('/intent/execute-wasm')
        .set('user_id', 'test-user')
        .set('session_id', 'test-session')
        .send({
          cid: 'invalid-cid',
          inputs: [1, 2],
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Invalid request',
        details: expect.any(Array),
      });
    });

    it('should enforce rate limiting', async () => {
      (checkAntigone as jest.Mock).mockResolvedValue({ allowed: true });
      (wasmExecProxy.execute as jest.Mock).mockResolvedValue({ success: true });
      (tmpbus.publish as jest.Mock).mockResolvedValue(undefined);

      // Make 10 requests (rate limit)
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/intent/execute-wasm')
          .set('user_id', 'rate-limit-user')
          .set('session_id', 'test-session')
          .send(validRequest);
      }

      // 11th request should be rate limited
      const response = await request(app)
        .post('/intent/execute-wasm')
        .set('user_id', 'rate-limit-user')
        .set('session_id', 'test-session')
        .send(validRequest);

      expect(response.status).toBe(429);
      expect(response.body).toMatchObject({
        error: 'Rate limit exceeded',
        retry_after: 60,
      });
    });

    it('should handle idempotency', async () => {
      (checkAntigone as jest.Mock).mockResolvedValue({ allowed: true });
      (wasmExecProxy.execute as jest.Mock).mockResolvedValue({
        success: true,
        output: 3,
        request_id: 'test-idempotency-key',
      });
      (tmpbus.publish as jest.Mock).mockResolvedValue(undefined);

      const requestWithKey = {
        ...validRequest,
        idempotency_key: 'test-idempotency-key',
      };

      // First request
      const response1 = await request(app)
        .post('/intent/execute-wasm')
        .set('user_id', 'test-user')
        .set('session_id', 'test-session')
        .send(requestWithKey);

      expect(response1.status).toBe(200);
      expect(wasmExecProxy.execute).toHaveBeenCalledTimes(1);

      // Second request with same key
      const response2 = await request(app)
        .post('/intent/execute-wasm')
        .set('user_id', 'test-user')
        .set('session_id', 'test-session')
        .send(requestWithKey);

      expect(response2.status).toBe(200);
      expect(response2.body).toEqual(response1.body);
      // Should not execute again
      expect(wasmExecProxy.execute).toHaveBeenCalledTimes(1);
    });

    it('should check Antigone permissions', async () => {
      (checkAntigone as jest.Mock).mockResolvedValue({
        allowed: false,
        reason: 'User not authorized for WASM execution',
      });

      const response = await request(app)
        .post('/intent/execute-wasm')
        .set('user_id', 'unauthorized-user')
        .set('session_id', 'test-session')
        .send(validRequest);

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        error: 'Permission denied',
        reason: 'User not authorized for WASM execution',
      });
      
      expect(checkAntigone).toHaveBeenCalledWith({
        user_id: 'unauthorized-user',
        action: 'execute_wasm',
        resource: validRequest.cid,
        context: { session_id: 'test-session' },
      });
    });

    it('should handle execution errors', async () => {
      (checkAntigone as jest.Mock).mockResolvedValue({ allowed: true });
      (wasmExecProxy.execute as jest.Mock).mockRejectedValue(
        new Error('WASM execution failed: out of gas')
      );
      (tmpbus.publish as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/intent/execute-wasm')
        .set('user_id', 'test-user')
        .set('session_id', 'test-session')
        .send(validRequest);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Execution failed',
        message: 'WASM execution failed: out of gas',
      });
    });

    it('should support different input types', async () => {
      (checkAntigone as jest.Mock).mockResolvedValue({ allowed: true });
      (wasmExecProxy.execute as jest.Mock).mockResolvedValue({
        success: true,
        output: { result: 'processed' },
      });
      (tmpbus.publish as jest.Mock).mockResolvedValue(undefined);

      // Test with object inputs
      const response = await request(app)
        .post('/intent/execute-wasm')
        .set('user_id', 'test-user')
        .set('session_id', 'test-session')
        .send({
          cid: 'glyph://processor@quantum',
          inputs: {
            text: 'hello world',
            options: { uppercase: true },
          },
        });

      expect(response.status).toBe(200);
      expect(wasmExecProxy.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: {
            text: 'hello world',
            options: { uppercase: true },
          },
        })
      );
    });
  });

  describe('GET /intent/execute-wasm/events', () => {
    it('should establish SSE connection', async () => {
      const response = await request(app)
        .get('/intent/execute-wasm/events')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/event-stream');
      expect(response.headers['cache-control']).toBe('no-cache');
    });
  });

  describe('GET /intent/execute-wasm/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/intent/execute-wasm/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        features: {
          idempotency: true,
          rate_limiting: true,
          antigone_integration: true,
          sse_events: true,
          tmpbus_events: true,
        },
        limits: {
          rate_limit: 10,
          rate_window: 60000,
          idempotency_ttl: 300000,
        },
      });
    });
  });
});

describe('Execute WASM Schema Validation', () => {
  it('should validate various CID formats', async () => {
    const app = express();
    app.use(express.json());
    app.use(executeWasmRouter);
    
    (checkAntigone as jest.Mock).mockResolvedValue({ allowed: true });
    (wasmExecProxy.execute as jest.Mock).mockResolvedValue({ success: true });
    (tmpbus.publish as jest.Mock).mockResolvedValue(undefined);

    // Valid IPFS CID v0
    await request(app)
      .post('/intent/execute-wasm')
      .set('user_id', 'test')
      .set('session_id', 'test')
      .send({
        cid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        inputs: [],
      })
      .expect(200);

    // Valid IPFS CID v1
    await request(app)
      .post('/intent/execute-wasm')
      .set('user_id', 'test')
      .set('session_id', 'test')
      .send({
        cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
        inputs: [],
      })
      .expect(200);

    // Valid glyph:// URL
    await request(app)
      .post('/intent/execute-wasm')
      .set('user_id', 'test')
      .set('session_id', 'test')
      .send({
        cid: 'glyph://calculator@quantum',
        inputs: [1, 2],
      })
      .expect(200);

    // Invalid CID
    await request(app)
      .post('/intent/execute-wasm')
      .set('user_id', 'test')
      .set('session_id', 'test')
      .send({
        cid: 'invalid-cid-format',
        inputs: [],
      })
      .expect(400);
  });
});