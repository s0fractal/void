import { CodexClient } from '../services/CodexClient';
import { VoidEvent } from '../services/RelayClient';

interface CodexPanelConfig {
  container: HTMLElement;
  relayUrl: string;
  onEvent?: (event: VoidEvent) => void;
}

/**
 * 🧠 Codex AI Panel
 * Provides buttons for AI-assisted operations
 */
export class CodexPanel {
  private container: HTMLElement;
  private codexClient: CodexClient;
  private onEvent?: (event: VoidEvent) => void;
  private isAvailable = false;
  
  constructor(config: CodexPanelConfig) {
    this.container = config.container;
    this.codexClient = new CodexClient(config.relayUrl);
    this.onEvent = config.onEvent;
    
    // Check availability periodically
    this.checkAvailability();
    setInterval(() => this.checkAvailability(), 30000);
  }
  
  private async checkAvailability(): Promise<void> {
    this.isAvailable = await this.codexClient.isAvailable();
    this.render();
  }
  
  render(): void {
    const statusClass = this.isAvailable ? 'connected' : 'disconnected';
    const statusText = this.isAvailable ? 'Available' : 'Unavailable';
    
    this.container.innerHTML = `
      <div class="codex-panel">
        <h3>🧠 Codex AI Assistant</h3>
        
        <div class="status-indicator ${statusClass}">
          Status: ${statusText}
        </div>
        
        <div class="control-group">
          <label>Request Plan</label>
          <input 
            type="text" 
            id="plan-intent" 
            placeholder="What do you want to implement?"
            ${!this.isAvailable ? 'disabled' : ''}
          />
          <button 
            id="request-plan" 
            class="btn-secondary"
            ${!this.isAvailable ? 'disabled' : ''}
          >
            Generate Plan
          </button>
        </div>
        
        <div class="control-group">
          <label>Update Rules</label>
          <p class="hint">Analyze recent events and suggest rule updates</p>
          <button 
            id="update-rules" 
            class="btn-secondary"
            ${!this.isAvailable ? 'disabled' : ''}
          >
            Analyze & Update
          </button>
        </div>
        
        <div class="control-group">
          <label>Independence Report</label>
          <p class="hint">Generate report from current pulse log</p>
          <button 
            id="generate-report" 
            class="btn-secondary"
            ${!this.isAvailable ? 'disabled' : ''}
          >
            Generate Report
          </button>
        </div>
        
        <div class="control-group">
          <label>Commit Message</label>
          <textarea
            id="changes-summary"
            rows="3"
            placeholder="Describe your changes..."
            ${!this.isAvailable ? 'disabled' : ''}
          ></textarea>
          <button 
            id="generate-commit" 
            class="btn-secondary"
            ${!this.isAvailable ? 'disabled' : ''}
          >
            Generate Message
          </button>
        </div>
        
        <div id="codex-output" class="output-section" style="display: none;">
          <h4>Response:</h4>
          <pre id="codex-response"></pre>
        </div>
      </div>
    `;
    
    this.attachEventListeners();
  }
  
