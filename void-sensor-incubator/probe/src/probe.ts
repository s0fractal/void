import { Command } from 'commander';
import EventSource from 'eventsource';

type Result = { i:number; trace_id:string; url:string; t_req_ms:number; ok:boolean; status:number; matched:boolean; err?:string };

const prog = new Command();
prog
  .name('eyes-sse-probe')
  .description('Measure end-to-end latency: POST /eyes/url → SSE event arrival')
  .option('-r, --relay <url>', 'Relay base URL', 'http://localhost:8787')
  .option('-s, --sse <path>', 'SSE path', '/sse')
  .option('-e, --endpoint <path>', 'Eyes URL endpoint', '/eyes/url')
  .option('-u, --url <url>', 'Test URL (can repeat)', (v,s)=>{ (s as any).push?.(v) ?? (s=[v]); return s; }, [] as string[])
  .option('-n, --count <n>', 'Requests count', (v)=>parseInt(v,10), 10)
  .option('-t, --timeout <ms>', 'Timeout per request (ms)', (v)=>parseInt(v,10), 12000)
  .option('--save <file>', 'Save JSONL results to file (optional)')
  .parse(process.argv);

const opt = prog.opts();
const RELAY = opt.relay.replace(/\/$/,'');        // no trailing slash
const SSE_URL = RELAY + opt.sse;
const EP = RELAY + opt.endpoint;
const URLS: string[] = (opt.url.length ? opt.url : ['https://example.com']);

function sleep(ms:number){ return new Promise(res=>setTimeout(res,ms)); }
function rnd(n=6){ const s='abcdefghijklmnopqrstuvwxyz0123456789'; return Array.from({length:n},()=>s[Math.floor(Math.random()*s.length)]).join(''); }

type SSEMsg = { type?:string; meta?:any; };

const pending = new Map<string,{resolve:(v:Result)=>void,reject:(e:any)=>void,start:number,url:string}>();

function openSSE(){
  return new Promise<EventSource>((resolve,reject)=>{
    const es = new EventSource(SSE_URL);
    es.onopen = ()=>resolve(es);
    es.onerror = (e)=>{ /* keep open; caller handles timeouts */ };
    es.onmessage = (ev)=>{
      try{
        const msg: SSEMsg = JSON.parse(ev.data);
        if (msg?.type === 'eyes') {
          const tid = msg?.meta?.trace_id;
          if (tid && pending.has(tid)){
            const p = pending.get(tid)!;
            const t = performance.now() - p.start;
            p.resolve({ i:-1, trace_id: tid, url: p.url, t_req_ms: t, ok:true, status:200, matched:true });
            pending.delete(tid);
          }
        }
      }catch{}
    };
  });
}

async function postOnce(i:number, url:string): Promise<Result> {
  const trace_id = `probe-${Date.now()}-${i}-${rnd(4)}`;
  const start = performance.now();
  const ctrl = new AbortController();
  const to = setTimeout(()=>ctrl.abort(), opt.timeout);

  // register pending wait
  const p = new Promise<Result>((resolve,reject)=> pending.set(trace_id, {resolve,reject,start,url}));

  let status = 0; let ok=false; let err:string|undefined;
  try{
    const res = await fetch(EP, {
      method:'POST',
      headers:{ 'content-type':'application/json' },
      body: JSON.stringify({ url, trace_id }),
      signal: ctrl.signal as any
    });
    status = res.status;
    const j = await res.json().catch(()=>({}));
    ok = res.ok && j?.ok === true;
  }catch(e:any){
    err = String(e);
  }finally{
    clearTimeout(to);
  }

  // now wait for SSE match (or timeout)
  const waitStart = performance.now();
  while (performance.now() - waitStart < opt.timeout){
    if (!pending.has(trace_id)){
      // resolved in SSE handler
      const elapsed = performance.now() - start;
      return { i, trace_id, url, t_req_ms: elapsed, ok, status, matched: true };
    }
    await sleep(50);
  }
  // timeout waiting for SSE event
  pending.delete(trace_id);
  const elapsed = performance.now() - start;
  return { i, trace_id, url, t_req_ms: elapsed, ok, status, matched: false, err: err || 'sse_timeout' };
}

(async ()=>{
  console.log(`# eyes-sse-probe → ${EP} , listening ${SSE_URL}`);
  const es = await openSSE();
  const results: Result[] = [];
  for (let i=0;i<opt.count;i++){
    const url = URLS[i % URLS.length] + (URLS.length===1 ? `?probe=${rnd(6)}&i=${i}` : '');
    const r = await postOnce(i, url);
    results.push(r);
    console.log(`${r.ok?'OK ':'ERR'}  ${r.matched?'match':'miss '}  ${r.t_req_ms.toFixed(0)}ms   ${r.status}   ${r.url}   [${r.trace_id}]`);
    await sleep(200);
  }
  es.close();

  const n = results.length;
  const okc = results.filter(r=>r.ok).length;
  const got = results.filter(r=>r.matched).length;
  const p95 = perc(results.map(r=>r.t_req_ms), 0.95);
  const p99 = perc(results.map(r=>r.t_req_ms), 0.99);
  const summary = { count:n, ok:okc, matched:got, p95_ms:Math.round(p95), p99_ms:Math.round(p99) };
  console.log(`# summary`, summary);

  if (opt.save){
    const fs = await import('fs');
    const fd = fs.createWriteStream(opt.save);
    for (const r of results) fd.write(JSON.stringify(r)+'\n');
    fd.end();
    const sfile = opt.save.replace(/\.jsonl?$/,'') + '.summary.json';
    fs.writeFileSync(sfile, JSON.stringify(summary,null,2));
    console.log(`# saved → ${opt.save} , ${sfile}`);
  }
})();

function perc(arr:number[], p:number){
  const a = [...arr].sort((x,y)=>x-y);
  const idx = Math.max(0, Math.min(a.length-1, Math.floor((a.length-1)*p)));
  return a[idx] ?? NaN;
}
