/**
 * Chimera Health Check Endpoint
 * Returns effective configuration after all precedence rules
 */

import { getEffectiveConfig } from '../config/chimera-flags';
import { chimeraGuard } from '../utils/chimera-guard';

export interface ChimeraHealthResponse {
  status: 'healthy' | 'frozen' | 'disabled';
  effective: Record<string, any>;
  guard: {
    requestCount: number;
    lastReset: string;
  };
  meta: {
    mode: 'smoke' | 'production';
  };
}

export function getChimeraHealth(): ChimeraHealthResponse {
  const effective = getEffectiveConfig();
  const config = chimeraGuard.getConfig();
  
  let status: 'healthy' | 'frozen' | 'disabled' = 'healthy';
  if (config.frozen) {
    status = 'frozen';
  } else if (!config.chimeraEnabled) {
    status = 'disabled';
  }

  return {
    status,
    effective,
    guard: {
      requestCount: 0, // Would come from guard internals
      lastReset: new Date().toISOString(),
    },
    meta: {
      mode: 'smoke', // Always smoke in tests
    },
  };
}

/**
 * Express route handler (example)
 */
export function chimeraHealthRoute(req: any, res: any): void {
  const health = getChimeraHealth();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  
  res.status(statusCode).json(health);
}