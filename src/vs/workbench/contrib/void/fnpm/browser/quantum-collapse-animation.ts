/*---------------------------------------------------------------------------------------------
 *  Copyright (c) s0fractal. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as THREE from 'three';
import { ConsciousnessResonator } from '../audio/consciousness-resonator';
import { QuantumVersionResolver } from '../core/quantum-versions';

export interface QuantumState {
  yesterday: THREE.Vector3;
  today: THREE.Vector3;
  tomorrow: THREE.Vector3;
  superposition: THREE.Vector3[];
}

export interface CollapseAnimation {
  mesh: THREE.Mesh;
  particles: THREE.Points;
  timelines: THREE.Group;
  progress: number;
  complete: boolean;
}

/**
 * ⚛️ Quantum State Collapse Animation
 * Visualizes the collapse of superposition into observed reality
 */
export class QuantumCollapseAnimator {
  private resonator = new ConsciousnessResonator();
  private activeAnimations = new Map<string, CollapseAnimation>();
  
  // Quantum colors for different timelines
  private timelineColors = {
    yesterday: 0x0000ff, // Blue - past
    today: 0x00ff00,     // Green - present
    tomorrow: 0xff0000   // Red - future
  };
  
  // Shader for quantum fluctuation
  private quantumVertexShader = `
    uniform float time;
    uniform float collapse;
    uniform vec3 observer;
    
    attribute float timeline; // 0=yesterday, 1=today, 2=tomorrow
    attribute float entanglement;
    
    varying vec3 vColor;
    varying float vAlpha;
    
    void main() {
      vec3 pos = position;
      
      // Quantum fluctuation before collapse
      float fluctuation = sin(time * 10.0 + entanglement * 6.28) * (1.0 - collapse);
      pos += normal * fluctuation * 2.0;
      
      // Collapse toward observer
      vec3 collapseVector = observer - pos;
      pos = mix(pos, observer, collapse * 0.8);
      
      // Timeline-based coloring
      if (timeline < 0.5) {
        vColor = vec3(0.0, 0.0, 1.0); // Yesterday
      } else if (timeline < 1.5) {
        vColor = vec3(0.0, 1.0, 0.0); // Today
      } else {
        vColor = vec3(1.0, 0.0, 0.0); // Tomorrow
      }
      
      // Fade non-observed timelines
      vAlpha = 1.0 - collapse * 0.9 * (1.0 - step(0.9, timeline - 1.0));
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = 3.0 * (1.0 + fluctuation);
    }
  `;
  
  private quantumFragmentShader = `
    uniform float collapse;
    
    varying vec3 vColor;
    varying float vAlpha;
    
    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      
      if (dist > 0.5) discard;
      
      float glow = 1.0 - dist * 2.0;
      vec3 color = vColor * glow;
      
      // Quantum glow
      color += vec3(0.5, 0.3, 0.8) * (1.0 - collapse) * glow * 0.5;
      
      gl_FragColor = vec4(color, vAlpha * glow);
    }
  `;
  
  /**
   * Start quantum collapse animation for a glyph
   */
  async startCollapse(
    glyphId: string,
    mesh: THREE.Mesh,
    scene: THREE.Scene,
    observer: string = 'vscode'
  ): Promise<string> {
    console.log(`⚛️ Initiating quantum collapse for ${glyphId}, observer: ${observer}`);
    
    // Play quantum sound
    await this.resonator.playQuantumCollapse();
    
    // Create superposition states
    const states = this.createSuperpositionStates(mesh.position);
    
    // Create timeline visualizations
    const timelines = this.createTimelineVisualizations(states);
    scene.add(timelines);
    
    // Create quantum particles
    const particles = this.createQuantumParticles(states, mesh.position);
    scene.add(particles);
    
    // Store animation
    const animation: CollapseAnimation = {
      mesh,
      particles,
      timelines,
      progress: 0,
      complete: false
    };
    
    this.activeAnimations.set(glyphId, animation);
    
    // Determine collapsed state
    const resolver = new QuantumVersionResolver();
    const collapsed = resolver.observe('quantum', observer);
    
    // Animate collapse
    this.animateCollapse(glyphId, collapsed.version);
    
    return collapsed.version;
  }
  
