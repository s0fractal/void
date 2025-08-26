/**
 * IPFS Fetcher
 * Fetches WASM modules from local or remote IPFS node
 */

import fetch from 'node-fetch';

export class IpfsFetcher {
  constructor(private apiUrl: string) {
    // Ensure URL doesn't have trailing slash
    this.apiUrl = apiUrl.replace(/\/$/, '');
  }

  /**
   * Fetch content by CID from IPFS
   */
  async fetch(cid: string): Promise<Uint8Array> {
    const url = `${this.apiUrl}/api/v0/cat?arg=${cid}`;
    
    const response = await fetch(url, {
      method: 'POST',
      timeout: 30000, // 30s timeout for IPFS
    });

    if (!response.ok) {
      throw new Error(`IPFS fetch failed: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }

  /**
   * Check if IPFS node is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v0/id`, {
        method: 'POST',
        timeout: 5000,
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Pin content to ensure availability
   */
  async pin(cid: string): Promise<void> {
    const url = `${this.apiUrl}/api/v0/pin/add?arg=${cid}`;
    
    const response = await fetch(url, {
      method: 'POST',
      timeout: 30000,
    });

    if (!response.ok) {
      throw new Error(`IPFS pin failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Get node info
   */
  async getNodeInfo(): Promise<any> {
    const response = await fetch(`${this.apiUrl}/api/v0/id`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to get IPFS node info`);
    }

    return response.json();
  }
}