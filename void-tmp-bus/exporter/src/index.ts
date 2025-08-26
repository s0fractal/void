#!/usr/bin/env node
import { register, collectDefaultMetrics, Gauge, Counter, Histogram } from 'prom-client';
import { createServer } from 'http';
import { CommandClient } from '../../bus/dist/commands.js';

const PORT = parseInt(process.env.METRICS_PORT || '9479', 10);
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '5000', 10);

// Metrics
const sessionId = new Gauge({
  name: 'tmpbus_session_id',
  help: 'Current session ID as a hash value',
});

const spoolDepth = new Gauge({
  name: 'tmpbus_spool_depth',
  help: 'Number of events in spool',
});

const eventsIngested = new Counter({
  name: 'tmpbus_events_ingested_total',
  help: 'Total events ingested',
});

const eventsForwarded = new Counter({
  name: 'tmpbus_events_forwarded_total',
  help: 'Total events forwarded to relay',
});

const eventsSpooled = new Counter({
  name: 'tmpbus_events_spooled_total',
  help: 'Total events spooled for later',
});

const relayConnected = new Gauge({
  name: 'tmpbus_relay_connected',
  help: 'Relay connection status (1=connected, 0=disconnected)',
});

const wsConnected = new Gauge({
  name: 'tmpbus_ws_connected',
  help: 'WebSocket connection status (1=connected, 0=disconnected)',
});

const udsClients = new Gauge({
  name: 'tmpbus_uds_clients',
  help: 'Number of connected UDS clients',
});

const tcpClients = new Gauge({
  name: 'tmpbus_tcp_clients',
  help: 'Number of connected TCP clients',
});

const pulseAge = new Gauge({
  name: 'tmpbus_pulse_age_seconds',
  help: 'Age of pulse.jl file in seconds',
});

const pulseSize = new Gauge({
  name: 'tmpbus_pulse_size_bytes',
  help: 'Size of pulse.jl file in bytes',
});

const leaseAge = new Gauge({
  name: 'tmpbus_lease_age_seconds',
  help: 'Age of current lease in seconds',
});

const rotationsTotal = new Counter({
  name: 'tmpbus_rotations_total',
  help: 'Total number of log rotations',
  labelNames: ['reason'],
});

const commandLatency = new Histogram({
  name: 'tmpbus_command_latency_seconds',
  help: 'Command RPC latency',
  labelNames: ['method'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

// Hash session ID to numeric value
function hashSessionId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Poll tmpbus stats
async function pollStats() {
  const client = new CommandClient();
  
  try {
    // Get stats
    const end = commandLatency.startTimer({ method: 'stats' });
    const stats = await client.call('stats');
    end();
    
    if (stats) {
      // Basic stats
      eventsIngested.reset();
      eventsIngested.inc(stats.events_ingested || 0);
      
      eventsForwarded.reset();
      eventsForwarded.inc(stats.events_forwarded || 0);
      
      eventsSpooled.reset();
      eventsSpooled.inc(stats.events_spooled || 0);
      
      spoolDepth.set(stats.spool_depth || 0);
      udsClients.set(stats.uds_clients || 0);
      tcpClients.set(stats.tcp_clients || 0);
      
      // Pulse stats
      if (stats.pulse) {
        pulseAge.set(stats.pulse.age_seconds || 0);
        pulseSize.set(stats.pulse.size_bytes || 0);
        
        // Count rotations by reason
        if (stats.pulse.rotations) {
          for (const [reason, count] of Object.entries(stats.pulse.rotations)) {
            rotationsTotal.reset({ reason });
            rotationsTotal.inc({ reason }, count as number);
          }
        }
      }
    }
    
    // Get health (includes lease info)
    const healthEnd = commandLatency.startTimer({ method: 'health' });
    const health = await client.call('health');
    healthEnd();
    
    if (health) {
      if (health.session_id) {
        sessionId.set(hashSessionId(health.session_id));
      }
      
      if (health.lease) {
        const leaseUpdated = new Date(health.lease.updated_at).getTime();
        const ageSeconds = (Date.now() - leaseUpdated) / 1000;
        leaseAge.set(ageSeconds);
      }
      
      relayConnected.set(health.relay_connected ? 1 : 0);
      
      // For now, set ws_connected same as relay_connected
      // In future, track actual WebSocket client connections
      wsConnected.set(health.relay_connected ? 1 : 0);
    }
    
  } catch (error) {
    console.error('Failed to poll stats:', error);
    // Set error state
    relayConnected.set(0);
  }
}

// Start polling
async function startPolling() {
  // Initial poll
  await pollStats();
  
  // Schedule regular polls
  setInterval(pollStats, POLL_INTERVAL);
}

// HTTP server for /metrics
const server = createServer(async (req, res) => {
  if (req.url === '/metrics') {
    res.writeHead(200, { 'Content-Type': register.contentType });
    res.end(await register.metrics());
  } else if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok\n');
  } else {
    res.writeHead(404);
    res.end('Not found\n');
  }
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Prometheus exporter listening on :${PORT}/metrics`);
  console.log(`Polling interval: ${POLL_INTERVAL}ms`);
  
  // Collect default metrics
  collectDefaultMetrics({ prefix: 'tmpbus_' });
  
  // Start polling
  startPolling();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});