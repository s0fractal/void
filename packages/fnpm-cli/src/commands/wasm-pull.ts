/**
 * WASM Pull Command
 * Downloads WASM modules by CID or AST hash
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { CidResolver } from '@void/fnpm-core/resolution';
import { getFnpmConfig, shouldUseCidResolve } from '@void/fnpm-core/config';

export function wasmPullCommand(): Command {
  const command = new Command('wasm');
  
  command
    .description('WASM module operations')
    .command('pull <target>')
    .description('Pull WASM module by CID or AST hash')
    .option('-m, --manifest <path>', 'Additional manifest file')
    .option('-g, --gateway <url>', 'Additional IPFS gateway')
    .option('-o, --out <dir>', 'Output directory (uses cache by default)')
    .option('--no-verify', 'Skip hash verification')
    .option('--dry-run', 'Show what would be done')
    .action(async (target: string, options) => {
      const config = getFnpmConfig();
      
      // Check feature flag
      if (!config.wasmEnabled) {
        console.error(chalk.red('❌ WASM features disabled. Set FNPM_WASM_ENABLED=1'));
        process.exit(1);
      }
      
      // Check canary
      if (!shouldUseCidResolve(config, target)) {
        console.log(chalk.yellow('🎲 Not in canary group. Running in dry-run mode.'));
        options.dryRun = true;
      }
      
      const spinner = ora('Initializing resolver...').start();
      
      try {
        // Override config with CLI options
        if (options.manifest) {
          config.manifestDirs.push(options.manifest);
        }
        if (options.gateway) {
          config.httpGateways.push(options.gateway);
        }
        if (options.noVerify === false) {
          config.verifyHashes = false;
        }
        
        // Create resolver
        const resolver = new CidResolver(config);
        await resolver.init();
        spinner.text = 'Resolver initialized';
        
        // Determine target type
        const morphismTarget = target.startsWith('baf') 
          ? { cid: target }
          : { astHash: target };
        
        spinner.text = `Resolving ${target}...`;
        
        // Resolve
        const result = await resolver.resolve(morphismTarget, {
          dryRun: options.dryRun,
        });
        
        if (!result) {
          spinner.fail(`Failed to resolve ${target}`);
          process.exit(1);
        }
        
        spinner.succeed(`Resolved ${target}`);
        
        // Display result
        console.log(chalk.bold('\n📦 WASM Module:'));
        console.log(`  Name: ${result.gene.name}`);
        console.log(`  Language: ${result.gene.lang}`);
        console.log(`  CID: ${result.gene.cid}`);
        console.log(`  Size: ${result.gene.size} bytes`);
        console.log(`  Source: ${result.source}`);
        console.log(`  Path: ${result.path}`);
        console.log(`  Verified: ${result.verified ? '✅' : '❌'}`);
        
        if (result.gene.entry) {
          console.log(`  Entry: ${result.gene.entry}`);
        }
        
        // Output path for scripting
        if (!options.dryRun) {
          console.log(`\n${result.path}`);
        }
        
      } catch (error) {
        spinner.fail('Pull failed');
        console.error(chalk.red(`\n❌ Error: ${error}`));
        
        if (config.debug) {
          console.error(error);
        }
        
        process.exit(1);
      }
    });
  
  return command;
}