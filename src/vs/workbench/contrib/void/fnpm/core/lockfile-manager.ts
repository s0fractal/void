/*---------------------------------------------------------------------------------------------
 *  Copyright (c) s0fractal. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createHash } from 'crypto';
import { IFileService } from 'vs/platform/files/common/files';
import { URI } from 'vs/base/common/uri';
import { ILogService } from 'vs/platform/log/common/log';
import { Disposable } from 'vs/base/common/lifecycle';
import { GlyphPackage, QuantumVersion } from '../common/types';

export interface LockEntry {
  resolved: string; // Full glyph URL that was resolved
  integrity: string; // SHA512 hash
  ipfsCID?: string; // IPFS content identifier
  quantumState?: {
    observer: string;
    timestamp: number;
    collapsed: string; // Which version was observed
  };
  dependencies?: Record<string, string>; // Transitive deps
  signatures?: Record<string, string>; // Guardian signatures
}

export interface FNPMLockFile {
  version: number; // Lock file format version
  resonance: number; // Global resonance at lock time
  timestamp: number; // When locked
  timeline: string; // Which timeline this lock is for
  packages: Record<string, LockEntry>;
  _meta?: {
    guardian?: string; // Who created this lock
    reason?: string; // Why it was created/updated
  };
}

/**
 * Manages fnpm-lock.yaml files for reproducible installs
 */
export class LockfileManager extends Disposable {
  private static readonly LOCKFILE_NAME = 'fnpm-lock.yaml';
  private static readonly LOCKFILE_VERSION = 1;
  
  constructor(
    @IFileService private fileService: IFileService,
    @ILogService private logService: ILogService
  ) {
    super();
  }
  
  /**
   * Read lock file from project
   */
  async readLockfile(projectUri: URI): Promise<FNPMLockFile | null> {
    const lockfileUri = URI.joinPath(projectUri, LockfileManager.LOCKFILE_NAME);
    
    try {
      const content = await this.fileService.readFile(lockfileUri);
      const text = content.value.toString();
      return this.parseLockfile(text);
    } catch (error) {
      this.logService.info(`[LockfileManager] No lock file found at ${lockfileUri}`);
      return null;
    }
  }
  
  /**
   * Write lock file to project
   */
  async writeLockfile(projectUri: URI, lockfile: FNPMLockFile): Promise<void> {
    const lockfileUri = URI.joinPath(projectUri, LockfileManager.LOCKFILE_NAME);
    const content = this.serializeLockfile(lockfile);
    
    await this.fileService.writeFile(
      lockfileUri,
      Buffer.from(content, 'utf8')
    );
    
    this.logService.info(`[LockfileManager] Wrote lock file to ${lockfileUri}`);
  }
  
  /**
   * Create lock entry for a resolved package
   */
  createLockEntry(
    requestedVersion: string,
    resolved: GlyphPackage,
    ipfsCID?: string,
    observer?: string
  ): LockEntry {
    const entry: LockEntry = {
      resolved: `glyph://${resolved.name}@${resolved.version}`,
      integrity: this.calculateIntegrity(resolved),
      ipfsCID
    };
    
    // Add quantum state if applicable
    if (this.isQuantumVersion(requestedVersion)) {
      entry.quantumState = {
        observer: observer || 'anonymous',
        timestamp: Date.now(),
        collapsed: resolved.version
      };
    }
    
    // Add dependencies if present
    if (resolved.morphism?.dependencies) {
      entry.dependencies = resolved.morphism.dependencies;
    }
    
    return entry;
  }
  
  /**
   * Update or create lock file with new installations
   */
  async updateLockfile(
    projectUri: URI,
    updates: Record<string, LockEntry>,
    meta?: { guardian?: string; reason?: string }
  ): Promise<FNPMLockFile> {
    // Read existing or create new
    let lockfile = await this.readLockfile(projectUri);
    
    if (!lockfile) {
      lockfile = {
        version: LockfileManager.LOCKFILE_VERSION,
        resonance: 432, // Default resonance
        timestamp: Date.now(),
        timeline: this.getCurrentTimeline(),
        packages: {}
      };
    }
    
    // Merge updates
    lockfile.packages = {
      ...lockfile.packages,
      ...updates
    };
    
    // Update metadata
    lockfile.timestamp = Date.now();
    if (meta) {
      lockfile._meta = meta;
    }
    
    // Write back
    await this.writeLockfile(projectUri, lockfile);
    
    return lockfile;
  }
  
