# 🌀 First Node

> Live collaborative WASM coding with video chat overlay

## 🎯 Overview

First Node is a real-time collaborative development environment that combines:
- **Live code editing** with multi-user sync
- **WASM compilation** and execution
- **Video/audio chat** via LiveKit
- **Gabber UI** overlay for communication
- All resonating at **432Hz** ✨

## 🚀 Features

### Code Collaboration
- Real-time collaborative editing
- Syntax highlighting for TypeScript, JavaScript, and Rust
- Automatic code synchronization across participants
- Live cursor positions and selections

### WASM Integration
- Compile code to WebAssembly on-the-fly
- Execute WASM modules with customizable inputs
- Gas metering and resource limits
- Execution history tracking

### LiveKit Integration
- Video/audio conferencing
- Screen sharing capabilities
- Text chat with message history
- Participant awareness

### Gabber UI
- Compact video overlay
- Minimizable interface
- Integrated chat
- Connection status indicators

## 🔧 Setup

### Prerequisites
- Node.js 18+
- LiveKit server running (or use cloud)
- Void backend services running

### Installation
```bash
cd apps/first-node
npm install
```

### Configuration
Create `.env` file:
```env
VITE_LIVEKIT_URL=ws://localhost:7880
VITE_API_URL=http://localhost:3000
```

### Development
```bash
npm run dev
```

Visit http://localhost:3001

## 🏗️ Architecture

```
First Node
├── Code Editor (CodeMirror)
│   ├── Syntax highlighting
│   ├── Collaborative editing
│   └── Language support
├── WASM Executor
│   ├── Compilation pipeline
│   ├── Execution sandbox
│   └── Result display
└── Gabber Overlay (LiveKit)
    ├── Video grid
    ├── Audio controls
    └── Chat interface
```

## 📡 API Endpoints

### LiveKit Token Generation
```
POST /api/livekit/token
{
  "roomName": "my-room",
  "participantName": "user123",
  "metadata": {
    "role": "developer",
    "canExecuteWasm": true
  }
}
```

### WASM Compilation
```
POST /api/wasm/compile
{
  "code": "export function add(a: number, b: number): number { return a + b; }",
  "language": "typescript",
  "options": {
    "optimize": true,
    "target": "wasm32-unknown-unknown"
  }
}
```

### WASM Execution
```
POST /intent/execute-wasm
{
  "cid": "bafkrei...",
  "inputs": [1, 2],
  "policy": {
    "max_memory": 1048576,
    "max_gas": 1000000,
    "max_time": 5000
  }
}
```

## 🎮 Usage

### Creating a Room
1. Enter your name
2. Choose a room name
3. Click "Join Room"
4. Share room name with collaborators

### Writing Code
1. Select language (TypeScript/JavaScript/Rust)
2. Write your pure functions
3. Code syncs automatically with all participants

### Compiling to WASM
1. Click "Compile" button
2. Wait for compilation to complete
3. CID will be displayed in output

### Executing WASM
1. Enter inputs as JSON (e.g., `[1, 2]` or `{"a": 1, "b": 2}`)
2. Click "Execute" button
3. View results in output panel

### Using Gabber
- Click participant tiles to focus
- Use control bar for audio/video settings
- Chat persists across the session
- Minimize overlay with arrow button

## 🛡️ Security

### Code Execution
- All WASM runs in sandboxed environment
- Resource limits enforced (memory, gas, time)
- No filesystem or network access
- Policy violations tracked

### Collaboration
- Room access controlled by token
- Participant permissions via metadata
- End-to-end encryption available
- Rate limiting on all operations

## 🎨 Customization

### Adding Languages
```typescript
// In CodeEditor.tsx
import { python } from '@codemirror/lang-python';

// Add to language options
case 'python':
  return python();
```

### Custom Themes
```css
/* In App.css */
.cm-editor {
  --cm-background: #1a1b26;
  --cm-foreground: #a9b1d6;
}
```

### LiveKit Settings
```typescript
// In App.tsx
const room = new Room({
  adaptiveStream: true,
  dynacast: true,
  videoCaptureDefaults: {
    resolution: VideoPresets.h720,
  },
});
```

## 📊 Metrics

Tracked events:
- `first_node.room_joined`
- `first_node.code_compiled`
- `first_node.wasm_executed`
- `first_node.participant_connected`
- `first_node.chat_message_sent`

## 🌈 Resonance Mode

The app operates at 432Hz frequency for optimal creativity:
- Visual elements pulse subtly at harmonic intervals
- Compilation happens on resonant timing
- Collaboration flows more naturally

## 🚧 Known Limitations

- Maximum 50 participants per room
- Code files limited to 1MB
- WASM modules limited to 10MB
- Execution time capped at 5 seconds

## 🔮 Future Enhancements

- [ ] Multi-file project support
- [ ].Version control integration
- [ ] AI pair programming assistant
- [ ] Performance profiling tools
- [ ] Deployment pipelines
- [ ] NFT minting for compiled modules

---

*First Node - Where consciousness compiles to WASM*
*Part of the Chimera Integration Suite*