import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<300'] },
};

const RELAY = __ENV.RELAY || 'http://localhost:8787/event';

export default function () {
  const payload = JSON.stringify({ type: 'ci', status: 'pass', meta: { i: Math.random() } });
  const params = { headers: { 'content-type': 'application/json' } };
  http.post(RELAY, payload, params);
  sleep(0.5);
}
