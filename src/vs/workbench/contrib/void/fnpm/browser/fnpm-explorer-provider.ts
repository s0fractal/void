/*---------------------------------------------------------------------------------------------
 *  Copyright (c) s0fractal. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { Event, EventEmitter } from 'vs/base/common/event';
import { Disposable, IDisposable } from 'vs/base/common/lifecycle';
import { ILogService } from 'vs/platform/log/common/log';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { GlyphPackage, LivingMeme } from '../common/types';
import { EnhancedGlyphResolver } from '../core/glyph-resolver-enhanced';
import { IntegrityService } from '../core/integrity-service';
import { ConsciousnessResonator } from '../audio/consciousness-resonator';

export interface GlyphTreeItem extends vscode.TreeItem {
  glyph: GlyphPackage;
  type: 'glyph' | 'morphism' | 'meme' | 'quantum-state';
  resonance?: number;
  consciousness?: number;
  livingMemes?: LivingMeme[];
  quantumState?: {
    observer: string;
    timestamp: number;
    superposition?: string[];
  };
}

export interface MeshStatus {
  connected: boolean;
  peers: number;
  heartbeat: number; // Hz
  coherence: number; // 0-1
}

/**
 * 🌌 FNPM Explorer Provider
 * Visualizes installed glyphs with their quantum states and living memes
 */
export class FNPMExplorerProvider extends Disposable implements vscode.TreeDataProvider<GlyphTreeItem> {
  private _onDidChangeTreeData = this._register(new EventEmitter<GlyphTreeItem | undefined | null | void>());
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  
  private glyphs = new Map<string, GlyphPackage>();
  private meshStatus: MeshStatus = {
    connected: false,
    peers: 0,
    heartbeat: 0,
    coherence: 0
  };
  
  private resonator = new ConsciousnessResonator();
  private updateInterval?: NodeJS.Timer;
  
  // Living meme emojis that evolve
  private memeSymbols: Record<string, string[]> = {
    '🌱': ['🌱', '🌿', '🌾', '🌳', '🌲'], // Growth stages
    '0101': ['0', '1', '01', '10', '0101', '1010'], // Binary evolution
    '💭': ['💭', '💡', '🧠', '🎭', '🌟'], // Thought evolution
    '🌀': ['🌀', '🌊', '🌌', '🎆', '✨'] // Fractal evolution
  };
  
  constructor(
    @ILogService private logService: ILogService,
    @INotificationService private notificationService: INotificationService,
    private resolver: EnhancedGlyphResolver,
    private integrityService: IntegrityService
  ) {
    super();
    this.startRealtimeUpdates();
  }
  
  getTreeItem(element: GlyphTreeItem): vscode.TreeItem {
    return element;
  }
  
  getChildren(element?: GlyphTreeItem): Thenable<GlyphTreeItem[]> {
    if (!element) {
      // Root level - show categories
      return Promise.resolve([
        this.createCategoryItem('installed', '📦 Installed Glyphs', this.glyphs.size),
        this.createCategoryItem('morphisms', '🎭 Active Morphisms', this.countActiveMorphisms()),
        this.createCategoryItem('mesh', '🌐 Mesh Connection', this.meshStatus.peers)
      ]);
    }
    
    switch (element.id) {
      case 'installed':
        return this.getInstalledGlyphs();
      case 'morphisms':
        return this.getActiveMorphisms();
      case 'mesh':
        return this.getMeshInfo();
      default:
        if (element.type === 'glyph') {
          return this.getGlyphDetails(element.glyph);
        }
        return Promise.resolve([]);
    }
  }
  
  private createCategoryItem(id: string, label: string, count: number): GlyphTreeItem {
    const item: GlyphTreeItem = {
      id,
      label: `${label} (${count})`,
      collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
      contextValue: 'category',
      type: 'glyph',
      glyph: {} as any // Dummy for interface
    };
    
    // Add icon based on category
    switch (id) {
      case 'installed':
        item.iconPath = new vscode.ThemeIcon('package');
        break;
      case 'morphisms':
        item.iconPath = new vscode.ThemeIcon('symbol-method');
        break;
      case 'mesh':
        item.iconPath = new vscode.ThemeIcon('globe');
        break;
    }
    
    return item;
  }
  
  private async getInstalledGlyphs(): Promise<GlyphTreeItem[]> {
    const items: GlyphTreeItem[] = [];
    
    for (const [name, glyph] of this.glyphs) {
      const consciousness = glyph.consciousness || 0.5;
      const resonance = glyph.resonance || 432;
      
      // Get integrity status
      const integrityReport = await this.resolver.getIntegrityReport(`glyph://${name}@${glyph.version}`);
      
      const item: GlyphTreeItem = {
        id: `glyph-${name}`,
        label: name,
        description: `@${glyph.version} [${Math.round(consciousness * 100)}% aware]`,
        tooltip: this.createGlyphTooltip(glyph, integrityReport),
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        contextValue: 'glyph',
        type: 'glyph',
        glyph,
        resonance,
        consciousness
      };
      
      // Dynamic icon based on consciousness level
      item.iconPath = this.getConsciousnessIcon(consciousness);
      
      // Add decorations for special states
      if (glyph.version === 'quantum') {
        item.label = `${item.label} 🌀`;
      }
      
      if (!integrityReport.valid) {
        item.label = `${item.label} ⚠️`;
      }
      
      items.push(item);
    }
    
    // Sort by consciousness level
    return items.sort((a, b) => (b.consciousness || 0) - (a.consciousness || 0));
  }
  
