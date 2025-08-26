#!/usr/bin/env node

import { Command } from 'commander';
import { glob } from 'glob';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { buildTinyGo } from './recipes/tinygo.js';
import { buildRust } from './recipes/rust.js';
import { generateCID } from './cid.js';
import { createManifest, addGeneToManifest, saveManifest } from './manifest.js';
import { createHash } from 'crypto';
import { CarWriter } from '@ipld/car';
import { CID } from 'multiformats/cid';
import * as raw from 'multiformats/codecs/raw';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface BuildConfig {
  enabled: boolean;
  canary: number;
  dryRun: boolean;
  deterministic: boolean;
  allowedLangs: string[];
  outDir: string;
}

function getConfig(): BuildConfig {
  return {
    enabled: process.env.CHIMERA_ENABLED === '1',
    canary: parseFloat(process.env.WASM_CANARY || '0.1'),
    dryRun: process.env.DRY_RUN_MODE === '1',
    deterministic: process.env.WASM_DETERMINISTIC === '1',
    allowedLangs: (process.env.WASM_ALLOW_LANGS || 'tinygo,rust').split(','),
    outDir: process.env.WASM_OUT_DIR || './chimera-output',
  };
}

async function shouldBuild(config: BuildConfig): Promise<boolean> {
  if (!config.enabled) {
    console.log(chalk.yellow('⚠️  CHIMERA_ENABLED=0, skipping build'));
    return false;
  }

  // Check canary
  if (config.canary < 1 && Math.random() > config.canary) {
    console.log(chalk.yellow(`⚠️  Not in canary (${config.canary * 100}%)`));
    return false;
  }

  return true;
}

async function buildGene(
  genePath: string,
  lang: string,
  config: BuildConfig,
  manifest: any
): Promise<void> {
  const geneName = basename(dirname(genePath));
  console.log(chalk.blue(`\n🧬 Building ${lang}/${geneName}...`));

  if (config.dryRun) {
    console.log(chalk.gray('  (dry-run mode, skipping actual build)'));
    return;
  }

  const outWasm = join(config.outDir, `${geneName}.${lang}.wasm`);
  const outCar = join(config.outDir, `${geneName}.${lang}.car`);

  try {
    // Build WASM based on language
    let buildTime = Date.now();
    if (lang === 'tinygo') {
      await buildTinyGo(genePath, outWasm, { deterministic: config.deterministic });
    } else if (lang === 'rust') {
      await buildRust(genePath, outWasm, { deterministic: config.deterministic });
    } else {
      throw new Error(`Unsupported language: ${lang}`);
    }
    buildTime = Date.now() - buildTime;

    // Read WASM bytes
    const wasmBytes = await readFile(outWasm);
    
    // Calculate SHA256
    const sha256 = createHash('sha256').update(wasmBytes).digest('hex');
    
    // Generate CID
    const cid = await generateCID(wasmBytes);
    
    // Create CAR file
    const car = await CarWriter.create([cid]);
    const carChunks: Uint8Array[] = [];
    
    await car.put({ cid, bytes: wasmBytes });
    await car.close();
    
    for await (const chunk of car) {
      carChunks.push(chunk);
    }
    
    const carBytes = Buffer.concat(carChunks);
    await writeFile(outCar, carBytes);

    // Add to manifest
    await addGeneToManifest(manifest, {
      name: geneName,
      lang,
      entry: `${geneName}(a: i32, b: i32) -> i32`, // TODO: extract from AST
      sha256,
      cid: cid.toString(),
      size: wasmBytes.length,
      car: basename(outCar),
      phi: [], // Placeholder for protein hash
      astHash: '', // TODO: calculate from source
      labels: config.deterministic ? ['deterministic'] : [],
      buildTime,
    });

    console.log(chalk.green(`  ✔ Built ${geneName}.${lang}.wasm`));
    console.log(chalk.gray(`    Size: ${wasmBytes.length} bytes`));
    console.log(chalk.gray(`    SHA256: ${sha256.substring(0, 16)}...`));
    console.log(chalk.gray(`    CID: ${cid.toString()}`));
    console.log(chalk.gray(`    Build time: ${buildTime}ms`));

  } catch (error) {
    console.error(chalk.red(`  ✖ Failed to build ${geneName}: ${error}`));
    if (process.env.DEBUG_WASM === '1') {
      console.error(error);
    }
  }
}

async function main() {
  const program = new Command();
  
  program
    .name('wasm-builder')
    .description('Build WASM modules from gene sources')
    .option('-o, --out <dir>', 'Output directory', './chimera-output')
    .option('-d, --dry-run', 'Dry run mode')
    .option('-l, --langs <langs>', 'Comma-separated languages', 'tinygo,rust')
    .parse(process.argv);

  const options = program.opts();
  const config = getConfig();
  
  // Override with CLI options
  if (options.out) config.outDir = options.out;
  if (options.dryRun) config.dryRun = true;
  if (options.langs) config.allowedLangs = options.langs.split(',');

  // Check if we should build
  if (!await shouldBuild(config)) {
    process.exit(0);
  }

  console.log(chalk.bold('🧬 Chimera WASM Builder'));
  console.log(chalk.gray(`   Output: ${config.outDir}`));
  console.log(chalk.gray(`   Languages: ${config.allowedLangs.join(', ')}`));
  console.log(chalk.gray(`   Mode: ${config.dryRun ? 'dry-run' : 'build'}`));
  console.log(chalk.gray(`   Deterministic: ${config.deterministic}`));

  // Create output directory
  await mkdir(config.outDir, { recursive: true });

  // Create manifest
  const manifest = createManifest();

  // Find all genes
  for (const lang of config.allowedLangs) {
    const pattern = `genes/${lang}/*/`;
    const genePaths = await glob(pattern);
    
    console.log(chalk.blue(`\n📂 Found ${genePaths.length} ${lang} genes`));
    
    for (const genePath of genePaths) {
      await buildGene(genePath, lang, config, manifest);
    }
  }

  // Save manifest
  const manifestPath = join(config.outDir, 'manifest.json');
  await saveManifest(manifest, manifestPath);
  
  console.log(chalk.bold.green(`\n✨ Build complete!`));
  console.log(chalk.gray(`   Manifest: ${manifestPath}`));
  console.log(chalk.gray(`   Genes: ${manifest.genes.length}`));
}

main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});