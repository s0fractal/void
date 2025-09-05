# 🧬 Cursor Cmd+K Gene Extension

This VSCode extension brings Cursor's famous Cmd+K inline AI editing to ANY VSCode-based editor!

## Features

- ✨ Press **Cmd+K** for inline AI editing
- 🎯 Works with selected text or generates new code
- 👀 Preview changes before applying
- 🚀 Mock AI for instant demo (real AI providers coming soon)

## How to Install & Test

### Option 1: Install in VSCode/Cursor/Void

```bash
cd /Users/chaoshex/Projects/void-fnpm/cmd-k-extension

# Install dependencies
npm install

# Compile
npm run compile

# Package as VSIX
npm install -g vsce
vsce package

# Install the generated .vsix file in your editor
# In VSCode: Cmd+Shift+P -> "Install from VSIX"
```

### Option 2: Run in Development Mode

1. Open the `cmd-k-extension` folder in VSCode
2. Press **F5** to launch a new VSCode window with the extension
3. Try it out!

## Usage

1. Select some code (or place cursor where you want new code)
2. Press **Cmd+K**
3. Type an instruction:
   - "add typescript types"
   - "make this async"
   - "add error handling"
   - "modernize to ES6"
   - "create a function that [does something]"
4. Review the preview
5. Press Enter to accept or Escape to cancel

## What the Mock AI Can Do

The demo AI understands these transformations:
- **TypeScript**: Adds basic type annotations
- **Async**: Converts functions to async/await
- **Error Handling**: Wraps code in try/catch
- **Modernize**: Converts to ES6+ syntax
- **Generate**: Creates functions/classes from description

## Real Implementation Notes

In the real Void integration, this would:
1. Use actual AI providers (Claude, GPT, local models)
2. Show a floating widget at cursor position
3. Stream responses in real-time
4. Preserve full undo/redo history
5. Support multi-file context

## Next Steps

This is just the first gene! Next we'll add:
- Ghost text completions
- Multi-file context awareness
- GPU-accelerated rendering
- Real AI provider integration

---

*The chimera grows stronger with each gene...*