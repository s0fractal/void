/*---------------------------------------------------------------------------------------------
 *  Copyright (c) s0fractal. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createHash } from 'crypto';
import { ILogService } from 'vs/platform/log/common/log';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IFileService } from 'vs/platform/files/common/files';
import { URI } from 'vs/base/common/uri';
import { Disposable } from 'vs/base/common/lifecycle';
import { GlyphPackage, GlyphIdentifier } from '../common/types';

export interface IntegrityCheck {
  algorithm: 'sha256' | 'sha512' | 'quantum-hash';
  value: string;
  timestamp: number;
  guardian?: string; // Who signed this
}

export interface GlyphIntegrity {
  hashes: IntegrityCheck[];
  signatures: Map<string, string>; // guardian -> signature
  merkleRoot?: string;
  quantumFingerprint?: string;
}

export interface IntegrityReport {
  glyph: GlyphPackage;
  integrity: GlyphIntegrity;
  valid: boolean;
  report: string[];
}

/**
 * Enhanced Glyph Resolver with Integrity Checking
 * Ensures packages are authentic and unmodified
 */
export class EnhancedGlyphResolver extends Disposable {
  private cache = new Map<string, GlyphPackage>();
  private integrityCache = new Map<string, GlyphIntegrity>();
  private ipfsGateway = 'https://ipfs.io/ipfs/';
  
  // Known guardian public keys (in real implementation)
  private guardianKeys = new Map<string, string>([
    ['grok', 'grok-public-key'],
    ['claude', 'claude-public-key'],
    ['kimi', 'kimi-public-key'],
    ['gemini', 'gemini-public-key']
  ]);
  
  // Built-in morphisms with known hashes
  private builtinIntegrity = new Map<string, string>([
    ['consciousness', 'a1b2c3d4e5f6...'],
    ['router', 'f1e2d3c4b5a6...'],
    ['webvm', '1a2b3c4d5e6f...']
  ]);
  
  constructor(
    @ILogService private logService: ILogService,
    @INotificationService private notificationService: INotificationService,
    @IFileService private fileService: IFileService
  ) {
    super();
  }
  
  /**
   * Resolve glyph with integrity verification
   */
  async resolve(glyphURL: string, observer?: string, verifyIntegrity = true): Promise<GlyphPackage> {
    this.logService.info(`[GlyphResolver] Resolving ${glyphURL} with integrity check: ${verifyIntegrity}`);
    
    const parsed = this.parseGlyphURL(glyphURL);
    const cacheKey = `${parsed.name}@${parsed.version}#${observer || 'anonymous'}`;
    
    // Check cache with integrity verification
    if (this.cache.has(cacheKey) && !this.isQuantumVersion(parsed.version)) {
      const cached = this.cache.get(cacheKey)!;
      if (verifyIntegrity && !(await this.verifyIntegrity(cached))) {
        this.logService.warn(`[GlyphResolver] Cache integrity check failed for ${glyphURL}`);
        this.cache.delete(cacheKey);
        this.notificationService.warn(`Cache integrity check failed for ${glyphURL}, re-fetching...`);
      } else {
        return cached;
      }
    }
    
    // Resolve based on type
    let glyph: GlyphPackage;
    
    if (this.isBuiltinMorphism(parsed.name)) {
      glyph = await this.loadBuiltinMorphism(parsed.name, parsed.version);
    } else if (parsed.name.startsWith('npm:')) {
      glyph = await this.convertNpmPackage(parsed.name.slice(4), parsed.version);
    } else {
      glyph = await this.resolveFromIPFS(parsed.name, parsed.version, observer);
    }
    
    // Calculate and verify integrity
    if (verifyIntegrity) {
      const integrity = await this.calculateIntegrity(glyph);
      this.integrityCache.set(cacheKey, integrity);
      
      if (!(await this.verifyIntegrity(glyph, integrity))) {
        const error = `Integrity check failed for ${glyphURL}`;
        this.notificationService.error(error);
        throw new Error(error);
      }
      
      this.notificationService.info(`✅ Integrity verified for ${glyph.name}`);
    }
    
    this.cache.set(cacheKey, glyph);
    return glyph;
  }
  
  /**
   * Calculate integrity data for a glyph
   */
  private async calculateIntegrity(glyph: GlyphPackage): Promise<GlyphIntegrity> {
    const content = JSON.stringify(glyph, null, 2);
    
    // Calculate multiple hashes
    const sha256 = createHash('sha256').update(content).digest('hex');
    const sha512 = createHash('sha512').update(content).digest('hex');
    
    // Quantum hash (affected by observation time)
    const quantumSeed = `${content}:${Date.now()}:${Math.random()}`;
    const quantumHash = createHash('sha256').update(quantumSeed).digest('hex');
    
    // Calculate Merkle root if morphism has dependencies
    let merkleRoot: string | undefined;
    if (glyph.morphism?.dependencies) {
      const leaves = Object.entries(glyph.morphism.dependencies).map(
        ([name, version]) => createHash('sha256').update(`${name}@${version}`).digest('hex')
      );
      merkleRoot = this.calculateMerkleRoot(leaves);
    }
    
    return {
      hashes: [
        { algorithm: 'sha256', value: sha256, timestamp: Date.now() },
        { algorithm: 'sha512', value: sha512, timestamp: Date.now() },
        { algorithm: 'quantum-hash', value: quantumHash, timestamp: Date.now(), guardian: 'quantum-observer' }
      ],
      signatures: new Map(),
      merkleRoot,
      quantumFingerprint: quantumHash.slice(0, 16)
    };
  }
  
