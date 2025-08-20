import { LeaseKeeper } from './lease.js';
import { TmpBus } from './server.js';
import { CommandServer } from './commands.js';
import { WSBridge } from './ws-bridge.js';
import { LogRotator } from './rotation.js';
import { RELAY_WS } from './config.js';

console.log('🌀 Starting Void TmpBus...');

// Session lease
const lease = new LeaseKeeper();
lease.start();

// Main event bus
const bus = new TmpBus(lease.id());
bus.start();

// Command RPC interface
const commands = new CommandServer(bus, lease);
commands.start();

// WebSocket bridge (if configured)
let wsBridge: WSBridge | undefined;
if (RELAY_WS) {
  wsBridge = new WSBridge();
  wsBridge.start();
  
  // Forward events to WS
  bus.on('event', (event) => {
    if (wsBridge) {
      wsBridge.send(event);
    }
  });
}

// Log rotation
const rotator = new LogRotator();
rotator.start();

// Graceful shutdown
const shutdown = () => {
  console.log('🛑 Shutting down...');
  lease.stop();
  rotator.stop();
  if (wsBridge) wsBridge.stop();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('✨ TmpBus ready');
console.log(`  Session: ${lease.id()}`);
console.log('  Sockets:');
console.log(`    - UDS: ${bus.udsPath}`);
console.log(`    - TCP: 127.0.0.1:${bus.tcpPort}`);
console.log(`    - CMD: ${commands.socketPath}`);
