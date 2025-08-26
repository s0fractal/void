/**
 * CID Resolver for FNPM
 * Resolves morphism targets to actual WASM files
 */

import { CID } from 'multiformats/cid';
import { join, dirname } from 'path';
import { stat, mkdir } from 'fs/promises';
import { createHash } from 'crypto';
import { ManifestIndex, IndexedGene } from './manifest-index.js';
import { IpfsFetcher } from '../io/ipfs-fetch.js';
import { HttpGatewayFetcher } from '../io/http-gateway.js';
import { WasmCache } from '../io/cache.js';
import { FnpmConfig } from '../config/fnpm.env.js';
import { recordMetric } from '../telemetry/metrics.js';

export interface MorphismTarget {
  cid?: string;
  astHash?: string;
}

export interface ResolveResult {
  path: string; // Absolute path to WASM file
  source: 'cache' | 'manifest' | 'ipfs' | 'http';
  gene: IndexedGene;
  verified: boolean;
}

export class CidResolver {
  private index: ManifestIndex;
  private cache: WasmCache;
  private ipfs?: IpfsFetcher;
  private http: HttpGatewayFetcher;

  constructor(
    private config: FnpmConfig,
    index?: ManifestIndex
  ) {
    this.index = index || new ManifestIndex(config.manifestDirs);
    this.cache = new WasmCache(config.cacheDir);
    
    if (config.ipfsApi) {
      this.ipfs = new IpfsFetcher(config.ipfsApi);
    }
    
    this.http = new HttpGatewayFetcher(config.httpGateways, {
      timeout: config.fetchTimeoutMs,
      maxRetries: config.maxRetries,
    });
  }

  /**
   * Initialize resolver (load manifests)
   */
  async init(): Promise<void> {
    await this.index.load();
    await this.cache.init();
  }

  /**
   * Resolve a morphism target to WASM file
   */
  async resolve(target: MorphismTarget, options: { dryRun?: boolean } = {}): Promise<ResolveResult | null> {
    const startTime = Date.now();
    
    try {
      // Try to resolve from index first
      let gene: IndexedGene | undefined;
      
      if (target.cid) {
        gene = this.index.findByCid(target.cid);
      } else if (target.astHash) {
        gene = this.index.findByAstHash(target.astHash);
      } else {
        throw new Error('Target must have either cid or astHash');
      }

      if (!gene) {
        if (target.cid) {
          // Try to fetch by CID
          return await this.fetchByCid(target.cid, options);
        } else {
          // Can't fetch by AST hash alone (need PR-D for similarity search)
          recordMetric('fnpm_wasm_resolve_total', { status: 'not_found' });
          return null;
        }
      }

      // Check cache first
      const cached = await this.cache.get(gene.cid);
      if (cached) {
        recordMetric('fnpm_wasm_fetch_total', { source: 'cache', status: 'hit' });
        return {
          path: cached,
          source: 'cache',
          gene,
          verified: true, // Cache is pre-verified
        };
      }

      // Check if manifest has local file
      const localPath = await this.tryLocalFile(gene);
      if (localPath) {
        // Verify and cache
        const verified = await this.verifyAndCache(localPath, gene);
        if (verified) {
          recordMetric('fnpm_wasm_fetch_total', { source: 'manifest', status: 'hit' });
          return {
            path: localPath,
            source: 'manifest',
            gene,
            verified: true,
          };
        }
      }

      // Fetch from network
      if (options.dryRun) {
        console.log(`[DRY RUN] Would fetch ${gene.cid} from network`);
        return null;
      }

      return await this.fetchByCid(gene.cid, options, gene);

    } finally {
      const duration = Date.now() - startTime;
      recordMetric('fnpm_wasm_resolve_duration_ms', duration);
    }
  }

