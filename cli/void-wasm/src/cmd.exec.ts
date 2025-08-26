import { Command } from 'commander';
import chalk from 'chalk';
import fetch from 'node-fetch';

export function execCommand(): Command {
  const command = new Command('exec');
  
  command
    .description('Execute WASM module')
    .argument('<target>', 'CID or AST hash of WASM module')
    .option('--entry <name>', 'Entry function (e.g., "add(i32,i32)->i32")', 'main')
    .option('--i32 <value>', 'i32 argument (repeatable)', collect, [])
    .option('--f64 <value>', 'f64 argument (repeatable)', collect, [])
    .option('--labels <json>', 'Labels as JSON', '{}')
    .option('--server <url>', 'WASM executor server', 'http://localhost:3456')
    .option('--wait', 'Wait for completion', true)
    .action(async (target, options) => {
      try {
        // Parse arguments based on type
        const args: any[] = [];
        
        // Add i32 arguments
        for (const val of options.i32) {
          args.push(parseInt(val));
        }
        
        // Add f64 arguments
        for (const val of options.f64) {
          args.push(parseFloat(val));
        }
        
        // Parse labels
        let labels = {};
        try {
          labels = JSON.parse(options.labels);
        } catch {
          console.error(chalk.red('Invalid labels JSON'));
          process.exit(1);
        }
        
        // Prepare request
        const payload = {
          target: target.startsWith('baf') ? { cid: target } : { astHash: target },
          entry: options.entry,
          args,
          labels,
          idempotency_key: `cli-${Date.now()}`,
        };
        
        console.log(chalk.blue('🚀 Executing WASM module...'));
        console.log(chalk.gray(`   Target: ${target}`));
        console.log(chalk.gray(`   Entry: ${options.entry}`));
        console.log(chalk.gray(`   Args: ${JSON.stringify(args)}`));
        
        // Submit execution
        const response = await fetch(`${options.server}/v1/exec`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Server error: ${error}`);
        }
        
        const result = await response.json();
        console.log(chalk.green(`✅ Accepted: ${result.run_id}`));
        console.log(chalk.gray(`   Mode: ${result.mode}`));
        
        if (!options.wait || result.mode === 'dry-run') {
          process.exit(0);
        }
        
        // Poll for result
        console.log(chalk.gray('\n⏳ Waiting for completion...'));
        
        let attempts = 0;
        while (attempts < 30) { // 30 seconds max
          await sleep(1000);
          
          const statusResponse = await fetch(`${options.server}/v1/runs/${result.run_id}`);
          if (!statusResponse.ok) {
            throw new Error('Failed to get status');
          }
          
          const status = await statusResponse.json();
          
          if (status.status === 'finished') {
            console.log(chalk.green('\n✅ Execution complete!'));
            console.log(chalk.bold(`   Result: ${JSON.stringify(status.result)}`));
            console.log(chalk.gray(`   CPU: ${status.usage?.cpu_ms}ms`));
            console.log(chalk.gray(`   Memory: ${status.usage?.mem_pages} pages`));
            console.log(chalk.gray(`   Syscalls: ${status.usage?.syscalls}`));
            process.exit(0);
          }
          
          if (status.status === 'error') {
            console.error(chalk.red(`\n❌ Execution failed: ${status.error}`));
            process.exit(1);
          }
          
          attempts++;
        }
        
        console.error(chalk.yellow('\n⚠️  Timeout waiting for result'));
        process.exit(1);
        
      } catch (error) {
        console.error(chalk.red(`\n❌ Error: ${error}`));
        process.exit(1);
      }
    });
  
  return command;
}

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}