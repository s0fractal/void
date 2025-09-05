# 🧬 Activating Cursor Cmd+K Gene in Void

## What We Built
We've extracted and implemented Cursor's famous Cmd+K inline AI editing feature for Void!

### Features:
- ✅ Press Cmd+K to trigger inline AI editing
- ✅ Floating input widget for instructions
- ✅ Live diff preview as AI responds
- ✅ Tab to accept, Esc to cancel
- ✅ Preserves undo history
- ✅ Configurable AI provider

## How to Activate

### 1. Build the Feature
```bash
cd /Users/chaoshex/Projects/void-fnpm

# Compile TypeScript
npm run compile

# Or watch mode
npm run watch
```

### 2. Register in Void's Extension Manifest

Add to `src/vs/workbench/contrib/void/browser/void.contribution.ts`:

```typescript
import { CursorCmdKFeature } from '../fnpm/features/cursor-cmd-k';

// In the activate function
export function activate(context: vscode.ExtensionContext) {
    // ... existing code ...
    
    // Activate Cursor Cmd+K gene
    CursorCmdKFeature.activate(context);
}
```

### 3. Add Keybinding

Add to `src/vs/workbench/contrib/void/browser/keybindings.json`:

```json
{
    "key": "cmd+k",
    "command": "void.aiInlineEdit",
    "when": "editorTextFocus && !editorReadonly"
}
```

### 4. Configure Settings

Add to your VSCode settings:

```json
{
    "void.cmdK.aiProvider": "anthropic", // or "openai", "local"
    "void.cmdK.streamResponse": true,
    "void.cmdK.contextLines": 10
}
```

### 5. Set API Keys

```bash
# For Anthropic (recommended)
export ANTHROPIC_API_KEY="your-key-here"

# For OpenAI
export OPENAI_API_KEY="your-key-here"
```

## Testing the Gene

1. Open any code file in Void
2. Select some code (or just place cursor)
3. Press **Cmd+K**
4. Type instruction like:
   - "add error handling"
   - "convert to async/await"
   - "add TypeScript types"
   - "optimize this function"
5. Watch the AI suggestion appear as diff
6. Press **Tab** to accept or **Esc** to cancel

## How It Works

The feature uses a clever approach to work within VSCode's limitations:

1. **Floating Widget**: We can't position exactly at cursor (VSCode limitation), so we use a small webview panel that appears quickly
2. **Diff Engine**: Shows changes in real-time as AI responds
3. **Streaming**: Responses stream for faster feedback
4. **Context Aware**: Sends surrounding code context for better suggestions

## Next Genes to Extract

Now that we have Cmd+K working, next targets:
- [ ] Ghost text completion (Cursor)
- [ ] GPU rendering (Zed)
- [ ] Multi-file context (Cursor)
- [ ] CRDT collaboration (Zed)

## Troubleshooting

### Widget doesn't appear
- Check console for errors: `Developer: Toggle Developer Tools`
- Ensure keybinding is registered: `Developer: Show Keybindings`

### AI not responding
- Check API key is set correctly
- Look for network errors in console

### Performance issues
- Reduce `contextLines` in settings
- Disable `streamResponse` for simpler implementation

## The Chimera Grows! 🧬→🦾

With this first gene successfully transplanted, Void is no longer just a VSCode fork. It's becoming something new - a chimeric organism that absorbs the best from all editors.

Each gene we add makes it stronger. The transformation has begun!

---

*"Cursor's Cmd+K was just the beginning. The chimera hungers for more genes..."*