/**
 * Rust WASM build recipe
 * Compiles Rust code to WASM
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { stat, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

const execAsync = promisify(exec);

export interface RustOptions {
  deterministic: boolean;
  target?: string;
  opt?: 'z' | 's' | '3'; // Optimization level
}

/**
 * Build a Rust gene to WASM
 */
export async function buildRust(
  inputDir: string,
  outputWasm: string,
  options: RustOptions
): Promise<void> {
  // Check if Rust/Cargo is installed
  try {
    await execAsync('cargo --version');
  } catch (error) {
    throw new Error('Cargo not found. Install from https://rustup.rs');
  }

  // Check for Cargo.toml
  const cargoToml = join(inputDir, 'Cargo.toml');
  try {
    await stat(cargoToml);
  } catch {
    // Create minimal Cargo.toml if missing
    await createMinimalCargoToml(inputDir);
  }

  // Build command
  const rustflags: string[] = [];
  
  // Optimization
  rustflags.push(`-C opt-level=${options.opt || 'z'}`);
  
  // Deterministic build flags
  if (options.deterministic) {
    rustflags.push('-C debuginfo=0'); // No debug info
    rustflags.push('-C strip=symbols'); // Strip symbols
    rustflags.push('-Z remap-cwd-prefix=.'); // Remap paths
  }

  const env = {
    ...process.env,
    RUSTFLAGS: rustflags.join(' '),
    CARGO_TARGET_DIR: join(inputDir, 'target'),
  };

  // Set deterministic timestamps
  if (options.deterministic) {
    env.SOURCE_DATE_EPOCH = '0';
  }

  try {
    // Build the WASM
    const { stdout, stderr } = await execAsync(
      `cargo +stable build --target wasm32-wasi --release`,
      {
        cwd: inputDir,
        env,
      }
    );

    if (stderr && process.env.DEBUG_WASM === '1') {
      console.warn('Cargo warnings:', stderr);
    }

    // Find the built WASM file
    const builtWasm = await findBuiltWasm(inputDir);
    
    // Copy to output location
    const wasmBytes = await readFile(builtWasm);
    await writeFile(outputWasm, wasmBytes);

    // Verify output
    const stats = await stat(outputWasm);
    if (stats.size === 0) {
      throw new Error('Generated WASM file is empty');
    }

  } catch (error: any) {
    throw new Error(`Rust build failed: ${error.message}`);
  }
}

/**
 * Create minimal Cargo.toml for simple genes
 */
async function createMinimalCargoToml(dir: string): Promise<void> {
  const name = join(dir).split('/').pop() || 'gene';
  const content = `[package]
name = "${name}"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]

[profile.release]
opt-level = "z"
lto = true
`;
  
  await writeFile(join(dir, 'Cargo.toml'), content);
}

/**
 * Find the built WASM file in Rust target directory
 */
async function findBuiltWasm(projectDir: string): Promise<string> {
  const targetDir = join(projectDir, 'target', 'wasm32-wasi', 'release');
  
  // List all .wasm files
  const { stdout } = await execAsync(`find ${targetDir} -name "*.wasm" -type f`);
  const wasmFiles = stdout.trim().split('\n').filter(Boolean);
  
  if (wasmFiles.length === 0) {
    throw new Error('No WASM file found in build output');
  }
  
  // Return the first (usually only) WASM file
  return wasmFiles[0];
}