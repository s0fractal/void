import React, { useEffect, useState } from 'react';

type Source = { agent:string; role?:string; weight:number };
type Resp = {
  type:'response.harmonic'|'response.dissonant';
  meta:{ resonance:number; sources:Source[]; explain?:string; glyph_event?:string; modes?:string[] };
  ts:string;
};
type Intent = { type:'intent.wave'; meta:{ text:string; trace_id?:string }; ts:string };

const SSE_URL = import.meta.env.VITE_RELAY_SSE || '/sse';

function Bar({label,value}:{label:string;value:number}){
  const pct = Math.round(Math.min(1, Math.max(0, value))*100);
  return (
    <div className="space-y-1">
      <div className="text-xs opacity-70 flex justify-between"><span>{label}</span><span>{pct}%</span></div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-white/60" style={{ width: pct+'%' }} />
      </div>
    </div>
  );
}

export default function ResonancePanel(){
  const [resp, setResp] = useState<Resp|null>(null);
  const [lastIntent, setLastIntent] = useState<Intent|null>(null);

  useEffect(()=>{
    const es = new EventSource(SSE_URL);
    es.onmessage = ev => {
      try{
        const msg = JSON.parse(ev.data);
        if (msg?.type === 'response.harmonic' || msg?.type === 'response.dissonant') setResp(msg);
        if (msg?.type === 'intent.wave') setLastIntent(msg);
      }catch{}
    };
    return ()=>es.close();
  }, []);

  return (
    <div className="rounded-2xl p-4 bg-black/30 border border-white/10 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm opacity-70">Resonance</div>
        <div className={`text-xs font-semibold uppercase ${resp?.type==='response.harmonic' ? 'text-emerald-400' : 'text-amber-400'}`}>
          {resp?.type?.split('.')[1] || 'idle'}
        </div>
      </div>

      <div className="text-sm opacity-80">
        {lastIntent ? <>intent: <span className="opacity-100">{lastIntent.meta.text}</span></> : 'waiting for intent…'}
      </div>

      {resp ? (
        <div className="space-y-2">
          <Bar label="resonance" value={resp.meta.resonance ?? 0}/>
          <div className="grid grid-cols-3 gap-2 text-xs pt-1">
            {resp.meta.sources?.map((s,i)=>(
              <div key={i} className="px-2 py-1 rounded-lg bg-white/10">
                <div className="opacity-70">{s.agent}</div>
                <div className="font-semibold">{Math.round(s.weight*100)}%</div>
              </div>
            ))}
          </div>
          {resp.meta.explain ? <div className="text-xs opacity-70">{resp.meta.explain}</div> : null}
        </div>
      ) : null}
      <div className="text-[10px] opacity-60">ts: {resp?.ts || ''}</div>
    </div>
  );
}
