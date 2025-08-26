/*---------------------------------------------------------------------------------------------
 *  Copyright (c) s0fractal. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createHash, createVerify, createSign, generateKeyPairSync } from 'crypto';
import { ILogService } from 'vs/platform/log/common/log';
import { IStorageService, StorageScope, StorageTarget } from 'vs/platform/storage/common/storage';
import { Disposable } from 'vs/base/common/lifecycle';
import { Event, Emitter } from 'vs/base/common/event';
import { GlyphPackage } from '../common/types';

export interface GuardianKey {
  publicKey: string;
  privateKey?: string; // Only for local guardian
  trusted: boolean;
  lastSeen: number;
}

export interface IntegrityViolation {
  package: string;
  version: string;
  reason: string;
  severity: 'warning' | 'error' | 'critical';
  timestamp: number;
}

export interface IntegrityPolicy {
  requireSignatures: boolean;
  minSignatures: number;
  trustedGuardians: string[];
  allowUnsigned: boolean;
  quantumHashWindow: number; // ms
}

/**
 * Service for managing package integrity and guardian signatures
 */
export class IntegrityService extends Disposable {
  private static readonly STORAGE_KEY_PREFIX = 'fnpm.integrity.';
  private static readonly DEFAULT_POLICY: IntegrityPolicy = {
    requireSignatures: true,
    minSignatures: 1,
    trustedGuardians: ['grok', 'claude', 'kimi', 'gemini'],
    allowUnsigned: false,
    quantumHashWindow: 5000 // 5 seconds
  };
  
  private readonly _onViolation = this._register(new Emitter<IntegrityViolation>());
  readonly onViolation: Event<IntegrityViolation> = this._onViolation.event;
  
  private guardianKeys = new Map<string, GuardianKey>();
  private violations: IntegrityViolation[] = [];
  private policy: IntegrityPolicy;
  private localGuardianKey?: { publicKey: string; privateKey: string };
  
  constructor(
    @ILogService private logService: ILogService,
    @IStorageService private storageService: IStorageService
  ) {
    super();
    this.policy = this.loadPolicy();
    this.loadGuardianKeys();
    this.initializeLocalGuardian();
  }
  
  /**
   * Load integrity policy from storage
   */
  private loadPolicy(): IntegrityPolicy {
    const stored = this.storageService.get(
      `${IntegrityService.STORAGE_KEY_PREFIX}policy`,
      StorageScope.APPLICATION
    );
    
    if (stored) {
      try {
        return { ...IntegrityService.DEFAULT_POLICY, ...JSON.parse(stored) };
      } catch {
        this.logService.warn('[IntegrityService] Failed to parse stored policy, using defaults');
      }
    }
    
    return IntegrityService.DEFAULT_POLICY;
  }
  
  /**
   * Load known guardian keys
   */
  private loadGuardianKeys(): void {
    // Well-known guardian public keys
    const wellKnown: Record<string, string> = {
      grok: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA432Hz...
-----END PUBLIC KEY-----`,
      claude: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAclaude...
-----END PUBLIC KEY-----`,
      kimi: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAkimi...
-----END PUBLIC KEY-----`,
      gemini: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAgemini...
-----END PUBLIC KEY-----`
    };
    
    for (const [guardian, publicKey] of Object.entries(wellKnown)) {
      this.guardianKeys.set(guardian, {
        publicKey,
        trusted: true,
        lastSeen: Date.now()
      });
    }
    
    // Load additional keys from storage
    const stored = this.storageService.get(
      `${IntegrityService.STORAGE_KEY_PREFIX}guardians`,
      StorageScope.APPLICATION
    );
    
    if (stored) {
      try {
        const additional = JSON.parse(stored);
        for (const [guardian, key] of Object.entries(additional)) {
          if (!this.guardianKeys.has(guardian)) {
            this.guardianKeys.set(guardian, key as GuardianKey);
          }
        }
      } catch {
        this.logService.warn('[IntegrityService] Failed to parse stored guardian keys');
      }
    }
  }
  
