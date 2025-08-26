import os, time
from fastapi import FastAPI, Body
from fastapi.responses import JSONResponse, PlainTextResponse
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from .loader import load_checker
import httpx

app = FastAPI(title='Void Antigone')

RELAY = os.environ.get('RELAY_BASE', '').rstrip('/')
MODE  = os.environ.get('DECISION_MODE', 'warn')  # warn|gate

ant_ms   = Histogram('void_antigone_decision_ms', 'decision latency', buckets=(5,10,20,50,100,200,500,1000,2000))
ant_total= Counter('void_antigone_decisions_total', 'decisions', ['decision'])
ant_ref  = Counter('void_antigone_refusals_total', 'refusals', ['reason'])
g_hash   = Gauge('void_antigone_genome_hash', 'static 1 labelled by sha', ['sha'])

checker = load_checker()
g_hash.labels(checker.sha256).set(1)

def post_event(ev):
    if not RELAY: return
    try:
        with httpx.Client(timeout=2.5) as c:
            c.post(RELAY + '/event', json=ev)
    except Exception:
        pass

@app.get('/health')
def health():
    return {'ok': True, 'mode': MODE, 'sha': checker.sha256}

@app.post('/antigone/check')
def check(payload: dict = Body(...)):
    t0 = time.time()
    res = checker.decide(payload if isinstance(payload, dict) else {'text': str(payload)})
    ant_ms.observe((time.time()-t0)*1000.0)
    ant_total.labels(res['decision']).inc()
    post_event({'type':'antigone.decision','ts': int(time.time()*1000), 'result': res, 'mode': MODE})
    return res

@app.post('/antigone/act')
def act(payload: dict = Body(...)):
    res = checker.decide(payload)
    if MODE == 'gate' and res['decision'] == 'deny':
        ant_ref.labels('dissonance').inc()
        post_event({'type':'antigone.refusal','ts': int(time.time()*1000), 'result': res, 'cmd': payload.get('text','')})
        return JSONResponse({'ok': False, 'reason': 'dissonance', 'antigone': res}, status_code=409)
    return {'ok': True, 'echo': payload.get('text',''), 'antigone': res}

@app.get('/metrics')
def metrics():
    return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)
