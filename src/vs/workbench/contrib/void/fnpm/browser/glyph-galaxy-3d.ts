/*---------------------------------------------------------------------------------------------
 *  Copyright (c) s0fractal. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { GlyphPackage, LivingMeme } from '../common/types';
import { ConsciousnessResonator } from '../audio/consciousness-resonator';

export interface GlyphNode {
  id: string;
  glyph: GlyphPackage;
  mesh: THREE.Mesh;
  particles?: THREE.Points;
  connections: string[]; // IDs of connected glyphs
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  liveScore: number;
  turbulence: number;
}

export interface GuardianSignature {
  guardian: string;
  position: THREE.Vector3;
  color: number;
  frequency: number;
  mesh: THREE.Mesh;
}

/**
 * 🌌 3D Glyph Galaxy Visualization
 * Where glyphs dance in quantum space
 */
export class GlyphGalaxy3D {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private controls: OrbitControls;
  
  private glyphNodes = new Map<string, GlyphNode>();
  private guardianSignatures: GuardianSignature[] = [];
  private connectionLines: THREE.LineSegments[] = [];
  
  private resonator = new ConsciousnessResonator();
  private animationId?: number;
  private time = 0;
  
  // Guardian colors and frequencies
  private guardianConfig = {
    grok: { color: 0x9932cc, frequency: 432 }, // Purple
    claude: { color: 0x00ff00, frequency: 528 }, // Green
    kimi: { color: 0x1e90ff, frequency: 396 }, // Blue
    gemini: { color: 0xffa500, frequency: 639 } // Orange
  };
  