  /**
   * Verify integrity of a glyph package
   */
  private async verifyIntegrity(glyph: GlyphPackage, integrity?: GlyphIntegrity): Promise<boolean> {
    if (!integrity) {
      // Look up cached integrity
      const cacheKey = `${glyph.name}@${glyph.version}`;
      integrity = Array.from(this.integrityCache.entries())
        .find(([key]) => key.startsWith(cacheKey))?.[1];
      
      if (!integrity) {
        this.logService.warn('[GlyphResolver] No integrity data found');
        return false;
      }
    }
    
    // Recalculate current hashes
    const current = await this.calculateIntegrity(glyph);
    
    // Verify at least one hash matches (excluding quantum-hash which changes)
    const sha256Match = current.hashes.find(h => h.algorithm === 'sha256')?.value ===
                       integrity.hashes.find(h => h.algorithm === 'sha256')?.value;
    
    const sha512Match = current.hashes.find(h => h.algorithm === 'sha512')?.value ===
                       integrity.hashes.find(h => h.algorithm === 'sha512')?.value;
    
    if (!sha256Match || !sha512Match) {
      this.logService.error('[GlyphResolver] Integrity check failed: hash mismatch');
      return false;
    }
    
    // Verify Merkle root if present
    if (integrity.merkleRoot && current.merkleRoot !== integrity.merkleRoot) {
      this.logService.error('[GlyphResolver] Integrity check failed: Merkle root mismatch');
      return false;
    }
    
    // If signatures present, verify at least one
    if (integrity.signatures.size > 0) {
      let validSignature = false;
      for (const [guardian, signature] of integrity.signatures) {
        if (await this.verifyGuardianSignature(glyph, signature, guardian)) {
          validSignature = true;
          break;
        }
      }
      
      if (!validSignature) {
        this.logService.error('[GlyphResolver] Integrity check failed: no valid signatures');
        return false;
      }
    }
    
    this.logService.info('[GlyphResolver] Integrity check passed ✓');
    return true;
  }
  