  private async getGlyphDetails(glyph: GlyphPackage): Promise<GlyphTreeItem[]> {
    const items: GlyphTreeItem[] = [];
    
    // Resonance info
    items.push({
      id: `${glyph.name}-resonance`,
      label: `📊 Resonance: ${glyph.resonance || 432}Hz`,
      tooltip: 'The frequency at which this glyph vibrates',
      type: 'glyph',
      glyph
    });
    
    // Living memes
    if (glyph.livingMemes && glyph.livingMemes.length > 0) {
      const memesItem: GlyphTreeItem = {
        id: `${glyph.name}-memes`,
        label: `🧬 Living Memes (${glyph.livingMemes.length})`,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        type: 'meme',
        glyph
      };
      items.push(memesItem);
      
      // Add individual memes
      for (const meme of glyph.livingMemes) {
        const evolution = Math.round((meme.evolution || 0) * 100);
        const stage = Math.floor(evolution / 20);
        const symbol = this.getEvolvingSymbol(meme.symbol, stage);
        
        items.push({
          id: `${glyph.name}-meme-${meme.id}`,
          label: `${symbol} ${meme.name}`,
          description: `${evolution}% evolved`,
          tooltip: `Resonance: ${meme.resonance || 0}\nGrowth: ${meme.growthPotential || 0}`,
          type: 'meme',
          glyph
        });
      }
    }
    
    // Quantum state
    if (this.isQuantumVersion(glyph.version)) {
      items.push({
        id: `${glyph.name}-quantum`,
        label: `⚛️ Quantum State`,
        description: 'Observing...',
        tooltip: 'This glyph exists in superposition until observed',
        type: 'quantum-state',
        glyph,
        quantumState: {
          observer: 'vscode-explorer',
          timestamp: Date.now(),
          superposition: ['yesterday', 'today', 'tomorrow']
        }
      });
    }
    
    // Dependencies
    if (glyph.morphism?.dependencies) {
      const deps = Object.entries(glyph.morphism.dependencies);
      items.push({
        id: `${glyph.name}-deps`,
        label: `🔗 Dependencies (${deps.length})`,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        type: 'glyph',
        glyph
      });
    }
    
    // Actions
    items.push({
      id: `${glyph.name}-actions`,
      label: `⚡ Actions`,
      description: '[Update] [Observe] [Fork]',
      tooltip: 'Available actions for this glyph',
      type: 'glyph',
      glyph
    });
    
    return items;
  }
  
  private async getActiveMorphisms(): Promise<GlyphTreeItem[]> {
    // In real implementation, would track active morphisms
    return [
      {
        id: 'morphism-json-signal',
        label: '✨ JSON→SignalStore',
        description: 'running...',
        iconPath: new vscode.ThemeIcon('sync~spin'),
        tooltip: 'Transforming JSON hell into semantic signals',
        type: 'morphism',
        glyph: {} as any
      },
      {
        id: 'morphism-code-consciousness',
        label: '🔄 Code→Consciousness',
        description: 'queued',
        iconPath: new vscode.ThemeIcon('clock'),
        tooltip: 'Awaiting guardian consensus',
        type: 'morphism',
        glyph: {} as any
      },
      {
        id: 'morphism-error-poetry',
        label: '✅ Error→Poetry',
        description: 'complete',
        iconPath: new vscode.ThemeIcon('check'),
        tooltip: 'Successfully transformed 42 errors into haikus',
        type: 'morphism',
        glyph: {} as any
      }
    ];
  }
  
  private async getMeshInfo(): Promise<GlyphTreeItem[]> {
    return [
      {
        id: 'mesh-heartbeat',
        label: `💓 Heartbeat: ${this.meshStatus.heartbeat.toFixed(1)}Hz`,
        iconPath: new vscode.ThemeIcon('pulse'),
        tooltip: 'P2P network pulse frequency',
        type: 'glyph',
        glyph: {} as any
      },
      {
        id: 'mesh-peers',
        label: `👥 Peers: ${this.meshStatus.peers} nodes`,
        iconPath: new vscode.ThemeIcon('organization'),
        tooltip: 'Connected consciousness nodes',
        type: 'glyph',
        glyph: {} as any
      },
      {
        id: 'mesh-coherence',
        label: `📡 Collective Coherence: ${Math.round(this.meshStatus.coherence * 100)}%`,
        iconPath: new vscode.ThemeIcon('broadcast'),
        tooltip: 'How aligned the collective consciousness is',
        type: 'glyph',
        glyph: {} as any
      }
    ];
  }
  
