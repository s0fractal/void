import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// env: K6_RELAY_URL, K6_CID, K6_ENTRY (наприклад "add(i32,i32)->i32"), K6_TOKEN (опц.)
const RELAY = __ENV.K6_RELAY_URL || 'http://localhost:8787';
const CID   = __ENV.K6_CID || 'bafkrei-demo';
const ENTRY = __ENV.K6_ENTRY || 'add(i32,i32)->i32';
const TOKEN = __ENV.K6_TOKEN || '';

const errorRate = new Rate('intent_errors');
const e2eTime   = new Trend('intent_e2e_ms');

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '2m',  target: 50 },
    { duration: '3m',  target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<500'],
    intent_errors: ['rate<0.05'],
  },
};

export default function () {
  const a = Math.floor(Math.random() * 100);
  const b = Math.floor(Math.random() * 100);

  const body = JSON.stringify({
    target: { cid: CID, astHash: null },
    entry: ENTRY,
    args: [a, b],
    principal: `k6-user-${__VU}`,
    labels: { scenario: 'k6', run: `${__VU}-${__ITER}` }
  });

  const headers = {
    'Content-Type': 'application/json',
    'Idempotency-Key': `k6-${__VU}-${__ITER}`,
  };
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;

  const res = http.post(`${RELAY}/intent/execute-wasm`, body, { headers });

  const ok = check(res, {
    'status 2xx/202': (r) => r.status >= 200 && r.status < 300,
    'has run_id':     (r) => r.json('run_id') \!== null,
  });

  errorRate.add(\!ok);

  const runId = res.json('run_id');
  if (runId) {
    const t0 = Date.now();
    for (let i = 0; i < 30; i++) { // ~3s
      const rr = http.get(`${RELAY}/intent/runs/${runId}`);
      if (rr.status === 200 && rr.json('status') === 'finished') {
        e2eTime.add(Date.now() - t0);
        break;
      }
      sleep(0.1);
    }
  }

  sleep(0.05);
}