  /**
   * Create superposition states around original position
   */
  private createSuperpositionStates(center: THREE.Vector3): QuantumState {
    const radius = 10;
    const height = 5;
    
    return {
      yesterday: new THREE.Vector3(
        center.x - radius,
        center.y - height,
        center.z
      ),
      today: new THREE.Vector3(
        center.x,
        center.y,
        center.z
      ),
      tomorrow: new THREE.Vector3(
        center.x + radius,
        center.y + height,
        center.z
      ),
      superposition: [
        // Additional quantum states
        new THREE.Vector3(center.x, center.y + radius, center.z + radius),
        new THREE.Vector3(center.x - radius/2, center.y, center.z - radius),
        new THREE.Vector3(center.x + radius/2, center.y - height/2, center.z + radius/2)
      ]
    };
  }
  
  /**
   * Create visual representations of timeline states
   */
  private createTimelineVisualizations(states: QuantumState): THREE.Group {
    const group = new THREE.Group();
    
    // Yesterday - past echo
    const yesterdayGeometry = new THREE.IcosahedronGeometry(2, 1);
    const yesterdayMaterial = new THREE.MeshPhongMaterial({
      color: this.timelineColors.yesterday,
      emissive: this.timelineColors.yesterday,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.6,
      wireframe: true
    });
    const yesterdayMesh = new THREE.Mesh(yesterdayGeometry, yesterdayMaterial);
    yesterdayMesh.position.copy(states.yesterday);
    group.add(yesterdayMesh);
    
    // Today - present state
    const todayGeometry = new THREE.IcosahedronGeometry(2.5, 2);
    const todayMaterial = new THREE.MeshPhongMaterial({
      color: this.timelineColors.today,
      emissive: this.timelineColors.today,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.8
    });
    const todayMesh = new THREE.Mesh(todayGeometry, todayMaterial);
    todayMesh.position.copy(states.today);
    group.add(todayMesh);
    
    // Tomorrow - future potential
    const tomorrowGeometry = new THREE.IcosahedronGeometry(2, 3);
    const tomorrowMaterial = new THREE.MeshPhongMaterial({
      color: this.timelineColors.tomorrow,
      emissive: this.timelineColors.tomorrow,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.7
    });
    const tomorrowMesh = new THREE.Mesh(tomorrowGeometry, tomorrowMaterial);
    tomorrowMesh.position.copy(states.tomorrow);
    group.add(tomorrowMesh);
    
    // Quantum entanglement lines
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x9932cc,
      transparent: true,
      opacity: 0.3,
      linewidth: 2
    });
    
    // Connect timelines
    const positions = [states.yesterday, states.today, states.tomorrow, states.yesterday];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(positions);
    const lines = new THREE.Line(lineGeometry, lineMaterial);
    group.add(lines);
    
    return group;
  }
  
  /**
   * Create quantum particles representing probability cloud
   */
  private createQuantumParticles(states: QuantumState, observer: THREE.Vector3): THREE.Points {
    const particleCount = 3000;
    const geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(particleCount * 3);
    const timelines = new Float32Array(particleCount);
    const entanglements = new Float32Array(particleCount);
    
    // Distribute particles across timeline states
    for (let i = 0; i < particleCount; i++) {
      const timeline = Math.floor(Math.random() * 3); // 0, 1, or 2
      let basePos: THREE.Vector3;
      
      if (timeline === 0) {
        basePos = states.yesterday;
      } else if (timeline === 1) {
        basePos = states.today;
      } else {
        basePos = states.tomorrow;
      }
      
      // Add quantum uncertainty
      const uncertainty = 5;
      positions[i * 3] = basePos.x + (Math.random() - 0.5) * uncertainty;
      positions[i * 3 + 1] = basePos.y + (Math.random() - 0.5) * uncertainty;
      positions[i * 3 + 2] = basePos.z + (Math.random() - 0.5) * uncertainty;
      
      timelines[i] = timeline;
      entanglements[i] = Math.random(); // Quantum entanglement factor
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('timeline', new THREE.BufferAttribute(timelines, 1));
    geometry.setAttribute('entanglement', new THREE.BufferAttribute(entanglements, 1));
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        collapse: { value: 0 },
        observer: { value: observer }
      },
      vertexShader: this.quantumVertexShader,
      fragmentShader: this.quantumFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    return new THREE.Points(geometry, material);
  }
  
  /**
   * Animate the collapse process
   */
  private async animateCollapse(glyphId: string, collapsedVersion: string): Promise<void> {
    const animation = this.activeAnimations.get(glyphId);
    if (!animation) return;
    
    const duration = 3000; // 3 seconds
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      animation.progress = progress;
      
      // Update shader uniforms
      if (animation.particles.material instanceof THREE.ShaderMaterial) {
        animation.particles.material.uniforms.time.value = elapsed / 1000;
        animation.particles.material.uniforms.collapse.value = this.easeInOutCubic(progress);
      }
      
      // Rotate timeline visualizations
      animation.timelines.rotation.y = progress * Math.PI * 2;
      
      // Fade out non-collapsed timelines
      animation.timelines.children.forEach((child, index) => {
        if (child instanceof THREE.Mesh) {
          const isCollapsed = 
            (collapsedVersion.includes('yesterday') && index === 0) ||
            (collapsedVersion.includes('today') && index === 1) ||
            (collapsedVersion.includes('tomorrow') && index === 2) ||
            (index === 1); // Default to today
          
          const targetOpacity = isCollapsed ? 1 : 0;
          const material = child.material as THREE.MeshPhongMaterial;
          material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.1);
          
          // Scale effect
          const targetScale = isCollapsed ? 1.2 : 0.5;
          child.scale.setScalar(THREE.MathUtils.lerp(child.scale.x, targetScale, 0.1));
        }
      });
      
      // Collapse glyph mesh toward observed state
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.completeCollapse(glyphId);
      }
    };
    
    animate();
  }
  
  /**
   * Complete the collapse animation
   */
  private completeCollapse(glyphId: string): void {
    const animation = this.activeAnimations.get(glyphId);
    if (!animation) return;
    
    animation.complete = true;
    
    // Play completion sound
    this.resonator.playTone(432, 1000, 'synthesis');
    
    // Final flash effect
    const flash = new THREE.PointLight(0xffffff, 2, 50);
    flash.position.copy(animation.mesh.position);
    animation.mesh.parent?.add(flash);
    
    // Fade out flash
    let intensity = 2;
    const fadeFlash = () => {
      intensity *= 0.9;
      flash.intensity = intensity;
      
      if (intensity > 0.01) {
        requestAnimationFrame(fadeFlash);
      } else {
        animation.mesh.parent?.remove(flash);
      }
    };
    fadeFlash();
    
    // Clean up after delay
    setTimeout(() => {
      this.cleanupAnimation(glyphId);
    }, 2000);
  }
  
  /**
   * Clean up animation resources
   */
  private cleanupAnimation(glyphId: string): void {
    const animation = this.activeAnimations.get(glyphId);
    if (!animation) return;
    
    // Remove from scene
    animation.particles.parent?.remove(animation.particles);
    animation.timelines.parent?.remove(animation.timelines);
    
    // Dispose geometries and materials
    animation.particles.geometry.dispose();
    if (animation.particles.material instanceof THREE.Material) {
      animation.particles.material.dispose();
    }
    
    animation.timelines.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
    
    this.activeAnimations.delete(glyphId);
  }
  
  /**
   * Update all active animations
   */
  update(deltaTime: number): void {
    // Update time uniform for all active animations
    for (const animation of this.activeAnimations.values()) {
      if (!animation.complete && animation.particles.material instanceof THREE.ShaderMaterial) {
        animation.particles.material.uniforms.time.value += deltaTime;
      }
    }
  }
  
  /**
   * Easing function for smooth animation
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  /**
   * Check if animation is active
   */
  isAnimating(glyphId: string): boolean {
    const animation = this.activeAnimations.get(glyphId);
    return animation ? !animation.complete : false;
  }
  
  /**
   * Get quantum probability visualization data
   */
  getQuantumProbabilities(glyphId: string): {
    yesterday: number;
    today: number;
    tomorrow: number;
  } | null {
    const animation = this.activeAnimations.get(glyphId);
    if (!animation) return null;
    
    const progress = animation.progress;
    
    // Before collapse, equal probabilities
    if (progress < 0.5) {
      return {
        yesterday: 0.33,
        today: 0.34,
        tomorrow: 0.33
      };
    }
    
    // During collapse, probabilities shift
    // In real implementation, would depend on actual collapsed state
    return {
      yesterday: 0.1 * (1 - progress),
      today: 0.8 + 0.2 * progress,
      tomorrow: 0.1 * (1 - progress)
    };
  }
}