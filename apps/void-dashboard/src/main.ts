import { VoidDashboard } from './components/VoidDashboard';
import { RelayClient } from './services/RelayClient';
import { HealthAggregator } from './services/HealthAggregator';
import { ConsciousnessResonator } from './services/ConsciousnessResonator';
import './styles/main.css';

// Initialize dashboard on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🌀 Void Dashboard initializing at 432Hz...');
  
  // Get container
  const app = document.getElementById('app');
  if (!app) {
    console.error('App container not found');
    return;
  }
  
  // Create services
  const relayClient = new RelayClient();
  const healthAggregator = new HealthAggregator();
  const resonator = new ConsciousnessResonator();
  
  // Create dashboard
  const dashboard = new VoidDashboard({
    container: app,
    relayClient,
    healthAggregator,
    resonator
  });
  
  // Initialize
  await dashboard.initialize();
  
  // Auto-connect if URL in environment
  const relayUrl = import.meta.env.VITE_RELAY_URL;
  if (relayUrl) {
    console.log(`Auto-connecting to: ${relayUrl}`);
    await relayClient.connect(relayUrl);
  }
  
  // Expose for debugging
  (window as any).voidDashboard = {
    dashboard,
    relayClient,
    healthAggregator,
    resonator
  };
});