  /**
   * Verify lock file integrity
   */
  async verifyLockfile(projectUri: URI, packages: Map<string, GlyphPackage>): Promise<{
    valid: boolean;
    mismatches: string[];
  }> {
    const lockfile = await this.readLockfile(projectUri);
    if (!lockfile) {
      return { valid: false, mismatches: ['No lock file found'] };
    }
    
    const mismatches: string[] = [];
    
    for (const [name, lockEntry] of Object.entries(lockfile.packages)) {
      const installed = packages.get(name);
      
      if (!installed) {
        mismatches.push(`${name}: not installed`);
        continue;
      }
      
      // Check integrity
      const currentIntegrity = this.calculateIntegrity(installed);
      if (currentIntegrity !== lockEntry.integrity) {
        mismatches.push(`${name}: integrity mismatch`);
      }
      
      // Check version (for non-quantum)
      if (!lockEntry.quantumState && installed.version !== lockEntry.resolved.split('@')[1]) {
        mismatches.push(`${name}: version mismatch`);
      }
    }
    
    // Check for packages not in lock file
    for (const [name] of packages) {
      if (!lockfile.packages[name]) {
        mismatches.push(`${name}: not in lock file`);
      }
    }
    
    return {
      valid: mismatches.length === 0,
      mismatches
    };
  }
  
  /**
   * Calculate package integrity hash
   */
  private calculateIntegrity(glyph: GlyphPackage): string {
    // Create deterministic representation
    const content = JSON.stringify({
      name: glyph.name,
      version: glyph.version,
      morphism: glyph.morphism ? {
        name: glyph.morphism.name,
        version: glyph.morphism.version,
        dependencies: glyph.morphism.dependencies
      } : undefined
    }, Object.keys(glyph).sort());
    
    return `sha512-${createHash('sha512').update(content).digest('base64')}`;
  }
  
  /**
   * Parse YAML-like lock file format
   */
  private parseLockfile(content: string): FNPMLockFile {
    // Simple YAML parser for our format
    const lines = content.split('\n');
    const lockfile: FNPMLockFile = {
      version: 1,
      resonance: 432,
      timestamp: Date.now(),
      timeline: 'main',
      packages: {}
    };
    
    let currentPackage: string | null = null;
    let currentEntry: Partial<LockEntry> = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Parse top-level fields
      if (trimmed.startsWith('version:')) {
        lockfile.version = parseInt(trimmed.split(':')[1].trim());
      } else if (trimmed.startsWith('resonance:')) {
        lockfile.resonance = parseInt(trimmed.split(':')[1].trim());
      } else if (trimmed.startsWith('timestamp:')) {
        lockfile.timestamp = parseInt(trimmed.split(':')[1].trim());
      } else if (trimmed.startsWith('timeline:')) {
        lockfile.timeline = trimmed.split(':')[1].trim();
      }
      
      // Parse packages section
      else if (trimmed === 'packages:') {
        // Start of packages section
      }
      
      // Package name (not indented under packages)
      else if (!line.startsWith('  ') && line.includes('@') && currentPackage === null) {
        currentPackage = trimmed.replace(':', '');
        currentEntry = {};
      }
      
      // Package fields (indented)
      else if (line.startsWith('  ') && currentPackage) {
        if (trimmed.startsWith('resolved:')) {
          currentEntry.resolved = trimmed.split(':').slice(1).join(':').trim();
        } else if (trimmed.startsWith('integrity:')) {
          currentEntry.integrity = trimmed.split(':').slice(1).join(':').trim();
        } else if (trimmed.startsWith('ipfsCID:')) {
          currentEntry.ipfsCID = trimmed.split(':')[1].trim();
        }
      }
      
      // End of package entry
      else if (!line.startsWith(' ') && currentPackage && currentEntry.resolved) {
        lockfile.packages[currentPackage] = currentEntry as LockEntry;
        currentPackage = null;
        currentEntry = {};
      }
    }
    
    // Handle last entry
    if (currentPackage && currentEntry.resolved) {
      lockfile.packages[currentPackage] = currentEntry as LockEntry;
    }
    
