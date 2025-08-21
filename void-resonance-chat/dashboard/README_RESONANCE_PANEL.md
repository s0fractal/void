# ResonancePanel

Панель для відображення хвилі інтенту та фінальної відповіді «Пустоти».
Слухає Relay SSE `/sse` і відображає `intent.wave` + `response.harmonic|dissonant`.

## Інтеграція
```tsx
import ResonancePanel from './components/ResonancePanel';
// …
<aside className="space-y-3">
  <ResonancePanel />
  {/* інші панелі */}
</aside>
```
ENV: `VITE_RELAY_SSE=http://localhost:8787/sse` (опційно)