  private attachEventListeners(): void {
    // Plan button
    const planBtn = this.container.querySelector('#request-plan') as HTMLButtonElement;
    const planInput = this.container.querySelector('#plan-intent') as HTMLInputElement;
    
    planBtn?.addEventListener('click', async () => {
      const intent = planInput.value.trim();
      if (!intent) return;
      
      await this.handlePlanRequest(intent);
    });
    
    planInput?.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        const intent = planInput.value.trim();
        if (!intent) return;
        await this.handlePlanRequest(intent);
      }
    });
    
    // Rules button
    const rulesBtn = this.container.querySelector('#update-rules') as HTMLButtonElement;
    rulesBtn?.addEventListener('click', async () => {
      await this.handleRulesRequest();
    });
    
    // Report button
    const reportBtn = this.container.querySelector('#generate-report') as HTMLButtonElement;
    reportBtn?.addEventListener('click', async () => {
      await this.handleReportRequest();
    });
    
    // Commit message button
    const commitBtn = this.container.querySelector('#generate-commit') as HTMLButtonElement;
    const changesTextarea = this.container.querySelector('#changes-summary') as HTMLTextAreaElement;
    
    commitBtn?.addEventListener('click', async () => {
      const summary = changesTextarea.value.trim();
      if (!summary) return;
      
      await this.handleCommitRequest(summary);
    });
  }
  
  private async handlePlanRequest(intent: string): Promise<void> {
    this.showLoading();
    
    try {
      const response = await this.codexClient.plan({
        intent,
        context: { source: 'void-dashboard' }
      });
      
      this.showResponse(`📋 Implementation Plan:

${response.plan.map((step, i) => `${i + 1}. ${step.step}${step.why ? ` (${step.why})` : ''}`).join('\n')}

${response.patches.length > 0 ? `\n📝 Patches:\n${response.patches.map(p => `- ${p.path}`).join('\n')}` : ''}

${response.risks.length > 0 ? `\n⚠️ Risks:\n${response.risks.join('\n')}` : ''}`);
      
      // Emit event
      this.emitCodexEvent('plan', { intent, response });
      
    } catch (error) {
      this.showError(error);
    }
  }
  
  private async handleRulesRequest(): Promise<void> {
    this.showLoading();
    
    try {
      // Get recent events from window
      const recentEvents = (window as any).__voidPulseLog?.slice(-50) || [];
      
      const response = await this.codexClient.rules({
        pulse_window: recentEvents
      });
      
      this.showResponse(`📜 Rules Update:

\`\`\`yaml
${response.rules_patch}
\`\`\`

${response.test_cases.length > 0 ? `\n🧪 Test Cases: ${response.test_cases.length}` : ''}`);
      
      // Emit event
      this.emitCodexEvent('rules', { response });
      
    } catch (error) {
      this.showError(error);
    }
  }
  
  private async handleReportRequest(): Promise<void> {
    this.showLoading();
    
    try {
      // Get pulse log from dashboard
      const pulseLog = JSON.stringify((window as any).__voidPulseLog || []);
      
      const response = await this.codexClient.report({
        pulse_log: pulseLog,
        thresholds: {
          mn1_local_pct: 80,
          health_min: 0.85
        }
      });
      
      this.showResponse(`📊 Independence Report:

- Offline Window: ${response.OFFLINE_WINDOW}
- Total Events: ${response.EVENTS_TOTAL}
- Local Decisions: ${response.LOCAL_PCT}%
- Health Average: ${response.HEALTH_AVG}
- Kohanist Average: ${response.KOHANIST_AVG}
- Router Mode: ${response.ROUTER_MODE}

${response.OATH ? `\n🗽 ${response.OATH}` : ''}`);
      
      // Emit event
      this.emitCodexEvent('report', { response });
      
    } catch (error) {
      this.showError(error);
    }
  }
  
  private async handleCommitRequest(summary: string): Promise<void> {
    this.showLoading();
    
    try {
      // Parse summary into changes
      const changes = summary.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const match = line.match(/^(.+?):\s*(.+)$/);
          if (match) {
            return { path: match[1], summary: match[2] };
          }
          return { path: 'unknown', summary: line };
        });
      
      const response = await this.codexClient.commitMessage({
        changes,
        scope: 'void-dashboard'
      });
      
      this.showResponse(`💬 Commit Message:

\`\`\`
${response.message}
\`\`\``);
      
      // Emit event
      this.emitCodexEvent('commit', { changes, response });
      
    } catch (error) {
      this.showError(error);
    }
  }
  
  private showLoading(): void {
    const output = this.container.querySelector('#codex-output') as HTMLElement;
    const response = this.container.querySelector('#codex-response') as HTMLElement;
    
    if (output && response) {
      output.style.display = 'block';
      response.textContent = '🌀 Processing...';
      response.className = 'loading';
    }
  }
  
  private showResponse(text: string): void {
    const output = this.container.querySelector('#codex-output') as HTMLElement;
    const response = this.container.querySelector('#codex-response') as HTMLElement;
    
    if (output && response) {
      output.style.display = 'block';
      response.textContent = text;
      response.className = 'success';
    }
  }
  
  private showError(error: any): void {
    const output = this.container.querySelector('#codex-output') as HTMLElement;
    const response = this.container.querySelector('#codex-response') as HTMLElement;
    
    if (output && response) {
      output.style.display = 'block';
      response.textContent = `❌ Error: ${error.message || error}`;
      response.className = 'error';
    }
  }
  
  private emitCodexEvent(type: string, data: any): void {
    if (this.onEvent) {
      this.onEvent({
        type: `codex:${type}`,
        status: 'success',
        meta: data,
        ts: new Date().toISOString()
      });
    }
  }
}