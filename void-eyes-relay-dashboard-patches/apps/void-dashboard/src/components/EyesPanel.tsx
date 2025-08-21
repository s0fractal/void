import React, { useEffect, useMemo, useState } from 'react';

type EyesMeta = {
  url: string;
  domain: string;
  summary: string;
  veracity: number;
  complexity: number;
  affect: { valence: number; arousal: number };
  risk: string[];
  glyph_event: 'harmonic_pulse' | 'dissonant_pulse';
};

type EyesEvent = { type:'eyes'; status:'ok'|'warn'|'timeout'; meta:EyesMeta; ts:string };

const SSE_URL = import.meta.env.VITE_RELAY_SSE || '/sse';

export default function EyesPanel() {
  const [last, setLast] = useState<EyesEvent|null>(null);

  useEffect(()=>{
    const es = new EventSource(SSE_URL, { withCredentials: false });
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg?.type === 'eyes') setLast(msg as EyesEvent);
      } catch {}
    };
    es.onerror = () => {}; // UI handles degraded mode elsewhere
    return () => es.close();
  }, []);

  if (!last) return (
    <div className="rounded-2xl p-4 bg-black/30 border border-white/10">
      <div className="text-sm opacity-70">Eyes</div>
      <div className="text-lg">waiting for first signal…</div>
    </div>
  );

  const { meta } = last;
  const ver = Math.round(Math.min(1, Math.max(0, meta.veracity))*100);
  const cmp = Math.round(Math.min(1, Math.max(0, meta.complexity))*100);
  const tone = meta.glyph_event === 'harmonic_pulse' ? 'text-emerald-400' : 'text-amber-400';

  return (
    <div className="rounded-2xl p-4 bg-black/30 border border-white/10 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm opacity-70">Eyes</div>
        <div className={`text-xs ${tone} font-semibold uppercase`}>{meta.glyph_event.replace('_',' ')}</div>
      </div>
      <a href={meta.url} target="_blank" rel="noreferrer" className="text-base underline break-all">{meta.domain}</a>
      <p className="text-sm opacity-80">{meta.summary}</p>
      <div className="grid grid-cols-3 gap-2 text-sm pt-2">
        <div>Veracity: <b>{ver}%</b></div>
        <div>Complexity: <b>{cmp}%</b></div>
        <div>Affect: <b>{Math.round(meta.affect.valence*100)/100} / {Math.round(meta.affect.arousal*100)/100}</b></div>
      </div>
      {meta.risk?.length ? (
        <div className="flex flex-wrap gap-1 pt-2">
          {meta.risk.map((r,i)=>(<span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white/10">{r}</span>))}
        </div>
      ) : null}
      <div className="text-xs opacity-60 pt-2">ts: {new Date(last.ts).toLocaleString()}</div>
    </div>
  );
}
