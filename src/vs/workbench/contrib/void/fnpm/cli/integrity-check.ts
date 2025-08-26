#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) s0fractal. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EnhancedGlyphResolver } from '../core/glyph-resolver-enhanced';
import { IntegrityService } from '../core/integrity-service';
import { LockfileManager } from '../core/lockfile-manager';
import { URI } from 'vs/base/common/uri';
import chalk from 'chalk';

/**
 * FNPM Integrity Check CLI
 * Verifies package integrity and signatures
 */
export class IntegrityCheckCLI {
  private resolver: EnhancedGlyphResolver;
  private integrityService: IntegrityService;
  private lockfileManager: LockfileManager;
  
  constructor() {
    // Initialize services
    this.resolver = new EnhancedGlyphResolver(
      console as any,
      {} as any,
      {} as any
    );
    
    this.integrityService = new IntegrityService(
      console as any,
      {} as any
    );
    
    this.lockfileManager = new LockfileManager(
      {} as any,
      console as any
    );
  }
  
  /**
   * Check integrity of a single package
   */
  async checkPackage(glyphURL: string): Promise<void> {
    console.log(chalk.blue(`\n🔍 Checking integrity for ${glyphURL}...\n`));
    
    try {
      const report = await this.resolver.getIntegrityReport(glyphURL);
      
      // Display report
      report.report.forEach(line => console.log(line));
      
      if (report.valid) {
        console.log(chalk.green('\n✅ Package integrity verified!\n'));
      } else {
        console.log(chalk.red('\n❌ Package integrity check FAILED!\n'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  }
  
  /**
   * Verify all packages in lock file
   */
  async verifyLockfile(projectPath: string): Promise<void> {
    console.log(chalk.blue(`\n🔐 Verifying lock file integrity...\n`));
    
    const projectUri = URI.file(projectPath);
    const lockfile = await this.lockfileManager.readLockfile(projectUri);
    
    if (!lockfile) {
      console.log(chalk.yellow('⚠️  No lock file found\n'));
      return;
    }
    
    console.log(chalk.gray(`Lock file version: ${lockfile.version}`));
    console.log(chalk.gray(`Timeline: ${lockfile.timeline}`));
    console.log(chalk.gray(`Packages: ${Object.keys(lockfile.packages).length}\n`));
    
    let allValid = true;
    
    // Check each package
    for (const [name, entry] of Object.entries(lockfile.packages)) {
      process.stdout.write(`Checking ${name}... `);
      
      try {
        const report = await this.resolver.getIntegrityReport(entry.resolved);
        
        if (report.valid && report.integrity.hashes[0].value === entry.integrity.split('-')[1]) {
          console.log(chalk.green('✓'));
        } else {
          console.log(chalk.red('✗'));
          allValid = false;
        }
      } catch (error) {
        console.log(chalk.red('✗ ' + error.message));
        allValid = false;
      }
    }
    
    console.log('');
    
    if (allValid) {
      console.log(chalk.green('✅ All packages verified!\n'));
    } else {
      console.log(chalk.red('❌ Some packages failed verification\n'));
      process.exit(1);
    }
  }
  
  /**
   * Show integrity policy
   */
  async showPolicy(): Promise<void> {
    console.log(chalk.blue('\n🛡️  Integrity Policy\n'));
    
    const report = this.integrityService.getIntegrityReport();
    
    console.log(chalk.white('Policy Settings:'));
    console.log(`  Require Signatures: ${report.policy.requireSignatures ? chalk.green('Yes') : chalk.yellow('No')}`);
    console.log(`  Minimum Signatures: ${chalk.cyan(report.policy.minSignatures)}`);
    console.log(`  Allow Unsigned: ${report.policy.allowUnsigned ? chalk.yellow('Yes') : chalk.green('No')}`);
    console.log(`  Quantum Hash Window: ${chalk.cyan(report.policy.quantumHashWindow + 'ms')}`);
    
    console.log(chalk.white('\nTrusted Guardians:'));
    report.policy.trustedGuardians.forEach(guardian => {
      console.log(`  - ${chalk.magenta(guardian)}`);
    });
    
    console.log(chalk.white('\nKnown Guardians:'));
    report.guardians.forEach(guardian => {
      const status = guardian.trusted ? chalk.green('trusted') : chalk.gray('known');
      const lastSeen = new Date(guardian.lastSeen).toLocaleDateString();
      console.log(`  - ${chalk.magenta(guardian.name)} (${status}, last seen: ${lastSeen})`);
    });
    
    if (report.violations.length > 0) {
      console.log(chalk.white('\nRecent Violations:'));
      report.violations.slice(-5).forEach(violation => {
        const icon = violation.severity === 'critical' ? '🚨' : 
                    violation.severity === 'error' ? '❌' : '⚠️';
        console.log(`  ${icon} ${violation.package}@${violation.version}: ${violation.reason}`);
      });
    }
    
    console.log('');
  }
  
  /**
   * Sign a package
   */
  async signPackage(glyphURL: string): Promise<void> {
    console.log(chalk.blue(`\n✍️  Signing ${glyphURL}...\n`));
    
    try {
      const glyph = await this.resolver.resolve(glyphURL, undefined, false);
      const signature = await this.integrityService.signPackage(glyph);
      
      console.log(chalk.green('✅ Package signed successfully!\n'));
      console.log(chalk.gray('Signature:'));
      console.log(chalk.cyan(signature));
      console.log('');
      
      // Create manifest
      const manifest = await this.resolver.createIntegrityManifest(glyph, 'local-guardian');
      
      console.log(chalk.gray('Manifest:'));
      console.log(chalk.dim(manifest.manifest));
      console.log('');
      
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  }
  
  /**
   * Batch check multiple packages
   */
  async batchCheck(glyphURLs: string[]): Promise<void> {
    console.log(chalk.blue(`\n🔍 Batch checking ${glyphURLs.length} packages...\n`));
    
    const results = await this.resolver.batchVerify(glyphURLs);
    
    let allValid = true;
    
    for (const [url, valid] of results) {
      if (valid) {
        console.log(`${chalk.green('✓')} ${url}`);
      } else {
        console.log(`${chalk.red('✗')} ${url}`);
        allValid = false;
      }
    }
    
    console.log('');
    
    if (allValid) {
      console.log(chalk.green('✅ All packages verified!\n'));
    } else {
      console.log(chalk.red('❌ Some packages failed verification\n'));
      process.exit(1);
    }
  }
}

// CLI entry point
if (require.main === module) {
  const cli = new IntegrityCheckCLI();
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'check':
      if (!args[1]) {
        console.error(chalk.red('Usage: fnpm-integrity check <glyph-url>'));
        process.exit(1);
      }
      cli.checkPackage(args[1]);
      break;
      
    case 'verify':
      cli.verifyLockfile(process.cwd());
      break;
      
    case 'policy':
      cli.showPolicy();
      break;
      
    case 'sign':
      if (!args[1]) {
        console.error(chalk.red('Usage: fnpm-integrity sign <glyph-url>'));
        process.exit(1);
      }
      cli.signPackage(args[1]);
      break;
      
    case 'batch':
      if (args.length < 2) {
        console.error(chalk.red('Usage: fnpm-integrity batch <url1> <url2> ...'));
        process.exit(1);
      }
      cli.batchCheck(args.slice(1));
      break;
      
    default:
      console.log(chalk.cyan(`
FNPM Integrity Checker 🔐

Commands:
  check <url>      Check integrity of a single package
  verify           Verify all packages in lock file
  policy           Show current integrity policy
  sign <url>       Sign a package with local guardian key
  batch <urls...>  Check multiple packages at once

Examples:
  fnpm-integrity check glyph://consciousness@quantum
  fnpm-integrity verify
  fnpm-integrity sign glyph://my-morphism@1.0.0
  fnpm-integrity batch glyph://router@2.0 glyph://signals@latest

Options:
  --no-verify      Skip integrity verification
  --guardian <id>  Use specific guardian for signing
`));
  }
}