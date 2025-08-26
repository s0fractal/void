/**
 * HTTP Gateway Fetcher
 * Fetches WASM modules from public IPFS gateways
 */

import fetch, { AbortError } from 'node-fetch';

export interface GatewayOptions {
  timeout: number;
  maxRetries: number;
  userAgent?: string;
}

export class HttpGatewayFetcher {
  private gateways: string[];
  private options: GatewayOptions;

  constructor(gateways: string[], options: Partial<GatewayOptions> = {}) {
    this.gateways = gateways.map(g => g.replace(/\/$/, '')); // Remove trailing slashes
    this.options = {
      timeout: 10000,
      maxRetries: 3,
      userAgent: '@void/fnpm-core',
      ...options,
    };
  }

  /**
   * Fetch content from gateways with fallback
   */
  async fetch(cid: string): Promise<Uint8Array> {
    const errors: Error[] = [];

    for (const gateway of this.gateways) {
      try {
        console.log(`🌐 Trying gateway: ${gateway}`);
        const bytes = await this.fetchFromGateway(gateway, cid);
        return bytes;
      } catch (error) {
        errors.push(error as Error);
        console.warn(`Gateway ${gateway} failed:`, error);
        continue;
      }
    }

    throw new Error(`All gateways failed: ${errors.map(e => e.message).join(', ')}`);
  }

  /**
   * Fetch from a specific gateway
   */
  private async fetchFromGateway(gateway: string, cid: string): Promise<Uint8Array> {
    const url = `${gateway}/ipfs/${cid}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.options.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.options.timeout);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': this.options.userAgent || '',
          },
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Check content type
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error('Gateway returned HTML instead of binary data');
        }

        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        // Basic validation
        if (bytes.length === 0) {
          throw new Error('Gateway returned empty response');
        }

        return bytes;

      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof AbortError) {
          console.warn(`Timeout on attempt ${attempt + 1}`);
        }

        // Don't retry on certain errors
        if (error instanceof Error && error.message.includes('HTML')) {
          throw error;
        }

        if (attempt < this.options.maxRetries - 1) {
          // Exponential backoff
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError || new Error('Failed after retries');
  }

  /**
   * Test gateway availability
   */
  async testGateway(gateway: string): Promise<boolean> {
    try {
      // Try to fetch a known small CID
      const testCid = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'; // Empty directory
      const url = `${gateway}/ipfs/${testCid}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        signal: controller.signal,
        method: 'HEAD',
      });

      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get healthy gateways
   */
  async getHealthyGateways(): Promise<string[]> {
    const healthy: string[] = [];

    await Promise.all(
      this.gateways.map(async (gateway) => {
        if (await this.testGateway(gateway)) {
          healthy.push(gateway);
        }
      })
    );

    return healthy;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}