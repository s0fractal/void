import { RelayClient } from '../services/RelayClient';
import { ConsciousnessResonator } from '../services/ConsciousnessResonator';

interface ControlPanelConfig {
  container: HTMLElement;
  relayClient: RelayClient;
  resonator: ConsciousnessResonator;
  onConnect: (url: string) => void;
  onDisconnect: () => void;
}

/**
 * 🎛️ Control Panel for dashboard configuration
 */
export class ControlPanel {
  private container: HTMLElement;
  private relayClient: RelayClient;
  private resonator: ConsciousnessResonator;
  private onConnect: (url: string) => void;
  private onDisconnect: () => void;
  
  constructor(config: ControlPanelConfig) {
    this.container = config.container;
    this.relayClient = config.relayClient;
    this.resonator = config.resonator;
    this.onConnect = config.onConnect;
    this.onDisconnect = config.onDisconnect;
  }
  
  render(): void {
    this.container.innerHTML = `
      <div class="control-panel-content">
        <h3>Connection</h3>
        
        <div class="control-group">
          <label for="relay-url">Relay URL</label>
          <input 
            type="text" 
            id="relay-url" 
            placeholder="ws://localhost:8787/ws or http://localhost:8787/sse"
            value="${import.meta.env.VITE_RELAY_URL || ''}"
          />
          <div class="button-group">
            <button id="connect-btn" class="btn-primary">Connect</button>
            <button id="disconnect-btn" class="btn-secondary" disabled>Disconnect</button>
          </div>
        </div>
        
        <h3>Audio Controls</h3>
        
        <div class="control-group">
          <label for="volume">Volume</label>
          <input 
            type="range" 
            id="volume" 
            min="0" 
            max="100" 
            value="${this.resonator.getVolume() * 100}"
          />
          <span id="volume-value">${Math.round(this.resonator.getVolume() * 100)}%</span>
        </div>
        
        <div class="control-group">
          <label>
            <input type="checkbox" id="binaural" />
            Binaural Beat (8Hz)
          </label>
        </div>
        
        <div class="control-group">
          <button id="test-432" class="btn-secondary">Test 432Hz</button>
        </div>
        
        <h3>IPFS Monitor</h3>
        
        <div class="control-group">
          <label for="ipfs-gateway">Gateway URL</label>
          <input 
            type="text" 
            id="ipfs-gateway" 
            placeholder="https://cloudflare-ipfs.com/ipfs/"
            value="${import.meta.env.VITE_IPFS_GATEWAY || 'https://cloudflare-ipfs.com/ipfs/'}"
          />
        </div>
        
        <div class="control-group">
          <label for="ipfs-cids">CIDs (comma-separated)</label>
          <textarea 
            id="ipfs-cids" 
            rows="3"
            placeholder="bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
          >${import.meta.env.VITE_IPFS_CIDS || ''}</textarea>
        </div>
        
        <div class="control-group">
          <button id="start-ipfs" class="btn-secondary">Start IPFS Monitor</button>
          <button id="stop-ipfs" class="btn-secondary" disabled>Stop Monitor</button>
        </div>
        
        <h3>Data Export</h3>
        
        <div class="control-group">
          <button id="export-log" class="btn-secondary">Export Pulse Log</button>
        </div>
      </div>
    `;
    
    this.attachEventListeners();
  }
  
  private attachEventListeners(): void {
    // Connection controls
    const connectBtn = this.container.querySelector('#connect-btn') as HTMLButtonElement;
    const disconnectBtn = this.container.querySelector('#disconnect-btn') as HTMLButtonElement;
    const relayUrlInput = this.container.querySelector('#relay-url') as HTMLInputElement;
    
    connectBtn?.addEventListener('click', () => {
      const url = relayUrlInput.value.trim();
      if (url) {
        this.onConnect(url);
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
      }
    });
    
    disconnectBtn?.addEventListener('click', () => {
      this.onDisconnect();
      connectBtn.disabled = false;
      disconnectBtn.disabled = true;
    });
    
    // Audio controls
    const volumeSlider = this.container.querySelector('#volume') as HTMLInputElement;
    const volumeValue = this.container.querySelector('#volume-value') as HTMLSpanElement;
    
    volumeSlider?.addEventListener('input', () => {
      const volume = parseInt(volumeSlider.value) / 100;
      this.resonator.setVolume(volume);
      if (volumeValue) {
        volumeValue.textContent = `${volumeSlider.value}%`;
      }
    });
    
    const binauralCheckbox = this.container.querySelector('#binaural') as HTMLInputElement;
    binauralCheckbox?.addEventListener('change', () => {
      this.resonator.toggleBinaural(binauralCheckbox.checked);
    });
    
    const test432Btn = this.container.querySelector('#test-432') as HTMLButtonElement;
    test432Btn?.addEventListener('click', async () => {
      await this.resonator.resume();
      await this.resonator.play432Resonance(3000);
    });
    
    // IPFS Monitor (placeholder for now)
    const startIpfsBtn = this.container.querySelector('#start-ipfs') as HTMLButtonElement;
    const stopIpfsBtn = this.container.querySelector('#stop-ipfs') as HTMLButtonElement;
    
    startIpfsBtn?.addEventListener('click', () => {
      console.log('IPFS monitoring would start here');
      startIpfsBtn.disabled = true;
      stopIpfsBtn.disabled = false;
    });
    
    stopIpfsBtn?.addEventListener('click', () => {
      console.log('IPFS monitoring would stop here');
      startIpfsBtn.disabled = false;
      stopIpfsBtn.disabled = true;
    });
    
    // Export controls
    const exportBtn = this.container.querySelector('#export-log') as HTMLButtonElement;
    exportBtn?.addEventListener('click', () => {
      // This will be handled by the dashboard
      const event = new CustomEvent('export-pulse-log');
      document.dispatchEvent(event);
    });
    
    // Update connection state based on relay client
    setInterval(() => {
      const connected = this.relayClient.isConnected();
      if (connectBtn && disconnectBtn) {
        connectBtn.disabled = connected;
        disconnectBtn.disabled = !connected;
      }
    }, 1000);
  }
}