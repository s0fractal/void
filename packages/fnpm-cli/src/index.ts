#!/usr/bin/env node

import { Command } from 'commander';
import { wasmPullCommand } from './commands/wasm-pull.js';
import { resolveCommand } from './commands/resolve.js';
import { getFnpmConfig, logFnpmConfig } from '@void/fnpm-core/config';
import chalk from 'chalk';

const program = new Command();

// Configure CLI
program
  .name('fnpm')
  .description('Fractal Node Package Manager with WASM support')
  .version('0.1.0')
  .option('-d, --debug', 'Enable debug output')
  .hook('preAction', (thisCommand) => {
    // Set debug flag before commands run
    if (thisCommand.opts().debug) {
      process.env.DEBUG_FNPM = '1';
    }
    
    // Log config in debug mode
    const config = getFnpmConfig();
    logFnpmConfig(config);
    
    // Check if WASM features are enabled
    if (!config.wasmEnabled) {
      console.warn(chalk.yellow('⚠️  WASM features disabled. Set FNPM_WASM_ENABLED=1 to enable.'));
    }
  });

// Add commands
program.addCommand(wasmPullCommand());
program.addCommand(resolveCommand());

// Parse arguments
program.parse(process.argv);