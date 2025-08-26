/**
 * TinyGo WASM build recipe
 * Compiles Go code to WASM using TinyGo
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { stat } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

export interface TinyGoOptions {
  deterministic: boolean;
  target?: string;
  opt?: number; // Optimization level (0-2)
}

/**
 * Build a TinyGo gene to WASM
 */
export async function buildTinyGo(
  inputDir: string,
  outputWasm: string,
  options: TinyGoOptions
): Promise<void> {
  // Check if TinyGo is installed
  try {
    await execAsync('tinygo version');
  } catch (error) {
    throw new Error('TinyGo not found. Install from https://tinygo.org');
  }

  // Find main.go
  const mainGo = join(inputDir, 'main.go');
  try {
    await stat(mainGo);
  } catch {
    throw new Error(`main.go not found in ${inputDir}`);
  }

  // Build command
  const args = [
    'build',
    '-o', outputWasm,
    '-target', options.target || 'wasi',
    '-opt', (options.opt ?? 2).toString(),
  ];

  // Add deterministic flags
  if (options.deterministic) {
    args.push('-no-debug'); // Remove debug info
    // Set build time to epoch for reproducibility
    process.env.SOURCE_DATE_EPOCH = '0';
  }

  // Add main.go
  args.push(mainGo);

  // Execute build
  const cmd = `tinygo ${args.join(' ')}`;
  
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: inputDir,
      env: {
        ...process.env,
        // Ensure deterministic builds
        GOOS: 'wasi',
        GOARCH: 'wasm',
      },
    });

    if (stderr && process.env.DEBUG_WASM === '1') {
      console.warn('TinyGo warnings:', stderr);
    }

    // Verify output exists
    const stats = await stat(outputWasm);
    if (stats.size === 0) {
      throw new Error('Generated WASM file is empty');
    }

  } catch (error: any) {
    throw new Error(`TinyGo build failed: ${error.message}`);
  } finally {
    // Clean up env
    delete process.env.SOURCE_DATE_EPOCH;
  }
}

/**
 * Validate TinyGo source for purity
 * (Basic checks - full purity analysis would be more complex)
 */
export async function validateTinyGoPurity(sourcePath: string): Promise<boolean> {
  // TODO: Implement AST-based purity checks
  // For now, just return true
  return true;
}