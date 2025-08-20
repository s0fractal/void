export const TMP_DIR = process.env.TMP_DIR || '/tmp/void';
export const SOCK_DIR = `${TMP_DIR}/sock`;
export const LOG_DIR = `${TMP_DIR}/log`;
export const LOG_FILE = `${LOG_DIR}/pulse.jl`;
export const LEASE_FILE = `${TMP_DIR}/lease.json`;
export const SPOOL_DIR = process.env.SPOOL_DIR || '/var/lib/void/spool';
export const TCP_PORT = parseInt(process.env.TCP_PORT || '9478', 10);

export const RELAY_HTTP = process.env.RELAY_HTTP || ''; // e.g. http://localhost:8787/event
export const RELAY_WS = process.env.RELAY_WS || 'ws://localhost:8787/ws';
export const RELAY_API_KEY = process.env.RELAY_API_KEY || '';

// Rotation settings
export const LOG_MAX_SIZE = parseInt(process.env.LOG_MAX_SIZE || '52428800', 10); // 50MB
export const LOG_MAX_AGE = parseInt(process.env.LOG_MAX_AGE || '86400000', 10); // 24h in ms

// WebSocket settings
export const WS_RECONNECT_DELAY = parseInt(process.env.WS_RECONNECT_DELAY || '5000', 10);
export const WS_MAX_BATCH = parseInt(process.env.WS_MAX_BATCH || '100', 10);
