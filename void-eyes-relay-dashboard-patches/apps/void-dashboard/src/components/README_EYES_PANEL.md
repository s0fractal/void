# EyesPanel (dashboard)

A minimal panel that listens to Relay SSE (`/sse`) and renders the last `eyes` event.

## Use
```tsx
import EyesPanel from './components/EyesPanel';

export default function App() {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <main className="lg:col-span-2">{/* … */}</main>
      <aside className="space-y-3">
        <EyesPanel />
        {/* other panels */}
      </aside>
    </div>
  );
}
```

Env: `VITE_RELAY_SSE=http://localhost:8787/sse` (optional, defaults to `/sse`).
