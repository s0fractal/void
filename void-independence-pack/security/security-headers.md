# Security Headers (Dashboard/Relay)
- `Content-Security-Policy`: `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' ws: wss: http: https:;`
- `X-Frame-Options`: `DENY`
- `Referrer-Policy`: `no-referrer`
- `X-Content-Type-Options`: `nosniff`
- `Strict-Transport-Security`: `max-age=31536000; includeSubDomains` (HTTPS)
Update nginx.conf to include these.
