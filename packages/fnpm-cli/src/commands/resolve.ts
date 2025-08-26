/**
 * Resolve Command
 * Shows how FNPM would resolve a morphism
 */

import { Command } from 'commander';
import { readFile } from 'fs/promises';
import chalk from 'chalk';
import { CidResolver } from '@void/fnpm-core/resolution';
import { getFnpmConfig } from '@void/fnpm-core/config';

interface Morphism {
  morphism: {
    type: string;
    target?: {
      cid?: string;
      astHash?: string;
    };
    entry?: string;
    labels?: string[];
  };
}

export function resolveCommand(): Command {
  const command = new Command('resolve');
  
  command
    .description('Resolve morphism to show fetch plan')
    .argument('<morphism>', 'Path to morphism JSON file')
    .option('--json', 'Output as JSON')
    .action(async (morphismPath: string, options) => {
      const config = getFnpmConfig();
      
      try {
        // Read morphism file
        const content = await readFile(morphismPath, 'utf-8');
        const morphism: Morphism = JSON.parse(content);
        
        if (!morphism.morphism?.target) {
          throw new Error('Invalid morphism: missing target');
        }
        
        const target = morphism.morphism.target;
        
        // Create resolver
        const resolver = new CidResolver(config);
        await resolver.init();
        
        // Always dry-run for resolve command
        const result = await resolver.resolve(target, { dryRun: true });
        
        if (options.json) {
          // JSON output for scripting
          console.log(JSON.stringify({
            morphism: morphismPath,
            target,
            resolved: result !== null,
            result: result ? {
              path: result.path,
              source: result.source,
              cid: result.gene.cid,
              size: result.gene.size,
              verified: result.verified,
            } : null,
          }, null, 2));
        } else {
          // Human-readable output
          console.log(chalk.bold('🔍 Morphism Resolution Plan\n'));
          console.log(`Morphism: ${morphismPath}`);
          console.log(`Type: ${morphism.morphism.type}`);
          
          if (target.cid) {
            console.log(`Target CID: ${target.cid}`);
          }
          if (target.astHash) {
            console.log(`Target AST: ${target.astHash}`);
          }
          
          if (result) {
            console.log(chalk.green('\n✅ Can resolve!'));
            console.log(`\nFetch plan:`);
            console.log(`  1. Check cache: ${result.source === 'cache' ? '✅ HIT' : '❌ MISS'}`);
            console.log(`  2. Check manifest: ${result.source === 'manifest' ? '✅ FOUND' : '❌ NOT FOUND'}`);
            console.log(`  3. Fetch from IPFS: ${result.source === 'ipfs' ? '✅ SUCCESS' : '⏭️  SKIP'}`);
            console.log(`  4. Fetch from HTTP: ${result.source === 'http' ? '✅ SUCCESS' : '⏭️  SKIP'}`);
            
            console.log(`\nExpected result:`);
            console.log(`  Module: ${result.gene.name} (${result.gene.lang})`);
            console.log(`  Size: ${result.gene.size} bytes`);
            console.log(`  Will verify: ${config.verifyHashes ? 'YES' : 'NO'}`);
          } else {
            console.log(chalk.red('\n❌ Cannot resolve'));
            console.log('\nPossible reasons:');
            console.log('  - Not found in any manifest');
            console.log('  - Network fetch would be required (dry-run)');
            console.log('  - AST hash lookup not yet implemented (PR-D)');
          }
          
          console.log(chalk.gray('\n💡 Run with --json for machine-readable output'));
        }
        
      } catch (error) {
        console.error(chalk.red(`\n❌ Error: ${error}`));
        
        if (config.debug) {
          console.error(error);
        }
        
        process.exit(1);
      }
    });
  
  return command;
}