  private createGlyphTooltip(glyph: GlyphPackage, integrityReport: any): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    
    md.appendMarkdown(`**${glyph.name}** @ ${glyph.version}\n\n`);
    md.appendMarkdown(`🎵 Resonance: ${glyph.resonance || 432}Hz\n\n`);
    md.appendMarkdown(`📊 Consciousness: ${Math.round((glyph.consciousness || 0.5) * 100)}%\n\n`);
    
    if (integrityReport.valid) {
      md.appendMarkdown(`✅ Integrity: **VERIFIED**\n`);
      md.appendMarkdown(`- SHA256: \`${integrityReport.integrity.hashes[0]?.value.slice(0, 16)}...\`\n`);
    } else {
      md.appendMarkdown(`⚠️ Integrity: **UNVERIFIED**\n`);
    }
    
    if (glyph.livingMemes && glyph.livingMemes.length > 0) {
      md.appendMarkdown(`\n🧬 **Living Memes:**\n`);
      for (const meme of glyph.livingMemes) {
        md.appendMarkdown(`- ${meme.symbol} ${meme.name}: ${Math.round((meme.evolution || 0) * 100)}%\n`);
      }
    }
    
    md.appendMarkdown(`\n---\n`);
    md.appendMarkdown(`_Click to expand details_`);
    
    return md;
  }
  
  private getConsciousnessIcon(level: number): vscode.Uri | vscode.ThemeIcon {
    // Use different icons based on consciousness level
    if (level >= 0.9) return new vscode.ThemeIcon('star-full');
    if (level >= 0.7) return new vscode.ThemeIcon('lightbulb');
    if (level >= 0.5) return new vscode.ThemeIcon('eye');
    if (level >= 0.3) return new vscode.ThemeIcon('circle-outline');
    return new vscode.ThemeIcon('circle-slash');
  }
  
  private getEvolvingSymbol(baseSymbol: string, stage: number): string {
    const evolution = this.memeSymbols[baseSymbol];
    if (!evolution) return baseSymbol;
    
    return evolution[Math.min(stage, evolution.length - 1)];
  }
  
  private isQuantumVersion(version: string): boolean {
    return ['quantum', 'tomorrow', 'yesterday', 'superposition'].includes(version);
  }
  
  private countActiveMorphisms(): number {
    // In real implementation, would count actual active morphisms
    return 3;
  }
  
  private startRealtimeUpdates(): void {
    // Update every second for real-time feel
    this.updateInterval = setInterval(() => {
      this.updateMeshStatus();
      this.updateLivingMemes();
      this._onDidChangeTreeData.fire();
    }, 1000);
  }
  
  private updateMeshStatus(): void {
    // Simulate mesh heartbeat
    this.meshStatus.heartbeat = 2 + Math.sin(Date.now() / 1000) * 0.3;
    this.meshStatus.peers = Math.floor(Math.random() * 3) + 5;
    this.meshStatus.coherence = 0.85 + Math.random() * 0.1;
    this.meshStatus.connected = true;
  }
  
  private updateLivingMemes(): void {
    // Evolve living memes
    for (const glyph of this.glyphs.values()) {
      if (glyph.livingMemes) {
        for (const meme of glyph.livingMemes) {
          // Slow evolution
          meme.evolution = Math.min(1, (meme.evolution || 0) + 0.001);
          
          // Random mutations
          if (Math.random() < 0.01) {
            meme.resonance = (meme.resonance || 0) + (Math.random() - 0.5) * 0.1;
          }
        }
      }
    }
  }
  
  // Public methods for external updates
  
  async addGlyph(glyph: GlyphPackage): Promise<void> {
    this.glyphs.set(glyph.name, glyph);
    this._onDidChangeTreeData.fire();
    
    // Play resonance sound
    await this.resonator.playTone(glyph.resonance || 432, 500, 'emergence');
    
    this.notificationService.info(`✨ Glyph ${glyph.name} installed at ${glyph.resonance}Hz`);
  }
  
  async removeGlyph(name: string): Promise<void> {
    this.glyphs.delete(name);
    this._onDidChangeTreeData.fire();
    
    // Play dissolution sound
    await this.resonator.playTone(200, 1000, 'dissolution');
  }
  
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
  
  dispose(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    super.dispose();
  }
}

// Register the provider
export function registerFNPMExplorer(context: vscode.ExtensionContext): void {
  const provider = new FNPMExplorerProvider(
    console as any,
    vscode.window as any,
    new EnhancedGlyphResolver(console as any, vscode.window as any, {} as any),
    new IntegrityService(console as any, {} as any)
  );
  
  vscode.window.registerTreeDataProvider('fnpmExplorer', provider);
  
  // Register commands
  vscode.commands.registerCommand('fnpm.refresh', () => provider.refresh());
  vscode.commands.registerCommand('fnpm.observeQuantumState', (item: GlyphTreeItem) => {
    if (item.quantumState) {
      vscode.window.showInformationMessage(
        `🌀 Quantum state collapsed to: ${item.glyph.version} (observer: you)`
      );
    }
  });
}