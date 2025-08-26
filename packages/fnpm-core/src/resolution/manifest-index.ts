/**
 * Manifest Index for fast lookups
 * Reads Chimera manifest files and builds indices
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { glob } from 'glob';
import type { Manifest, GeneEntry } from '../../../tools/wasm-builder/src/manifest.js';

export interface IndexedGene extends GeneEntry {
  manifestPath: string;
}

export class ManifestIndex {
  private byCid = new Map<string, IndexedGene>();
  private byAstHash = new Map<string, IndexedGene>();
  private byName = new Map<string, IndexedGene[]>();
  private manifests = new Map<string, Manifest>();

  constructor(private manifestDirs: string[]) {}

  /**
   * Load all manifests from configured directories
   */
  async load(): Promise<void> {
    console.log(`📚 Loading manifests from: ${this.manifestDirs.join(', ')}`);
    
    for (const dir of this.manifestDirs) {
      const pattern = join(dir, '**/manifest.json');
      const files = await glob(pattern);
      
      for (const file of files) {
        try {
          await this.loadManifest(file);
        } catch (error) {
          console.error(`Failed to load manifest ${file}:`, error);
        }
      }
    }
    
    console.log(`📊 Indexed: ${this.byCid.size} CIDs, ${this.byAstHash.size} AST hashes`);
  }

  /**
   * Load a single manifest file
   */
  private async loadManifest(path: string): Promise<void> {
    const content = await readFile(path, 'utf-8');
    const manifest: Manifest = JSON.parse(content);
    
    // Validate version
    if (!manifest.version?.startsWith('chimera.')) {
      throw new Error(`Invalid manifest version: ${manifest.version}`);
    }
    
    this.manifests.set(path, manifest);
    
    // Index all genes
    for (const gene of manifest.genes) {
      const indexed: IndexedGene = {
        ...gene,
        manifestPath: path,
      };
      
      // Index by CID
      if (gene.cid) {
        this.byCid.set(gene.cid, indexed);
      }
      
      // Index by AST hash
      if (gene.astHash) {
        this.byAstHash.set(gene.astHash, indexed);
      }
      
      // Index by name (can have multiple)
      if (!this.byName.has(gene.name)) {
        this.byName.set(gene.name, []);
      }
      this.byName.get(gene.name)!.push(indexed);
    }
  }

  /**
   * Find gene by CID
   */
  findByCid(cid: string): IndexedGene | undefined {
    return this.byCid.get(cid);
  }

  /**
   * Find gene by AST hash
   */
  findByAstHash(astHash: string): IndexedGene | undefined {
    return this.byAstHash.get(astHash);
  }

  /**
   * Find genes by name
   */
  findByName(name: string, lang?: string): IndexedGene[] {
    const genes = this.byName.get(name) || [];
    
    if (lang) {
      return genes.filter(g => g.lang === lang);
    }
    
    return genes;
  }

  /**
   * Get all indexed CIDs
   */
  getAllCids(): string[] {
    return Array.from(this.byCid.keys());
  }

  /**
   * Get manifest for a gene
   */
  getManifestForGene(gene: IndexedGene): Manifest | undefined {
    return this.manifests.get(gene.manifestPath);
  }

  /**
   * Get summary statistics
   */
  getStats(): Record<string, number> {
    const langCounts = new Map<string, number>();
    
    for (const gene of this.byCid.values()) {
      langCounts.set(gene.lang, (langCounts.get(gene.lang) || 0) + 1);
    }
    
    return {
      totalManifests: this.manifests.size,
      totalGenes: this.byCid.size,
      uniqueNames: this.byName.size,
      ...Object.fromEntries(langCounts),
    };
  }
}