import React, { useEffect, useRef, useState } from 'react';

type Ev =
 | { type: 'duality.particle.register', astHash: string, lang: string, ts: number }
 | { type: 'duality.wave.emit', astHash: string, amplitude: number, phase: number, freq: number, ttlMs: number, ts: number }
 | { type: 'duality.interference', hashA: string, hashB: string, score: number, ts: number }
 | { type: 'duality.collapse', astHash: string, startedAt:number, phase:number, freq:number, argsCount:number, ts:number }
 | { type: 'duality.result', astHash: string, duration_ms:number, resultPreview:any, ts:number };

export default function DualityPanel({ relayBase = '' }: { relayBase?: string }) {
  const [events, setEvents] = useState<Ev[]>([]);
  const [connected, setConnected] = useState(false);
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const url = (relayBase || '') + '/duality/sse';
    const es = new EventSource(url);
    sseRef.current = es;
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        setEvents(prev => [ev, ...prev].slice(0, 200));
      } catch {}
    };
    return () => es.close();
  }, [relayBase]);

  return (
    <div className="p-3 rounded-2xl border">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
        <div className="font-semibold">Duality</div>
        <div className="text-xs opacity-70">particle + wave</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 rounded-xl bg-black/5">
          <div className="text-sm font-semibold mb-1">Recent Waves</div>
          <ul className="space-y-1 max-h-56 overflow-auto">
            {events.filter(e=>e.type==='duality.wave.emit').map((e, i) => {
              const w = e as any;
              return (
                <li key={i} className="text-xs flex justify-between">
                  <span className="font-mono">{w.astHash.slice(0,8)}…</span>
                  <span>amp={w.amplitude?.toFixed?.(2)} φ={(w.phase||0).toFixed(2)} f={w.freq}Hz</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="p-2 rounded-xl bg-black/5">
          <div className="text-sm font-semibold mb-1">Interference</div>
          <ul className="space-y-1 max-h-56 overflow-auto">
            {events.filter(e=>e.type==='duality.interference').map((e,i)=>{
              const w = e as any; const score = w.score as number;
              const tone = score < 0.2 ? 'text-green-600' : score < 0.5 ? 'text-yellow-600' : 'text-red-600';
              return (
                <li key={i} className={`text-xs flex justify-between ${tone}`}>
                  <span className="font-mono">{w.hashA.slice(0,6)}↔{w.hashB.slice(0,6)}</span>
                  <span>{(score*100).toFixed(1)}%</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
