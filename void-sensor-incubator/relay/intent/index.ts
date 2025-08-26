import { Router } from 'express';
import { executeWasmRouter } from './execute-wasm.router';
import { logger } from '../../logger';

// Create main intent router
const intentRouter = Router();

// Mount execute-wasm routes
intentRouter.use(executeWasmRouter);

// Log all intent routes
logger.info('Intent routes mounted', {
  routes: [
    'POST /intent/execute-wasm',
    'GET /intent/execute-wasm/events',
    'GET /intent/execute-wasm/health',
  ],
});

export { intentRouter };