/**
 * Manifest generation for WASM genes
 * Tracks all build artifacts and their metadata
 */

import { writeFile, readFile } from 'fs/promises';

export interface GeneEntry {
  name: string;
  lang: string;
  entry: string; // Function signature
  sha256: string;
  cid: string;
  size: number;
  car: string; // CAR filename
  phi: number[]; // Protein hash vector (future)
  astHash: string; // AST hash (future)
  labels: string[];
  buildTime?: number;
}

export interface Manifest {
  version: string;
  createdAt: string;
  genes: GeneEntry[];
  meta?: {
    builder: string;
    deterministic: boolean;
    canary: number;
  };
}

/**
 * Create a new manifest
 */
export function createManifest(): Manifest {
  return {
    version: 'chimera.v1',
    createdAt: new Date().toISOString(),
    genes: [],
    meta: {
      builder: '@void/wasm-builder',
      deterministic: process.env.WASM_DETERMINISTIC === '1',
      canary: parseFloat(process.env.WASM_CANARY || '0.1'),
    },
  };
}

/**
 * Add a gene to the manifest
 */
export async function addGeneToManifest(manifest: Manifest, gene: GeneEntry): Promise<void> {
  // Check for duplicates
  const existing = manifest.genes.find(g => g.name === gene.name && g.lang === gene.lang);
  if (existing) {
    // Update existing entry
    Object.assign(existing, gene);
  } else {
    // Add new entry
    manifest.genes.push(gene);
  }
}

/**
 * Save manifest to file
 */
export async function saveManifest(manifest: Manifest, path: string): Promise<void> {
  const json = JSON.stringify(manifest, null, 2);
  await writeFile(path, json, 'utf-8');
}

/**
 * Load manifest from file
 */
export async function loadManifest(path: string): Promise<Manifest> {
  const json = await readFile(path, 'utf-8');
  return JSON.parse(json);
}

/**
 * Find gene by name and language
 */
export function findGene(manifest: Manifest, name: string, lang?: string): GeneEntry | undefined {
  return manifest.genes.find(g => {
    if (g.name !== name) return false;
    if (lang && g.lang !== lang) return false;
    return true;
  });
}

/**
 * Get manifest summary
 */
export function getManifestSummary(manifest: Manifest): string {
  const langs = new Map<string, number>();
  let totalSize = 0;

  for (const gene of manifest.genes) {
    langs.set(gene.lang, (langs.get(gene.lang) || 0) + 1);
    totalSize += gene.size;
  }

  const langSummary = Array.from(langs.entries())
    .map(([lang, count]) => `${lang}: ${count}`)
    .join(', ');

  return `Genes: ${manifest.genes.length} (${langSummary}), Total size: ${totalSize} bytes`;
}