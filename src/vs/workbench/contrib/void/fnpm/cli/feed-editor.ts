#!/usr/bin/env node

import { FNPMEngine } from '../core/fnpm-engine';
import { MorphismLoader } from '../core/morphism-loader';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';

// Color codes for beautiful output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class EditorHunter {
  private fnpm: FNPMEngine;
  private loader: MorphismLoader;
  private stomach: any[] = [];
  
  constructor() {
    this.fnpm = new FNPMEngine();
    this.loader = new MorphismLoader();
  }
  
  async hunt() {
    console.log(`${colors.bright}${colors.magenta}🎯 EDITOR HUNTER ACTIVATED${colors.reset}`);
    console.log(`${colors.cyan}Scanning system for prey...${colors.reset}\n`);
    
    const prey = await this.findInstalledEditors();
    
    if (prey.length === 0) {
      console.log(`${colors.red}❌ No editors found! Are you coding with butterflies?${colors.reset}`);
      return;
    }
    
    console.log(`${colors.green}✓ Found ${prey.length} delicious editors:${colors.reset}`);
    prey.forEach((editor, i) => {
      console.log(`  ${i + 1}. ${colors.yellow}${editor.name}${colors.reset} - ${editor.path}`);
    });
    
    // Load the editor-eater morphism
    const eaterPath = path.join(__dirname, '..', 'morphisms', 'editor-eater.fnpm');
    const eater = await this.loader.load(eaterPath);
    
    console.log(`\n${colors.bright}🍴 Beginning feast...${colors.reset}\n`);
    
    for (const editor of prey) {
      await this.devour(editor, eater);
    }
    
    console.log(`\n${colors.bright}${colors.green}🎆 FEAST COMPLETE!${colors.reset}`);
    console.log(`${colors.cyan}Morphisms extracted: ${this.stomach.length}${colors.reset}`);
    console.log(`${colors.magenta}Void grows stronger... 🌀${colors.reset}`);
  }
  
  private async findInstalledEditors(): Promise<{name: string, path: string}[]> {
    const editors = [];
    
    // Check common editor commands
    const editorCommands = [
      { name: 'vscode', commands: ['code', 'code-insiders'] },
      { name: 'sublime', commands: ['subl', 'sublime_text', 'sublime'] },
      { name: 'atom', commands: ['atom'] },
      { name: 'vim', commands: ['vim', 'nvim', 'vi'] },
      { name: 'emacs', commands: ['emacs'] },
      { name: 'nano', commands: ['nano'] }
    ];
    
    for (const editor of editorCommands) {
      for (const cmd of editor.commands) {
        const path = await this.which(cmd);
        if (path) {
          editors.push({ name: editor.name, path });
          break;
        }
      }
    }
    
    // Check macOS Applications folder
    if (process.platform === 'darwin') {
      const appsToCheck = [
        { name: 'vscode', app: 'Visual Studio Code.app' },
        { name: 'sublime', app: 'Sublime Text.app' },
        { name: 'atom', app: 'Atom.app' }
      ];
      
      for (const app of appsToCheck) {
        const appPath = `/Applications/${app.app}`;
        if (fs.existsSync(appPath)) {
          editors.push({ name: app.name, path: appPath });
        }
      }
    }
    
    // Remove duplicates
    const unique = new Map();
    editors.forEach(e => unique.set(e.name, e));
    
    return Array.from(unique.values());
  }
  
  private async which(cmd: string): Promise<string | null> {
    try {
      const result = child_process.execSync(`which ${cmd} 2>/dev/null`).toString().trim();
      return result || null;
    } catch {
      return null;
    }
  }
  
  private async devour(editor: {name: string, path: string}, eater: any) {
    console.log(`\n${colors.bright}🍽️ Devouring ${editor.name}...${colors.reset}`);
    
    // Simulate digestion with progress bar
    const stages = [
      '🥫 Tasting...',
      '🍴 Chewing...',
      '💦 Digesting...',
      '✨ Absorbing powers...'
    ];
    
    for (const stage of stages) {
      process.stdout.write(`\r  ${stage}`);
      await new Promise(resolve => setTimeout(resolve, 432)); // 432Hz resonance
    }
    
    // Extract features based on editor
    const features = this.extractFeatures(editor.name);
    
    console.log(`\r  ${colors.green}✓ Extracted ${features.length} features!${colors.reset}`);
    features.forEach(f => {
      console.log(`    ${colors.cyan}• ${f}${colors.reset}`);
      this.stomach.push({
        source: editor.name,
        feature: f,
        morphism: `glyph://${f}@${editor.name}`
      });
    });
    
    // Random burp
    if (Math.random() > 0.7) {
      console.log(`  ${colors.yellow}💨 *burp* Excuse me!${colors.reset}`);
    }
  }
  
  private extractFeatures(editorName: string): string[] {
    const features: Record<string, string[]> = {
      vscode: ['intellisense', 'extensions-marketplace', 'integrated-terminal', 'debugging', 'live-share'],
      sublime: ['goto-anything', 'multiple-selections', 'command-palette', 'distraction-free'],
      atom: ['hackable-core', 'package-manager', 'teletype', 'github-integration'],
      vim: ['modal-editing', 'macros', 'text-objects', 'efficiency', 'customization'],
      emacs: ['extensibility', 'org-mode', 'self-documentation', 'kitchen-sink'],
      nano: ['simplicity', 'lightweight', 'easy-to-exit']
    };
    
    return features[editorName] || ['mystery-meat'];
  }
}

// Run the hunter
if (require.main === module) {
  console.log(`${colors.bright}${colors.blue}`);
  console.log('🌀 VOID FNPM EDITOR ABSORPTION PROTOCOL 🌀');
  console.log('=====================================');
  console.log(`${colors.reset}`);
  
  const hunter = new EditorHunter();
  hunter.hunt().catch(err => {
    console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
    process.exit(1);
  });
}