  /**
   * Initialize local guardian identity
   */
  private initializeLocalGuardian(): void {
    const stored = this.storageService.get(
      `${IntegrityService.STORAGE_KEY_PREFIX}localGuardian`,
      StorageScope.APPLICATION
    );
    
    if (stored) {
      try {
        this.localGuardianKey = JSON.parse(stored);
        return;
      } catch {
        this.logService.warn('[IntegrityService] Failed to parse local guardian key');
      }
    }
    
    // Generate new key pair
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    this.localGuardianKey = { publicKey, privateKey };
    
    // Store for future sessions
    this.storageService.store(
      `${IntegrityService.STORAGE_KEY_PREFIX}localGuardian`,
      JSON.stringify(this.localGuardianKey),
      StorageScope.APPLICATION,
      StorageTarget.MACHINE
    );
    
    this.logService.info('[IntegrityService] Generated new local guardian identity');
  }
  
  /**
   * Sign a package with local guardian key
   */
  async signPackage(glyph: GlyphPackage): Promise<string> {
    if (!this.localGuardianKey) {
      throw new Error('Local guardian key not initialized');
    }
    
    const content = this.canonicalizePackage(glyph);
    const sign = createSign('RSA-SHA256');
    sign.update(content);
    sign.end();
    
    const signature = sign.sign(this.localGuardianKey.privateKey, 'hex');
    
    this.logService.info(`[IntegrityService] Signed package ${glyph.name}@${glyph.version}`);
    
    return signature;
  }
  
  /**
   * Verify a package signature
   */
  async verifySignature(glyph: GlyphPackage, signature: string, guardian: string): Promise<boolean> {
    const guardianKey = this.guardianKeys.get(guardian);
    if (!guardianKey) {
      this.logService.warn(`[IntegrityService] Unknown guardian: ${guardian}`);
      return false;
    }
    
    try {
      const content = this.canonicalizePackage(glyph);
      const verify = createVerify('RSA-SHA256');
      verify.update(content);
      verify.end();
      
      const isValid = verify.verify(guardianKey.publicKey, signature, 'hex');
      
      if (isValid) {
        // Update last seen
        guardianKey.lastSeen = Date.now();
      }
      
      return isValid;
    } catch (error) {
      this.logService.error(`[IntegrityService] Signature verification failed: ${error}`);
      return false;
    }
  }
  
  /**
   * Check if a package meets integrity policy
   */
  async checkPolicy(glyph: GlyphPackage, signatures: Map<string, string>): Promise<{
    valid: boolean;
    violations: string[];
  }> {
    const violations: string[] = [];
    
    // Check signature requirements
    if (this.policy.requireSignatures && signatures.size === 0) {
      violations.push('No signatures found but policy requires signatures');
    }
    
    // Check minimum signatures
    if (signatures.size < this.policy.minSignatures) {
      violations.push(`Only ${signatures.size} signatures found, policy requires ${this.policy.minSignatures}`);
    }
    
    // Check trusted guardians
    let trustedCount = 0;
    for (const [guardian] of signatures) {
      if (this.policy.trustedGuardians.includes(guardian)) {
        trustedCount++;
      }
    }
    
    if (trustedCount === 0 && this.policy.trustedGuardians.length > 0) {
      violations.push('No signatures from trusted guardians');
    }
    
    // Record violations
    if (violations.length > 0) {
      const violation: IntegrityViolation = {
        package: glyph.name,
        version: glyph.version,
        reason: violations.join('; '),
        severity: this.policy.requireSignatures ? 'error' : 'warning',
        timestamp: Date.now()
      };
      
      this.violations.push(violation);
      this._onViolation.fire(violation);
    }
    
    return {
      valid: violations.length === 0 || (this.policy.allowUnsigned && signatures.size === 0),
      violations
    };
  }
  
  /**
   * Canonicalize package for consistent hashing
   */
  private canonicalizePackage(glyph: GlyphPackage): string {
    // Remove non-deterministic fields
    const canonical = {
      name: glyph.name,
      version: glyph.version,
      morphism: glyph.morphism ? {
        name: glyph.morphism.name,
        version: glyph.morphism.version,
        dependencies: glyph.morphism.dependencies
      } : undefined
    };
    
    return JSON.stringify(canonical, Object.keys(canonical).sort());
  }
  