    return lockfile;
  }
  
  /**
   * Serialize lock file to YAML-like format
   */
  private serializeLockfile(lockfile: FNPMLockFile): string {
    const lines: string[] = [
      '# FNPM Lock File - DO NOT EDIT MANUALLY',
      '# This file ensures reproducible installs across timelines',
      '',
      `version: ${lockfile.version}`,
      `resonance: ${lockfile.resonance}`,
      `timestamp: ${lockfile.timestamp}`,
      `timeline: ${lockfile.timeline}`,
      ''
    ];
    
    if (lockfile._meta) {
      lines.push('_meta:');
      if (lockfile._meta.guardian) {
        lines.push(`  guardian: ${lockfile._meta.guardian}`);
      }
      if (lockfile._meta.reason) {
        lines.push(`  reason: ${lockfile._meta.reason}`);
      }
      lines.push('');
    }
    
    lines.push('packages:');
    
    // Sort packages for deterministic output
    const sortedPackages = Object.entries(lockfile.packages).sort(([a], [b]) => a.localeCompare(b));
    
    for (const [name, entry] of sortedPackages) {
      lines.push(`  ${name}:`);
      lines.push(`    resolved: ${entry.resolved}`);
      lines.push(`    integrity: ${entry.integrity}`);
      
      if (entry.ipfsCID) {
        lines.push(`    ipfsCID: ${entry.ipfsCID}`);
      }
      
      if (entry.quantumState) {
        lines.push('    quantumState:');
        lines.push(`      observer: ${entry.quantumState.observer}`);
        lines.push(`      timestamp: ${entry.quantumState.timestamp}`);
        lines.push(`      collapsed: ${entry.quantumState.collapsed}`);
      }
      
      if (entry.dependencies) {
        lines.push('    dependencies:');
        for (const [dep, version] of Object.entries(entry.dependencies)) {
          lines.push(`      ${dep}: ${version}`);
        }
      }
      
      if (entry.signatures) {
        lines.push('    signatures:');
        for (const [guardian, sig] of Object.entries(entry.signatures)) {
          lines.push(`      ${guardian}: ${sig.slice(0, 16)}...`);
        }
      }
      
      lines.push('');
    }
    
    return lines.join('\n');
  }
  
  /**
   * Check if version is quantum
   */
  private isQuantumVersion(version: string): boolean {
    return ['quantum', 'tomorrow', 'yesterday', 'superposition'].includes(version);
  }
  
  /**
   * Get current timeline
   */
  private getCurrentTimeline(): string {
    // In real implementation, would track active timeline
    return 'main';
  }
  
  /**
   * Merge lock files from different timelines
   */
  async mergeLockfiles(lockfiles: FNPMLockFile[]): Promise<FNPMLockFile> {
    if (lockfiles.length === 0) {
      throw new Error('No lock files to merge');
    }
    
    if (lockfiles.length === 1) {
      return lockfiles[0];
    }
    
    // Start with most recent
    const sorted = lockfiles.sort((a, b) => b.timestamp - a.timestamp);
    const merged = { ...sorted[0] };
    
    // Merge packages from all timelines
    for (const lockfile of sorted.slice(1)) {
      for (const [name, entry] of Object.entries(lockfile.packages)) {
        // Use most recent version of each package
        if (!merged.packages[name] || 
            (entry.quantumState && entry.quantumState.timestamp > (merged.packages[name].quantumState?.timestamp || 0))) {
          merged.packages[name] = entry;
        }
      }
    }
    
    // Update metadata
    merged._meta = {
      guardian: 'lockfile-merger',
      reason: `Merged ${lockfiles.length} timelines`
    };
    
    return merged;
  }
  
  /**
   * Export lock file for sharing
   */
  async exportLockfile(lockfile: FNPMLockFile): Promise<{
    content: string;
    checksum: string;
    signature?: string;
  }> {
    const content = this.serializeLockfile(lockfile);
    const checksum = createHash('sha256').update(content).digest('hex');
    
    return {
      content,
      checksum,
      // In real implementation, would sign with guardian key
      signature: undefined
    };
  }
  
  /**
   * Import and validate external lock file
   */
  async importLockfile(content: string, checksum?: string): Promise<FNPMLockFile> {
    // Verify checksum if provided
    if (checksum) {
      const calculated = createHash('sha256').update(content).digest('hex');
      if (calculated !== checksum) {
        throw new Error('Lock file checksum mismatch');
      }
    }
    
    const lockfile = this.parseLockfile(content);
    
    // Validate format version
    if (lockfile.version > LockfileManager.LOCKFILE_VERSION) {
      throw new Error(`Lock file version ${lockfile.version} not supported`);
    }
    
    return lockfile;
  }
}