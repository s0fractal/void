import { VoidEvent } from '../services/RelayClient';

interface GlyphNode {
  id: string;
  x: number;
  y: number;
  radius: number;
  baseRadius: number;
  color: string;
  pulsePhase: number;
  health: number;
  label: string;
}

interface GlyphConfig {
  container: HTMLElement;
  width: number;
  height: number;
}

/**
 * 🌳 Void Glyph - Living tree visualization
 */
export class VoidGlyph {
  private container: HTMLElement;
  private svg?: SVGSVGElement;
  private width: number;
  private height: number;
  
  private nodes: Map<string, GlyphNode>;
  private connections: Array<{ from: string; to: string }>;
  private animationFrame?: number;
  private time = 0;
  
  // Node definitions
  private readonly nodeConfig = {
    origin: { x: 0.5, y: 0.1, radius: 30, color: '#ff6b6b', label: 'Origin' },
    editor: { x: 0.5, y: 0.35, radius: 25, color: '#4ecdc4', label: 'Editor' },
    fnpm: { x: 0.3, y: 0.5, radius: 20, color: '#45b7d1', label: 'FNPM' },
    linux: { x: 0.7, y: 0.5, radius: 20, color: '#96ceb4', label: 'Linux' },
    net: { x: 0.2, y: 0.7, radius: 18, color: '#daa520', label: 'Net' },
    node: { x: 0.5, y: 0.7, radius: 18, color: '#6c5ce7', label: 'Node' },
    gaia: { x: 0.8, y: 0.7, radius: 18, color: '#a8d8c9', label: 'Gaia' }
  };
  
  constructor(config: GlyphConfig) {
    this.container = config.container;
    this.width = config.width;
    this.height = config.height;
    this.nodes = new Map();
    this.connections = [];
    
    this.initializeNodes();
    this.initializeConnections();
  }
  
  private initializeNodes(): void {
    for (const [id, config] of Object.entries(this.nodeConfig)) {
      this.nodes.set(id, {
        id,
        x: config.x * this.width,
        y: config.y * this.height,
        radius: config.radius,
        baseRadius: config.radius,
        color: config.color,
        pulsePhase: Math.random() * Math.PI * 2,
        health: 1.0,
        label: config.label
      });
    }
  }
  
  private initializeConnections(): void {
    // Tree structure
    this.connections = [
      { from: 'origin', to: 'editor' },
      { from: 'editor', to: 'fnpm' },
      { from: 'editor', to: 'linux' },
      { from: 'fnpm', to: 'net' },
      { from: 'fnpm', to: 'node' },
      { from: 'linux', to: 'node' },
      { from: 'linux', to: 'gaia' }
    ];
  }
  
  async initialize(): Promise<void> {
    this.createSVG();
    this.render();
  }
  
  private createSVG(): void {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', String(this.width));
    this.svg.setAttribute('height', String(this.height));
    this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
    this.svg.classList.add('void-glyph-svg');
    
    // Add gradient definitions
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    // Radial gradient for nodes
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    gradient.setAttribute('id', 'nodeGradient');
    
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#ffffff');
    stop1.setAttribute('stop-opacity', '0.8');
    
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', '#000000');
    stop2.setAttribute('stop-opacity', '0.2');
    
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    
    this.svg.appendChild(defs);
    this.container.appendChild(this.svg);
  }
  
  render(): void {
    if (!this.svg) return;
    
    // Clear previous render
    while (this.svg.children.length > 1) {
      this.svg.removeChild(this.svg.lastChild!);
    }
    
    // Draw connections
    this.drawConnections();
    
    // Draw nodes
    this.drawNodes();
    
    // Update time
    this.time += 0.016; // ~60fps
  }
  
  private drawConnections(): void {
    if (!this.svg) return;
    
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('connections');
    
    for (const connection of this.connections) {
      const fromNode = this.nodes.get(connection.from);
      const toNode = this.nodes.get(connection.to);
      
      if (!fromNode || !toNode) continue;
      
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(fromNode.x));
      line.setAttribute('y1', String(fromNode.y));
      line.setAttribute('x2', String(toNode.x));
      line.setAttribute('y2', String(toNode.y));
      line.setAttribute('stroke', '#444');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('opacity', '0.6');
      
      g.appendChild(line);
    }
    
