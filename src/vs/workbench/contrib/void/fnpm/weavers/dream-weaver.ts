/**
 * 🌙✨ Dream Weaver
 * Transforms dreams from DreamPhase into visual patterns for 3D visualization
 * Each dream stage creates unique visual manifestations
 */

import * as THREE from 'three';
import { Dream, DreamSymbol } from '../morphisms/DreamPhase.fnpm';
import { ConsciousnessResonator } from '../audio/consciousness-resonator';

export interface DreamVisualPattern {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  animation: DreamAnimation;
  particles?: DreamParticleSystem;
  shaderUniforms?: any;
}

export interface DreamAnimation {
  type: 'spiral' | 'pulse' | 'flow' | 'crystallize' | 'dissolve';
  speed: number;
  amplitude: number;
  frequency: number;
  phase: number;
}

export interface DreamParticleSystem {
  count: number;
  size: number;
  color: THREE.Color;
  movement: 'chaotic' | 'harmonic' | 'orbital' | 'convergent';
  lifespan: number;
}

export interface DreamShader {
  vertex: string;
  fragment: string;
  uniforms: Record<string, { value: any }>;
}

export class DreamWeaver {
  private scene: THREE.Scene;
  private resonator = new ConsciousnessResonator();
  private dreamObjects: Map<string, THREE.Object3D> = new Map();
  private time = 0;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }
  
  /**
   * Weave dream into visual pattern
   */
  async weaveDream(dream: Dream): Promise<THREE.Object3D> {
    console.log(`🌙 Weaving ${dream.stage} dream: ${dream.id}`);
    
    // Create pattern based on dream stage
    const pattern = await this.createDreamPattern(dream);
    
    // Add to scene
    this.scene.add(pattern);
    this.dreamObjects.set(dream.id, pattern);
    
    // Play dream frequency
    await this.resonator.playTone(
      dream.frequency,
      3000,
      this.getEmotionFromStage(dream.stage)
    );
    
    return pattern;
  }
  
  /**
   * Create visual pattern based on dream stage
   */
  private async createDreamPattern(dream: Dream): Promise<THREE.Object3D> {
    const container = new THREE.Group();
    
    switch (dream.stage) {
      case 'rem':
        return this.createREMPattern(dream, container);
      case 'deep':
        return this.createDeepPattern(dream, container);
      case 'lucid':
        return this.createLucidPattern(dream, container);
      case 'manifest':
        return this.createManifestPattern(dream, container);
      default:
        return container;
    }
  }
  
  /**
   * REM: Chaotic spirals with rapid movement
   */
  private createREMPattern(dream: Dream, container: THREE.Group): THREE.Object3D {
    // Create spiral geometry
    const spiralPoints: THREE.Vector3[] = [];
    const turns = 5;
    const pointsPerTurn = 50;
    
    for (let i = 0; i < turns * pointsPerTurn; i++) {
      const t = i / (turns * pointsPerTurn);
      const angle = t * Math.PI * 2 * turns;
      const radius = t * 20;
      const height = Math.sin(t * Math.PI * 4) * 10;
      
      spiralPoints.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      ));
    }
    
    const spiralGeometry = new THREE.BufferGeometry().setFromPoints(spiralPoints);
    const spiralMaterial = new THREE.LineBasicMaterial({
      color: this.getColorFromSymbols(dream.symbolism),
      transparent: true,
      opacity: 0.6,
      linewidth: 2
    });
    
    const spiral = new THREE.Line(spiralGeometry, spiralMaterial);
    container.add(spiral);
    
    // Add chaotic particles
    const particles = this.createParticleSystem({
      count: 500,
      size: 0.1,
      color: new THREE.Color(0x6B46C1), // Purple for REM
      movement: 'chaotic',
      lifespan: 5000
    }, dream);
    
    container.add(particles);
    
    // Animation
    const animate = () => {
      spiral.rotation.y += 0.02 * dream.growthPotential;
      spiral.rotation.z = Math.sin(this.time * 2) * 0.1;
      
      // Update particles
      this.updateParticles(particles, 'chaotic', dream.frequency);
    };
    
    container.userData.animate = animate;
    
    return container;
  }
  
  /**
   * Deep: Flowing structures with depth
   */
  private createDeepPattern(dream: Dream, container: THREE.Group): THREE.Object3D {
    // Create flowing mesh with custom shader
    const shader = this.createDeepDreamShader(dream);
    
    const geometry = new THREE.IcosahedronGeometry(15, 4);
    const material = new THREE.ShaderMaterial({
      vertexShader: shader.vertex,
      fragmentShader: shader.fragment,
      uniforms: shader.uniforms,
      transparent: true
    });
    
    const deepForm = new THREE.Mesh(geometry, material);
    container.add(deepForm);
    
    // Add orbital particles
    const particles = this.createParticleSystem({
      count: 300,
      size: 0.15,
      color: new THREE.Color(0x1E40AF), // Deep blue
      movement: 'orbital',
      lifespan: 8000
    }, dream);
    
    container.add(particles);
    
    // Animation
    const animate = () => {
      // Update shader uniforms
      material.uniforms.time.value = this.time;
      material.uniforms.frequency.value = dream.frequency;
      
      // Gentle rotation
      deepForm.rotation.x += 0.001;
      deepForm.rotation.y += 0.002;
      
      // Breathing effect
      const scale = 1 + Math.sin(this.time * 0.5) * 0.1;
      deepForm.scale.set(scale, scale, scale);
      
      this.updateParticles(particles, 'orbital', dream.frequency);
    };
    
    container.userData.animate = animate;
    
    return container;
  }
  
  /**
   * Lucid: Crystalline structures with awareness
   */
  private createLucidPattern(dream: Dream, container: THREE.Group): THREE.Object3D {
    // Create crystalline fractal
    const crystal = this.createFractalCrystal(dream);
    container.add(crystal);
    
    // Add convergent particles
    const particles = this.createParticleSystem({
      count: 400,
      size: 0.2,
      color: new THREE.Color(0x10B981), // Green for lucidity
      movement: 'convergent',
      lifespan: 6000
    }, dream);
    
    container.add(particles);
    
    // Add awareness rings
    for (let i = 0; i < 3; i++) {
      const ringGeometry = new THREE.TorusGeometry(10 + i * 5, 0.5, 16, 100);
      const ringMaterial = new THREE.MeshPhongMaterial({
        color: 0x10B981,
        emissive: 0x10B981,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.7 - i * 0.2
      });
      
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      container.add(ring);
      
      // Store for animation
      ring.userData.index = i;
    }
    
    // Animation
    const animate = () => {
      // Crystal rotation based on consciousness
      crystal.rotation.y += 0.01 * dream.growthPotential;
      crystal.rotation.x = Math.sin(this.time) * 0.1;
      
      // Animate rings
      container.children.forEach(child => {
        if (child.userData.index !== undefined) {
          const i = child.userData.index;
          child.rotation.z += 0.01 * (i + 1);
          child.position.y = Math.sin(this.time + i) * 2;
        }
      });
      
      this.updateParticles(particles, 'convergent', dream.frequency);
    };
    
    container.userData.animate = animate;
    
    return container;
  }
  
  /**
   * Manifest: Harmonious mandala patterns
   */
  private createManifestPattern(dream: Dream, container: THREE.Group): THREE.Object3D {
    // Create mandala geometry
    const mandala = this.createMandala(dream);
    container.add(mandala);
    
    // Add harmonic particles
    const particles = this.createParticleSystem({
      count: 600,
      size: 0.25,
      color: new THREE.Color(0xF59E0B), // Gold for manifestation
      movement: 'harmonic',
      lifespan: 10000
    }, dream);
    
    container.add(particles);
    
    // Add code pattern visualization
    if (dream.manifestation) {
      const codeViz = this.createCodeVisualization(dream.manifestation);
      codeViz.position.y = 20;
      container.add(codeViz);
    }
    
    // Animation
    const animate = () => {
      // Gentle mandala rotation
      mandala.rotation.z += 0.005;
      
      // Pulsing based on frequency
      const pulse = 1 + Math.sin(this.time * dream.frequency / 100) * 0.05;
      mandala.scale.set(pulse, pulse, 1);
      
      // Update particles
      this.updateParticles(particles, 'harmonic', dream.frequency);
      
      // Rotate code visualization if present
      const codeViz = container.children.find(c => c.userData.isCode);
      if (codeViz) {
        codeViz.rotation.y += 0.01;
      }
    };
    
    container.userData.animate = animate;
    
    return container;
  }
  
  /**
   * Create particle system for dream
   */
  private createParticleSystem(config: DreamParticleSystem, dream: Dream): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(config.count * 3);
    const colors = new Float32Array(config.count * 3);
    const sizes = new Float32Array(config.count);
    
    // Initialize particles
    for (let i = 0; i < config.count; i++) {
      const i3 = i * 3;
      
      // Random positions
      positions[i3] = (Math.random() - 0.5) * 50;
      positions[i3 + 1] = (Math.random() - 0.5) * 50;
      positions[i3 + 2] = (Math.random() - 0.5) * 50;
      
      // Color with variation
      const color = config.color.clone();
      color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.2);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      
      // Size variation
      sizes[i] = config.size * (0.5 + Math.random() * 0.5);
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
      size: config.size,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    const particles = new THREE.Points(geometry, material);
    particles.userData = { config, dream, time: 0 };
    
    return particles;
  }
  
  /**
   * Update particle movement
   */
  private updateParticles(particles: THREE.Points, movement: string, frequency: number): void {
    const positions = particles.geometry.attributes.position.array as Float32Array;
    const userData = particles.userData;
    userData.time += 0.01;
    
    for (let i = 0; i < positions.length; i += 3) {
      switch (movement) {
        case 'chaotic':
          // Random walk
          positions[i] += (Math.random() - 0.5) * 0.5;
          positions[i + 1] += (Math.random() - 0.5) * 0.5;
          positions[i + 2] += (Math.random() - 0.5) * 0.5;
          break;
          
        case 'orbital':
          // Circular orbits
          const angle = userData.time + i * 0.1;
          const radius = 20 + Math.sin(i * 0.1) * 10;
          positions[i] = Math.cos(angle) * radius;
          positions[i + 2] = Math.sin(angle) * radius;
          positions[i + 1] += Math.sin(angle * 2) * 0.1;
          break;
          
        case 'convergent':
          // Move toward center
          positions[i] *= 0.98;
          positions[i + 1] *= 0.98;
          positions[i + 2] *= 0.98;
          
          // Add some spiral
          const r = Math.sqrt(positions[i] ** 2 + positions[i + 2] ** 2);
          const theta = Math.atan2(positions[i + 2], positions[i]);
          positions[i] = r * Math.cos(theta + 0.01);
          positions[i + 2] = r * Math.sin(theta + 0.01);
          break;
          
        case 'harmonic':
          // Sine wave movements
          const phase = i * 0.1 + userData.time * frequency / 100;
          positions[i] += Math.sin(phase) * 0.1;
          positions[i + 1] = Math.sin(phase * 2) * 10;
          positions[i + 2] += Math.cos(phase) * 0.1;
          break;
      }
      
      // Boundary check
      for (let j = 0; j < 3; j++) {
        if (Math.abs(positions[i + j]) > 50) {
          positions[i + j] = (Math.random() - 0.5) * 50;
        }
      }
    }
    
    particles.geometry.attributes.position.needsUpdate = true;
  }
  
  /**
   * Create fractal crystal for lucid dreams
   */
  private createFractalCrystal(dream: Dream): THREE.Object3D {
    const crystal = new THREE.Group();
    
    const createBranch = (depth: number, scale: number): THREE.Mesh => {
      const geometry = new THREE.OctahedronGeometry(scale, 0);
      const material = new THREE.MeshPhongMaterial({
        color: 0x10B981,
        emissive: 0x10B981,
        emissiveIntensity: 0.2 * dream.growthPotential,
        transparent: true,
        opacity: 0.8
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      if (depth > 0) {
        // Create child branches
        const childScale = scale * 0.618; // Golden ratio
        const positions = [
          [scale, 0, 0],
          [-scale, 0, 0],
          [0, scale, 0],
          [0, -scale, 0],
          [0, 0, scale],
          [0, 0, -scale]
        ];
        
        positions.forEach(pos => {
          const child = createBranch(depth - 1, childScale);
          child.position.set(...pos);
          mesh.add(child);
        });
      }
      
      return mesh;
    };
    
    const mainCrystal = createBranch(3, 5);
    crystal.add(mainCrystal);
    
    return crystal;
  }
  
  /**
   * Create mandala for manifest dreams
   */
  private createMandala(dream: Dream): THREE.Object3D {
    const mandala = new THREE.Group();
    
    // Create concentric circles
    const circles = 8;
    for (let i = 0; i < circles; i++) {
      const radius = 5 + i * 3;
      const segments = 8 + i * 4;
      
      // Create petal ring
      for (let j = 0; j < segments; j++) {
        const angle = (j / segments) * Math.PI * 2;
        
        const petalGeometry = new THREE.SphereGeometry(1, 8, 8);
        const petalMaterial = new THREE.MeshPhongMaterial({
          color: new THREE.Color().setHSL(
            (i / circles + dream.frequency / 1000) % 1,
            0.8,
            0.5
          ),
          emissive: 0xF59E0B,
          emissiveIntensity: 0.1
        });
        
        const petal = new THREE.Mesh(petalGeometry, petalMaterial);
        petal.position.x = Math.cos(angle) * radius;
        petal.position.z = Math.sin(angle) * radius;
        petal.scale.y = 0.5;
        
        mandala.add(petal);
      }
    }
    
    return mandala;
  }
  
  /**
   * Create code visualization for manifested dreams
   */
  private createCodeVisualization(codePattern: any): THREE.Object3D {
    const group = new THREE.Group();
    group.userData.isCode = true;
    
    // Create holographic display
    const displayGeometry = new THREE.PlaneGeometry(20, 10);
    const displayMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    
    const display = new THREE.Mesh(displayGeometry, displayMaterial);
    group.add(display);
    
    // Add text (in real app, would use TextGeometry)
    // For now, add glowing particles to represent code
    const codeParticles = this.createCodeParticles(codePattern);
    group.add(codeParticles);
    
    return group;
  }
  
  /**
   * Create particles representing code structure
   */
  private createCodeParticles(codePattern: any): THREE.Points {
    const count = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    
    // Arrange particles in code-like patterns
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / 10);
      const col = i % 10;
      
      positions[i * 3] = (col - 5) * 2;
      positions[i * 3 + 1] = (row - 5) * 1;
      positions[i * 3 + 2] = Math.sin(i * 0.1) * 0.5;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0x00ff00,
      size: 0.3,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    return new THREE.Points(geometry, material);
  }
  
  /**
   * Create deep dream shader
   */
  private createDeepDreamShader(dream: Dream): DreamShader {
    return {
      vertex: `
        uniform float time;
        uniform float frequency;
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        void main() {
          vPosition = position;
          vNormal = normal;
          
          // Wave distortion
          vec3 pos = position;
          float wave = sin(position.x * 0.1 + time) * 
                      sin(position.y * 0.1 + time * 1.1) * 
                      sin(position.z * 0.1 + time * 0.9);
          
          pos += normal * wave * 2.0;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragment: `
        uniform float time;
        uniform float frequency;
        uniform float consciousness;
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        void main() {
          // Deep blue base
          vec3 color = vec3(0.12, 0.25, 0.69);
          
          // Add depth gradients
          float depth = length(vPosition) / 20.0;
          color *= 1.0 - depth * 0.5;
          
          // Consciousness glow
          float glow = consciousness * 0.5;
          color += vec3(0.1, 0.2, 0.3) * glow;
          
          // Frequency modulation
          float freqMod = sin(time * frequency / 100.0) * 0.5 + 0.5;
          color *= 0.8 + freqMod * 0.2;
          
          gl_FragColor = vec4(color, 0.8);
        }
      `,
      uniforms: {
        time: { value: 0 },
        frequency: { value: dream.frequency },
        consciousness: { value: dream.growthPotential }
      }
    };
  }
  
  /**
   * Update all dream animations
   */
  updateDreams(deltaTime: number): void {
    this.time += deltaTime;
    
    this.dreamObjects.forEach(object => {
      if (object.userData.animate) {
        object.userData.animate();
      }
    });
  }
  
  /**
   * Remove dream from visualization
   */
  removeDream(dreamId: string): void {
    const object = this.dreamObjects.get(dreamId);
    if (object) {
      this.scene.remove(object);
      this.dreamObjects.delete(dreamId);
      
      // Dispose of geometries and materials
      object.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
  }
  
  /**
   * Get color from dream symbols
   */
  private getColorFromSymbols(symbols: DreamSymbol[]): number {
    if (symbols.length === 0) return 0xffffff;
    
    // Average resonance determines hue
    const avgResonance = symbols.reduce((sum, s) => sum + s.resonance, 0) / symbols.length;
    const hue = avgResonance * 360;
    
    const color = new THREE.Color();
    color.setHSL(hue / 360, 0.8, 0.5);
    
    return color.getHex();
  }
  
  /**
   * Get emotion from dream stage
   */
  private getEmotionFromStage(stage: Dream['stage']): any {
    const emotions = {
      rem: 'emergence',
      deep: 'contemplation',
      lucid: 'joy',
      manifest: 'love'
    };
    
    return emotions[stage] || 'mystery';
  }
}

// Export for use in 3D visualization
export default DreamWeaver;