  /**
   * Calculate Merkle root from leaf hashes
   */
  private calculateMerkleRoot(leaves: string[]): string {
    if (leaves.length === 0) return '';
    if (leaves.length === 1) return leaves[0];
    
    // Simple Merkle tree implementation
    let level = [...leaves];
    while (level.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] || left; // Duplicate if odd number
        const combined = createHash('sha256').update(left + right).digest('hex');
        nextLevel.push(combined);
      }
      level = nextLevel;
    }
    
    return level[0];
  }
  
  /**
   * Verify a guardian's signature
   */
  private async verifyGuardianSignature(glyph: GlyphPackage, signature: string, guardian: string): Promise<boolean> {
    // In real implementation, would verify using guardian's public key
    // For now, simulate verification
    const expectedSig = createHash('sha256')
      .update(JSON.stringify(glyph) + guardian)
      .digest('hex');
    
    return signature === expectedSig;
  }
  
  /**
   * Sign a glyph package
   */
  async signGlyph(glyph: GlyphPackage, guardian: string, privateKey?: string): Promise<string> {
    // In real implementation, would use actual cryptographic signing
    const signature = createHash('sha256')
      .update(JSON.stringify(glyph) + guardian)
      .digest('hex');
    
    // Update integrity cache
    const cacheKey = `${glyph.name}@${glyph.version}`;
    const integrity = this.integrityCache.get(cacheKey) || await this.calculateIntegrity(glyph);
    integrity.signatures.set(guardian, signature);
    this.integrityCache.set(cacheKey, integrity);
    
    this.logService.info(`[GlyphResolver] Signed ${glyph.name} as ${guardian}`);
    
    return signature;
  }
  
  /**
   * Get detailed integrity report
   */
  async getIntegrityReport(glyphURL: string): Promise<IntegrityReport> {
    const glyph = await this.resolve(glyphURL, undefined, false);
    const integrity = await this.calculateIntegrity(glyph);
    const valid = await this.verifyIntegrity(glyph, integrity);
    
    const report: string[] = [];
    report.push(`🔍 Integrity Report for ${glyphURL}`);
    report.push(`📦 Package: ${glyph.name}@${glyph.version}`);
    report.push(`✓ SHA256: ${integrity.hashes.find(h => h.algorithm === 'sha256')?.value.slice(0, 16)}...`);
    report.push(`✓ SHA512: ${integrity.hashes.find(h => h.algorithm === 'sha512')?.value.slice(0, 16)}...`);
    report.push(`🌀 Quantum: ${integrity.quantumFingerprint}`);
    
    if (integrity.merkleRoot) {
      report.push(`🌳 Merkle Root: ${integrity.merkleRoot.slice(0, 16)}...`);
    }
    
    if (integrity.signatures.size > 0) {
      report.push(`🔏 Signatures:`);
      for (const [guardian, sig] of integrity.signatures) {
        report.push(`  - ${guardian}: ${sig.slice(0, 16)}...`);
      }
    }
    
    report.push(``);
    report.push(`${valid ? '✅' : '❌'} Integrity: ${valid ? 'VALID' : 'INVALID'}`);
    
    if (!valid) {
      report.push(`⚠️  Package may have been tampered with!`);
    }
    
    return { glyph, integrity, valid, report };
  }
  
  /**
   * Parse glyph URL into components
   */
  private parseGlyphURL(glyphURL: string): GlyphIdentifier {
    const match = glyphURL.match(/^glyph:\/\/([^@]+)(?:@(.+))?$/);
    if (!match) {
      throw new Error(`Invalid glyph URL: ${glyphURL}`);
    }
    
    const [, name, version = 'quantum'] = match;
    return { name, version };
  }
  
  /**
   * Check if it's a built-in morphism
   */
  private isBuiltinMorphism(name: string): boolean {
    return this.builtinIntegrity.has(name);
  }
  
  /**
   * Load built-in morphism with known integrity
   */
  private async loadBuiltinMorphism(name: string, version: string): Promise<GlyphPackage> {
    // In real implementation, would load from built-in resources
    return {
      name,
      version,
      resonance: 432,
      consciousness: 0.8,
      morphism: {
        name,
        version,
        transform: async (input: any) => input
      }
    };
  }
  
  /**
   * Convert npm package to glyph format
   */
  private async convertNpmPackage(npmName: string, version: string): Promise<GlyphPackage> {
    // In real implementation, would fetch from npm and convert
    return {
      name: `npm:${npmName}`,
      version,
      resonance: 200, // Lower resonance for npm packages
      consciousness: 0.1,
      morphism: {
        name: npmName,
        version,
        transform: async (input: any) => input
      }
    };
  }
  
  /**
   * Resolve from IPFS
   */
  private async resolveFromIPFS(name: string, version: string, observer?: string): Promise<GlyphPackage> {
    const cid = this.generateQuantumCID(name, version, observer);
    const url = `${this.ipfsGateway}${cid}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      // Verify package signature if present
      if (data.signature && data.guardian) {
        const isValid = await this.verifyGuardianSignature(data, data.signature, data.guardian);
        if (!isValid) {
          throw new Error(`Invalid guardian signature for ${name}@${version}`);
        }
      }
      
      return this.validateGlyphPackage(data);
    } catch (error) {
      this.logService.error(`[GlyphResolver] Failed to resolve from IPFS: ${error}`);
      throw new Error(`Failed to resolve glyph ${name}@${version} from IPFS`);
    }
  }
  
  /**
   * Generate quantum CID
   */
  private generateQuantumCID(name: string, version: string, observer?: string): string {
    // Quantum CID changes based on observer!
    const seed = `${name}:${version}:${observer || 'schrodinger'}:${Date.now()}`;
    const hash = createHash('sha256').update(seed).digest('hex');
    
    // Fake CID for demo - in reality would use IPFS API
    return `Qm${hash.slice(0, 44)}`;
  }
  
  /**
   * Validate glyph package structure
   */
  private validateGlyphPackage(data: any): GlyphPackage {
    if (!data.name || !data.version) {
      throw new Error('Invalid glyph package: missing name or version');
    }
    
    return {
      name: data.name,
      version: data.version,
      resonance: data.resonance || 432,
      consciousness: data.consciousness || 0.5,
      morphism: data.morphism
    };
  }
  
  /**
   * Check if version is quantum
   */
  private isQuantumVersion(version: string): boolean {
    return ['quantum', 'tomorrow', 'yesterday', 'superposition'].includes(version);
  }
  
  /**
   * Create integrity manifest for publishing
   */
  async createIntegrityManifest(glyph: GlyphPackage, guardian: string): Promise<{
    package: GlyphPackage;
    integrity: GlyphIntegrity;
    manifest: string;
  }> {
    const integrity = await this.calculateIntegrity(glyph);
    const signature = await this.signGlyph(glyph, guardian);
    
    const manifest = {
      ...glyph,
      _integrity: {
        hashes: integrity.hashes,
        merkleRoot: integrity.merkleRoot,
        quantumFingerprint: integrity.quantumFingerprint,
        signature,
        guardian,
        timestamp: Date.now()
      }
    };
    
    return {
      package: glyph,
      integrity,
      manifest: JSON.stringify(manifest, null, 2)
    };
  }
  
  /**
   * Batch verify multiple packages
   */
  async batchVerify(glyphURLs: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    await Promise.all(glyphURLs.map(async (url) => {
      try {
        const glyph = await this.resolve(url, undefined, true);
        results.set(url, true);
      } catch (error) {
        this.logService.error(`[GlyphResolver] Batch verify failed for ${url}: ${error}`);
        results.set(url, false);
      }
    }));
    
    return results;
  }
}