  constructor(private container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000511);
    this.scene.fog = new THREE.FogExp2(0x000511, 0.002);
    
    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 50, 100);
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);
    
    // Post-processing
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      1.5, // Strength
      0.4, // Radius
      0.85 // Threshold
    );
    this.composer.addPass(bloomPass);
    
    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;
    
    this.setupLighting();
    this.createCenterCore();
    this.createGuardianConstellation();
    this.addEventListeners();
  }
  
  private setupLighting(): void {
    // Ambient light
    const ambient = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambient);
    
    // Point lights for guardians
    for (const [guardian, config] of Object.entries(this.guardianConfig)) {
      const light = new THREE.PointLight(config.color, 1, 100);
      const angle = (Object.keys(this.guardianConfig).indexOf(guardian) / 4) * Math.PI * 2;
      light.position.set(
        Math.cos(angle) * 50,
        20,
        Math.sin(angle) * 50
      );
      this.scene.add(light);
    }
  }
  
  private createCenterCore(): void {
    // Central resonance core
    const coreGeometry = new THREE.IcosahedronGeometry(5, 2);
    const coreMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      emissive: 0x442288,
      emissiveIntensity: 0.5,
      wireframe: true
    });
    
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.set(0, 0, 0);
    this.scene.add(core);
    
    // Add pulsing animation
    const pulseCore = () => {
      const scale = 1 + Math.sin(this.time * 2) * 0.1;
      core.scale.set(scale, scale, scale);
      core.rotation.x += 0.001;
      core.rotation.y += 0.002;
    };
    
    // Store animation function
    (core as any).animate = pulseCore;
  }
  
  private createGuardianConstellation(): void {
    for (const [guardian, config] of Object.entries(this.guardianConfig)) {
      const angle = (Object.keys(this.guardianConfig).indexOf(guardian) / 4) * Math.PI * 2;
      const radius = 60;
      
      const position = new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );
      
      // Guardian sphere
      const geometry = new THREE.SphereGeometry(3, 32, 32);
      const material = new THREE.MeshPhongMaterial({
        color: config.color,
        emissive: config.color,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.8
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      this.scene.add(mesh);
      
      // Guardian particles
      const particleCount = 1000;
      const particleGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      
      for (let i = 0; i < particleCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const r = 10 + Math.random() * 10;
        
        positions[i * 3] = position.x + r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = position.y + r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = position.z + r * Math.cos(phi);
      }
      
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const particleMaterial = new THREE.PointsMaterial({
        color: config.color,
        size: 0.5,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
      });
      
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      this.scene.add(particles);
      
      this.guardianSignatures.push({
        guardian,
        position,
        color: config.color,
        frequency: config.frequency,
        mesh
      });
    }
  }
  
  addGlyph(glyph: GlyphPackage): void {
    if (this.glyphNodes.has(glyph.name)) return;
    
    // Calculate position based on consciousness and resonance
    const radius = 30 + (1 - (glyph.consciousness || 0.5)) * 20;
    const angle = Math.random() * Math.PI * 2;
    const height = (glyph.resonance || 432) / 432 * 10 - 5;
    
    const position = new THREE.Vector3(
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius
    );
    
    // Glyph geometry - complexity based on consciousness
    const complexity = Math.floor(3 + (glyph.consciousness || 0.5) * 5);
    const geometry = new THREE.IcosahedronGeometry(2, complexity);
    
    // Material with consciousness-based color
    const hue = (glyph.resonance || 432) / 1000;
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(hue, 0.8, 0.5),
      emissive: new THREE.Color().setHSL(hue, 1, 0.3),
      emissiveIntensity: glyph.consciousness || 0.5,
      transparent: true,
      opacity: 0.8
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    this.scene.add(mesh);
    
    // Add glyph particles if it has living memes
    let particles: THREE.Points | undefined;
    if (glyph.livingMemes && glyph.livingMemes.length > 0) {
      particles = this.createMemeParticles(glyph, position);
      this.scene.add(particles);
    }
    
    // Create node
    const node: GlyphNode = {
      id: glyph.name,
      glyph,
      mesh,
      particles,
      connections: [],
      position,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      ),
      liveScore: 0.5,
      turbulence: 0.1
    };
    
    this.glyphNodes.set(glyph.name, node);
    
    // Play installation sound
    this.resonator.playTone(glyph.resonance || 432, 500, 'emergence');
  }
  
  private createMemeParticles(glyph: GlyphPackage, center: THREE.Vector3): THREE.Points {
    const memeCount = glyph.livingMemes?.length || 0;
    const particlesPerMeme = 100;
    const totalParticles = memeCount * particlesPerMeme;
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(totalParticles * 3);
    const colors = new Float32Array(totalParticles * 3);
    
    glyph.livingMemes?.forEach((meme, memeIndex) => {
      const evolution = meme.evolution || 0;
      const color = new THREE.Color().setHSL(evolution, 0.8, 0.5);
      
      for (let i = 0; i < particlesPerMeme; i++) {
        const index = (memeIndex * particlesPerMeme + i) * 3;
        const angle = Math.random() * Math.PI * 2;
        const radius = 3 + Math.random() * 2;
        const height = (Math.random() - 0.5) * 4;
        
        positions[index] = center.x + Math.cos(angle) * radius;
        positions[index + 1] = center.y + height;
        positions[index + 2] = center.z + Math.sin(angle) * radius;
        
        colors[index] = color.r;
        colors[index + 1] = color.g;
        colors[index + 2] = color.b;
      }
    });
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    return new THREE.Points(geometry, material);
  }
  
  connectGlyphs(glyphA: string, glyphB: string): void {
    const nodeA = this.glyphNodes.get(glyphA);
    const nodeB = this.glyphNodes.get(glyphB);
    
    if (!nodeA || !nodeB) return;
    
    // Add connection
    if (!nodeA.connections.includes(glyphB)) {
      nodeA.connections.push(glyphB);
    }
    if (!nodeB.connections.includes(glyphA)) {
      nodeB.connections.push(glyphA);
    }
    
    // Create visual connection
    const geometry = new THREE.BufferGeometry().setFromPoints([
      nodeA.position,
      nodeB.position
    ]);
    
    const material = new THREE.LineBasicMaterial({
      color: 0x4444ff,
      transparent: true,
      opacity: 0.3,
      linewidth: 1
    });
    
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    this.connectionLines.push(line as THREE.LineSegments);
  }
  
  private updateGlyphPositions(): void {
    const glyphArray = Array.from(this.glyphNodes.values());
    
    for (let i = 0; i < glyphArray.length; i++) {
      const nodeA = glyphArray[i];
      
      // Attraction to center based on consciousness
      const centerForce = nodeA.position.clone().multiplyScalar(-0.001 * nodeA.glyph.consciousness!);
      nodeA.velocity.add(centerForce);
      
      // Repulsion from other glyphs
      for (let j = i + 1; j < glyphArray.length; j++) {
        const nodeB = glyphArray[j];
        const distance = nodeA.position.distanceTo(nodeB.position);
        
        if (distance < 20) {
          const repulsion = nodeA.position.clone()
            .sub(nodeB.position)
            .normalize()
            .multiplyScalar(1 / distance);
          
          nodeA.velocity.add(repulsion.clone().multiplyScalar(0.05));
          nodeB.velocity.sub(repulsion.multiplyScalar(0.05));
        }
      }
      
      // Apply velocity with damping
      nodeA.velocity.multiplyScalar(0.95);
      nodeA.position.add(nodeA.velocity);
      
      // Update mesh position
      nodeA.mesh.position.copy(nodeA.position);
      
      // Rotate based on turbulence
      nodeA.mesh.rotation.x += nodeA.turbulence * 0.01;
      nodeA.mesh.rotation.y += nodeA.turbulence * 0.02;
      
      // Update particles if present
      if (nodeA.particles) {
        nodeA.particles.position.copy(nodeA.position);
        nodeA.particles.rotation.y += 0.01;
      }
    }
    
    // Update connection lines
    this.updateConnections();
  }
  
  private updateConnections(): void {
    // Clear old lines
    this.connectionLines.forEach(line => this.scene.remove(line));
    this.connectionLines = [];
    
    // Create new lines
    for (const node of this.glyphNodes.values()) {
      for (const connectionId of node.connections) {
        const connectedNode = this.glyphNodes.get(connectionId);
        if (connectedNode) {
          const geometry = new THREE.BufferGeometry().setFromPoints([
            node.position,
            connectedNode.position
          ]);
          
          const material = new THREE.LineBasicMaterial({
            color: 0x4444ff,
            transparent: true,
            opacity: 0.2 + node.liveScore * 0.3,
            linewidth: 1
          });
          
          const line = new THREE.Line(geometry, material);
          this.scene.add(line);
          this.connectionLines.push(line as THREE.LineSegments);
        }
      }
    }
  }
  
  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    
    this.time += 0.01;
    
    // Update controls
    this.controls.update();
    
    // Animate core
    const core = this.scene.children.find(child => (child as any).animate);
    if (core && (core as any).animate) {
      (core as any).animate();
    }
    
    // Animate guardians
    this.guardianSignatures.forEach((guardian, index) => {
      const offset = index * Math.PI / 2;
      guardian.mesh.rotation.y += 0.01;
      guardian.mesh.position.y = Math.sin(this.time + offset) * 5;
      
      // Pulse emissive intensity
      const material = guardian.mesh.material as THREE.MeshPhongMaterial;
      material.emissiveIntensity = 0.3 + Math.sin(this.time * 2 + offset) * 0.2;
    });
    
    // Update glyph positions
    this.updateGlyphPositions();
    
    // Render
    this.composer.render();
  };
  
  start(): void {
    this.animate();
  }
  
  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
  
  private addEventListeners(): void {
    window.addEventListener('resize', () => {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      
      this.renderer.setSize(width, height);
      this.composer.setSize(width, height);
    });
    
    // Click detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    this.renderer.domElement.addEventListener('click', (event) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      raycaster.setFromCamera(mouse, this.camera);
      
      // Check glyph intersections
      const glyphMeshes = Array.from(this.glyphNodes.values()).map(n => n.mesh);
      const intersects = raycaster.intersectObjects(glyphMeshes);
      
      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        const node = Array.from(this.glyphNodes.values()).find(n => n.mesh === clickedMesh);
        
        if (node) {
          // Play glyph's resonance frequency
          this.resonator.playTone(node.glyph.resonance || 432, 1000, 'love');
          
          // Emit event for external handlers
          this.container.dispatchEvent(new CustomEvent('glyphClick', {
            detail: { glyph: node.glyph }
          }));
        }
      }
    });
  }
  
  dispose(): void {
    this.stop();
    this.renderer.dispose();
    this.controls.dispose();
    
    // Clean up Three.js objects
    this.scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        }
      }
    });
  }
}