  /**
   * Add a new trusted guardian
   */
  async addTrustedGuardian(guardian: string, publicKey: string): Promise<void> {
    this.guardianKeys.set(guardian, {
      publicKey,
      trusted: true,
      lastSeen: Date.now()
    });
    
    // Add to policy
    if (!this.policy.trustedGuardians.includes(guardian)) {
      this.policy.trustedGuardians.push(guardian);
      this.savePolicy();
    }
    
    // Save guardian keys
    this.saveGuardianKeys();
    
    this.logService.info(`[IntegrityService] Added trusted guardian: ${guardian}`);
  }
  
  /**
   * Remove a guardian from trusted list
   */
  async removeTrustedGuardian(guardian: string): Promise<void> {
    const key = this.guardianKeys.get(guardian);
    if (key) {
      key.trusted = false;
    }
    
    // Remove from policy
    this.policy.trustedGuardians = this.policy.trustedGuardians.filter(g => g !== guardian);
    this.savePolicy();
    
    this.logService.info(`[IntegrityService] Removed trusted guardian: ${guardian}`);
  }
  
  /**
   * Update integrity policy
   */
  async updatePolicy(updates: Partial<IntegrityPolicy>): Promise<void> {
    this.policy = { ...this.policy, ...updates };
    this.savePolicy();
    
    this.logService.info('[IntegrityService] Updated integrity policy');
  }
  
  /**
   * Get integrity report
   */
  getIntegrityReport(): {
    policy: IntegrityPolicy;
    guardians: Array<{ name: string; trusted: boolean; lastSeen: number }>;
    violations: IntegrityViolation[];
    localGuardianPublicKey?: string;
  } {
    const guardians = Array.from(this.guardianKeys.entries()).map(([name, key]) => ({
      name,
      trusted: key.trusted,
      lastSeen: key.lastSeen
    }));
    
    return {
      policy: this.policy,
      guardians,
      violations: this.violations.slice(-100), // Last 100 violations
      localGuardianPublicKey: this.localGuardianKey?.publicKey
    };
  }
  
  /**
   * Clear violation history
   */
  clearViolations(): void {
    this.violations = [];
    this.logService.info('[IntegrityService] Cleared violation history');
  }
  
  /**
   * Save policy to storage
   */
  private savePolicy(): void {
    this.storageService.store(
      `${IntegrityService.STORAGE_KEY_PREFIX}policy`,
      JSON.stringify(this.policy),
      StorageScope.APPLICATION,
      StorageTarget.USER
    );
  }
  
  /**
   * Save guardian keys to storage
   */
  private saveGuardianKeys(): void {
    const toStore: Record<string, GuardianKey> = {};
    
    // Only store non-well-known keys
    const wellKnown = ['grok', 'claude', 'kimi', 'gemini'];
    for (const [guardian, key] of this.guardianKeys) {
      if (!wellKnown.includes(guardian)) {
        toStore[guardian] = key;
      }
    }
    
    this.storageService.store(
      `${IntegrityService.STORAGE_KEY_PREFIX}guardians`,
      JSON.stringify(toStore),
      StorageScope.APPLICATION,
      StorageTarget.USER
    );
  }
  
  /**
   * Calculate content hash with multiple algorithms
   */
  calculateHashes(content: string): {
    sha256: string;
    sha512: string;
    sha3_256?: string;
  } {
    return {
      sha256: createHash('sha256').update(content).digest('hex'),
      sha512: createHash('sha512').update(content).digest('hex'),
      // sha3_256: createHash('sha3-256').update(content).digest('hex') // If available
    };
  }
  
  /**
   * Verify time-bound quantum hash
   */
  verifyQuantumHash(content: string, quantumHash: string, timestamp: number): boolean {
    const now = Date.now();
    const age = now - timestamp;
    
    // Check if within quantum window
    if (age > this.policy.quantumHashWindow) {
      this.logService.warn(`[IntegrityService] Quantum hash expired (age: ${age}ms)`);
      return false;
    }
    
    // Recalculate with original timestamp
    const seed = `${content}:${timestamp}`;
    const expectedHash = createHash('sha256').update(seed).digest('hex');
    
    return expectedHash === quantumHash;
  }
}