  /**
   * Fetch WASM by CID from network
   */
  private async fetchByCid(
    cid: string,
    options: { dryRun?: boolean } = {},
    gene?: IndexedGene
  ): Promise<ResolveResult | null> {
    // Try IPFS first
    if (this.ipfs) {
      try {
        const bytes = await this.ipfs.fetch(cid);
        const path = await this.verifyAndSave(bytes, cid, gene);
        
        if (path) {
          recordMetric('fnpm_wasm_fetch_total', { source: 'ipfs', status: 'hit' });
          return {
            path,
            source: 'ipfs',
            gene: gene || this.createMinimalGene(cid),
            verified: true,
          };
        }
      } catch (error) {
        console.warn(`IPFS fetch failed for ${cid}:`, error);
      }
    }

    // Try HTTP gateways
    try {
      const bytes = await this.http.fetch(cid);
      const path = await this.verifyAndSave(bytes, cid, gene);
      
      if (path) {
        recordMetric('fnpm_wasm_fetch_total', { source: 'http', status: 'hit' });
        return {
          path,
          source: 'http',
          gene: gene || this.createMinimalGene(cid),
          verified: true,
        };
      }
    } catch (error) {
      console.error(`HTTP gateway fetch failed for ${cid}:`, error);
      recordMetric('fnpm_wasm_fetch_total', { source: 'http', status: 'error' });
    }

    return null;
  }

  /**
   * Try to find local file from manifest
   */
  private async tryLocalFile(gene: IndexedGene): Promise<string | null> {
    const manifest = this.index.getManifestForGene(gene);
    if (!manifest) return null;

    const manifestDir = dirname(gene.manifestPath);
    const wasmPath = join(manifestDir, `${gene.name}.${gene.lang}.wasm`);

    try {
      await stat(wasmPath);
      return wasmPath;
    } catch {
      return null;
    }
  }

  /**
   * Verify WASM and save to cache
   */
  private async verifyAndSave(
    bytes: Uint8Array,
    cid: string,
    gene?: IndexedGene
  ): Promise<string | null> {
    if (!this.config.verifyHashes) {
      return await this.cache.put(cid, bytes, gene);
    }

    // Verify CID
    const actualCid = await this.computeCid(bytes);
    if (actualCid !== cid) {
      recordMetric('fnpm_wasm_validation_fail_total', { reason: 'cid' });
      throw new Error(`CID mismatch: expected ${cid}, got ${actualCid}`);
    }

    // Verify SHA256 if we have gene metadata
    if (gene?.sha256) {
      const hash = createHash('sha256').update(bytes).digest('hex');
      if (hash !== gene.sha256) {
        recordMetric('fnpm_wasm_validation_fail_total', { reason: 'sha' });
        throw new Error(`SHA256 mismatch: expected ${gene.sha256}, got ${hash}`);
      }
    }

    // Verify size
    if (gene?.size && bytes.length !== gene.size) {
      recordMetric('fnpm_wasm_validation_fail_total', { reason: 'size' });
      throw new Error(`Size mismatch: expected ${gene.size}, got ${bytes.length}`);
    }

    return await this.cache.put(cid, bytes, gene);
  }

  /**
   * Verify local file and add to cache
   */
  private async verifyAndCache(path: string, gene: IndexedGene): Promise<boolean> {
    try {
      const bytes = await this.cache.readFile(path);
      await this.verifyAndSave(bytes, gene.cid, gene);
      return true;
    } catch (error) {
      console.warn(`Failed to verify ${path}:`, error);
      return false;
    }
  }

  /**
   * Compute CID from bytes
   */
  private async computeCid(bytes: Uint8Array): Promise<string> {
    // Import dynamically to match the builder
    const { generateCID } = await import('../../../tools/wasm-builder/src/cid.js');
    const cid = await generateCID(bytes);
    return cid.toString();
  }

  /**
   * Create minimal gene entry for unknown CIDs
   */
  private createMinimalGene(cid: string): IndexedGene {
    return {
      name: 'unknown',
      lang: 'wasm',
      cid,
      sha256: '',
      size: 0,
      car: '',
      phi: [],
      astHash: '',
      labels: ['fetched'],
      manifestPath: '',
      entry: '',
    };
  }
}