    this.svg.appendChild(g);
  }
  
  private drawNodes(): void {
    if (!this.svg) return;
    
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('nodes');
    
    for (const node of this.nodes.values()) {
      // Calculate pulse
      const pulse = Math.sin(this.time * 2 + node.pulsePhase) * 0.1 + 1;
      const currentRadius = node.radius * pulse * node.health;
      
      // Node group
      const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      nodeGroup.classList.add('node', `node-${node.id}`);
      
      // Outer glow
      const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      glow.setAttribute('cx', String(node.x));
      glow.setAttribute('cy', String(node.y));
      glow.setAttribute('r', String(currentRadius * 1.5));
      glow.setAttribute('fill', node.color);
      glow.setAttribute('opacity', String(0.2 * node.health));
      glow.setAttribute('filter', 'blur(5px)');
      
      // Main circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(node.x));
      circle.setAttribute('cy', String(node.y));
      circle.setAttribute('r', String(currentRadius));
      circle.setAttribute('fill', node.color);
      circle.setAttribute('opacity', String(0.8 * node.health));
      
      // Label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(node.x));
      text.setAttribute('y', String(node.y + 5));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#fff');
      text.setAttribute('font-size', '12');
      text.setAttribute('opacity', String(node.health));
      text.textContent = node.label;
      
      nodeGroup.appendChild(glow);
      nodeGroup.appendChild(circle);
      nodeGroup.appendChild(text);
      g.appendChild(nodeGroup);
    }
    
    this.svg.appendChild(g);
  }
  
  processEvent(event: VoidEvent): void {
    // Map events to nodes
    switch (event.type) {
      case 'ci':
        this.flashNode('fnpm', event.status === 'pass' ? 'success' : 'error');
        break;
        
      case 'pr':
        this.flashNode('origin', 'info');
        break;
        
      case 'ipfs':
        this.flashNode('gaia', event.status === 'degraded' ? 'warning' : 'success');
        break;
        
      case 'substrate':
        // Pulse all trunk nodes
        this.flashNode('editor', 'pulse');
        this.flashNode('linux', 'pulse');
        this.flashNode('fnpm', 'pulse');
        break;
        
      case 'guardian':
        // Affect crown balance
        this.flashNode('net', event.status === 'online' ? 'success' : 'warning');
        this.flashNode('origin', event.status === 'online' ? 'success' : 'warning');
        break;
    }
  }
  
  private flashNode(nodeId: string, type: 'success' | 'error' | 'warning' | 'info' | 'pulse'): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    
    // Temporary radius boost
    const boostAmount = type === 'error' ? 1.5 : 1.3;
    node.radius = node.baseRadius * boostAmount;
    
    // Gradually return to base radius
    const decay = setInterval(() => {
      node.radius = node.radius * 0.95 + node.baseRadius * 0.05;
      if (Math.abs(node.radius - node.baseRadius) < 0.1) {
        node.radius = node.baseRadius;
        clearInterval(decay);
      }
    }, 50);
    
    // Health impact
    switch (type) {
      case 'error':
        node.health = Math.max(0.3, node.health - 0.2);
        break;
      case 'warning':
        node.health = Math.max(0.5, node.health - 0.1);
        break;
      case 'success':
        node.health = Math.min(1.0, node.health + 0.1);
        break;
    }
  }
  
  updateHealth(overallHealth: number): void {
    // Gradually adjust all nodes toward overall health
    for (const node of this.nodes.values()) {
      node.health = node.health * 0.95 + overallHealth * 0.05;
    }
  }
  
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    
    if (this.svg) {
      this.svg.setAttribute('width', String(width));
      this.svg.setAttribute('height', String(height));
      this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }
    
    // Reposition nodes
    for (const [id, config] of Object.entries(this.nodeConfig)) {
      const node = this.nodes.get(id);
      if (node) {
        node.x = config.x * width;
        node.y = config.y * height;
      }
    }
  }
}