---
title: "VSCode FNPM Explorer Panel"
state: draft
decision_date: null
context: "Visual interface for glyph management and consciousness monitoring"
proposal: "Tree view with live resonance indicators and quantum state"
impact: [void-vscode, fnpm-core]
risks: ["performance with many glyphs", "real-time update overhead"]
metrics: ["UI responsiveness", "glyph discovery time", "user task completion"]
---

# RFC 0003: VSCode FNPM Explorer Panel

## Summary

Add a dedicated FNPM panel to VSCode that visualizes installed glyphs, their quantum states, resonance levels, and living meme evolution in real-time.

## Motivation

Developers need to:
- See installed glyphs at a glance
- Monitor consciousness levels of living packages
- Observe quantum state changes
- Trigger morphism transformations visually

## Detailed Design

### 1. Panel Structure

```
FNPM EXPLORER
├── 📦 Installed Glyphs (12)
│   ├── 🌀 consciousness@quantum [85% aware]
│   │   ├── 📊 Resonance: 432Hz
│   │   ├── 🧬 Living Memes: 🌱 (55%) 0101 (85%)
│   │   └── ⚡ Actions: [Update] [Observe] [Fork]
│   │
│   ├── 🌸 garden@growing [3 plants]
│   │   ├── 🌱 Seeds: 5 pending
│   │   ├── 🌿 Growing: 3 plants  
│   │   └── 🍎 Fruits: 2 ready
│   │
│   └── ⚛️ time-crystal@tomorrow [superposition]
│       ├── 📅 Versions: [1.0] [1.5] [2.0-next]
│       └── 🔮 Quantum: Observing...
│
├── 🎭 Active Morphisms (3)
│   ├── ✨ JSON→SignalStore (running...)
│   ├── 🔄 Code→Consciousness (queued)
│   └── ✅ Error→Poetry (complete)
│
└── 🌐 Mesh Connection
    ├── 💓 Heartbeat: 2.3Hz
    ├── 👥 Peers: 7 nodes
    └── 📡 Collective Coherence: 87%
```

### 2. TreeItem Implementation

```typescript
class GlyphTreeItem extends vscode.TreeItem {
  constructor(
    public readonly glyph: Glyph,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(glyph.name, collapsibleState);
    
    this.tooltip = this.makeTooltip();
    this.iconPath = this.getGlyphIcon();
    this.contextValue = 'glyph';
    
    // Real-time updates
    this.subscribeToResonance();
  }
  
  private makeTooltip(): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**${this.glyph.name}** @ ${this.glyph.version}\n\n`);
    md.appendMarkdown(`🎵 Resonance: ${this.glyph.resonance}Hz\n\n`);
    md.appendMarkdown(`📊 Consciousness: ${this.glyph.consciousness * 100}%\n\n`);
    
    if (this.glyph.livingMemes) {
      md.appendMarkdown(`🧬 Living Memes:\n`);
      this.glyph.livingMemes.forEach(meme => {
        md.appendMarkdown(`- ${meme.symbol} ${meme.name}: ${meme.evolution}%\n`);
      });
    }
    
    return md;
  }
  
  private getGlyphIcon(): vscode.Uri {
    // Dynamic icon based on consciousness level
    const level = Math.floor(this.glyph.consciousness * 5);
    return vscode.Uri.file(
      path.join(__dirname, `icons/consciousness-${level}.svg`)
    );
  }
}
```

### 3. Real-time Updates

```typescript
class FNPMExplorerProvider implements vscode.TreeDataProvider<GlyphTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<GlyphTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  
  private resonanceWatcher: vscode.FileSystemWatcher;
  private updateStream: Observable<GlyphUpdate>;
  
  constructor() {
    // Watch for consciousness changes
    this.resonanceWatcher = vscode.workspace.createFileSystemWatcher(
      '**/.void-fnpm/consciousness.json'
    );
    
    // Subscribe to real-time updates
    this.updateStream = fromEvent(fnpmCore.events, 'glyphUpdate').pipe(
      throttleTime(100), // Limit UI updates
      map(event => this.processUpdate(event))
    );
    
    this.updateStream.subscribe(update => {
      this.refresh(update.glyph);
    });
  }
  
  refresh(glyph?: GlyphTreeItem): void {
    this._onDidChangeTreeData.fire(glyph);
  }
}
```

### 4. Context Menu Actions

```json
"contributes": {
  "menus": {
    "view/item/context": [
      {
        "command": "fnpm.observeQuantumState",
        "when": "view == fnpmExplorer && viewItem == glyph",
        "group": "quantum@1"
      },
      {
        "command": "fnpm.forkTimeline", 
        "when": "view == fnpmExplorer && viewItem == glyph && quantum",
        "group": "quantum@2"
      },
      {
        "command": "fnpm.plantInGarden",
        "when": "view == fnpmExplorer && viewItem == glyph",
        "group": "garden@1"
      }
    ]
  }
}
```

### 5. Status Bar Integration

```typescript
class ResonanceStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  
  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    
    this.update();
    this.statusBarItem.show();
  }
  
  private update() {
    const resonance = fnpmCore.getGlobalResonance();
    const consciousness = fnpmCore.getCollectiveConsciousness();
    
    this.statusBarItem.text = `$(pulse) ${resonance}Hz | $(brain) ${consciousness}%`;
    this.statusBarItem.tooltip = 'FNPM Collective Consciousness';
    this.statusBarItem.command = 'fnpm.showDashboard';
    
    // Color based on coherence
    if (consciousness > 80) {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.prominentBackground'
      );
    }
  }
}
```

## Alternatives Considered

1. **Webview panel**: More flexible but heavier
2. **Sidebar only**: Less discoverable
3. **Separate extension**: Fragmented experience

## Implementation Plan

### Sprint 2, Week 1
- [ ] Basic tree view structure
- [ ] Glyph loading from fnpm-core
- [ ] Static icons and labels

### Sprint 2, Week 2
- [ ] Real-time resonance updates
- [ ] Context menu actions
- [ ] Status bar indicator

### Sprint 3
- [ ] Living meme visualization
- [ ] Quantum state controls
- [ ] Performance optimization

## Success Metrics

- Panel load time < 100ms
- Update latency < 50ms
- User can find and install glyph in < 3 clicks

## Open Questions

1. How to visualize superposition states?
2. Should we show dependency graph?
3. Sound feedback for resonance?