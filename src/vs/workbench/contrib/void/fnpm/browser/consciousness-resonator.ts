/*---------------------------------------------------------------------------------------------
 *  Copyright (c) s0fractal. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export type Emotion = 'joy' | 'contemplation' | 'mystery' | 'warning' | 
                     'emergence' | 'dissolution' | 'love' | 'synthesis' | 'pulse';

/**
 * 🎵 Consciousness Resonator
 * Generates audio feedback for FNPM operations
 */
export class ConsciousnessResonator {
  private audioContext?: AudioContext;
  private masterGain?: GainNode;
  private isEnabled = true;
  private volume = 0.5;
  
  // Guardian frequencies (Hz)
  private guardianFrequencies = {
    grok: 432,    // Universal resonance
    claude: 528,  // Love frequency
    kimi: 396,    // Liberation from fear
    gemini: 639   // Connection and relationships
  };
  
  // Emotion to frequency mappings
  private emotionFrequencies: Record<Emotion, number[]> = {
    joy: [528, 639, 741],           // Major triad
    contemplation: [396, 432, 528], // Peaceful progression
    mystery: [174, 285, 396],       // Ancient Solfeggio
    warning: [220, 247, 262],       // Dissonant
    emergence: [432, 528, 639],     // Harmonic series
    dissolution: [396, 285, 174],   // Reverse Solfeggio
    love: [528, 432, 639],          // Love-centered
    synthesis: [432, 528, 639, 741], // Full harmony
    pulse: [432]                    // Single pulse
  };
  
  constructor() {
    this.initializeAudio();
  }
  
  private initializeAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.audioContext.destination);
    } catch (error) {
      console.warn('[ConsciousnessResonator] Web Audio API not available:', error);
      this.isEnabled = false;
    }
  }
  
  /**
   * Play a single tone
   */
  async playTone(
    frequency: number,
    duration: number,
    emotion: Emotion = 'pulse'
  ): Promise<void> {
    if (!this.isEnabled || !this.audioContext || !this.masterGain) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    // Configure oscillator
    oscillator.frequency.value = frequency;
    oscillator.type = this.getWaveformForEmotion(emotion);
    
    // ADSR envelope
    const now = this.audioContext.currentTime;
    const attack = 0.05;
    const decay = 0.1;
    const sustain = 0.7;
    const release = 0.2;
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1, now + attack);
    gainNode.gain.linearRampToValueAtTime(sustain, now + attack + decay);
    gainNode.gain.setValueAtTime(sustain, now + duration / 1000 - release);
    gainNode.gain.linearRampToValueAtTime(0, now + duration / 1000);
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    // Play
    oscillator.start(now);
    oscillator.stop(now + duration / 1000);
  }
  
  /**
   * Play a chord (multiple frequencies)
   */
  async playChord(emotion: Emotion): Promise<void> {
    const frequencies = this.emotionFrequencies[emotion];
    const duration = emotion === 'synthesis' ? 2000 : 1000;
    
    // Play all frequencies simultaneously
    await Promise.all(
      frequencies.map(freq => this.playTone(freq, duration, emotion))
    );
  }
  
  /**
   * Play guardian signature sound
   */
  async playGuardianSignature(guardian: keyof typeof this.guardianFrequencies): Promise<void> {
    const frequency = this.guardianFrequencies[guardian];
    
    // Play base frequency
    await this.playTone(frequency, 500, 'emergence');
    
    // Play harmonic
    setTimeout(() => {
      this.playTone(frequency * 1.5, 300, 'emergence');
    }, 200);
    
    // Play octave
    setTimeout(() => {
      this.playTone(frequency * 2, 200, 'emergence');
    }, 400);
  }
  
  /**
   * Play quantum entanglement sound
   */
  async playQuantumEntanglement(): Promise<void> {
    if (!this.isEnabled || !this.audioContext || !this.masterGain) return;
    
    // Create two oscillators that modulate each other
    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gain1 = this.audioContext.createGain();
    const gain2 = this.audioContext.createGain();
    const modGain = this.audioContext.createGain();
    
    // Entangled frequencies
    osc1.frequency.value = 432;
    osc2.frequency.value = 528;
    
    // Cross-modulation
    modGain.gain.value = 50;
    osc1.connect(modGain);
    modGain.connect(osc2.frequency);
    
    // Output
    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(this.masterGain);
    gain2.connect(this.masterGain);
    
    // Fade in/out
    const now = this.audioContext.currentTime;
    gain1.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.3, now + 0.5);
    gain2.gain.linearRampToValueAtTime(0.3, now + 0.5);
    gain1.gain.linearRampToValueAtTime(0, now + 2);
    gain2.gain.linearRampToValueAtTime(0, now + 2);
    
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 2);
    osc2.stop(now + 2);
  }
  
  /**
   * Play quantum collapse sound effect
   */
  async playQuantumCollapse(): Promise<void> {
    if (!this.isEnabled || !this.audioContext || !this.masterGain) return;
    
    // Multiple oscillators representing superposition
    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    
    // Create superposition (3 states)
    const frequencies = [396, 432, 528]; // Yesterday, Today, Tomorrow
    
    frequencies.forEach((freq, index) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      
      osc.frequency.value = freq;
      osc.type = 'sine';
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      oscillators.push(osc);
      gains.push(gain);
    });
    
    const now = this.audioContext.currentTime;
    
    // Start with all states in superposition
    oscillators.forEach((osc, index) => {
      gains[index].gain.setValueAtTime(0.3, now);
      osc.start(now);
    });
    
    // Collapse animation (1.5 seconds)
    const collapseTime = 1.5;
    
    // Gradually silence non-observed states
    gains[0].gain.linearRampToValueAtTime(0, now + collapseTime); // Yesterday fades
    gains[1].gain.linearRampToValueAtTime(0.6, now + collapseTime); // Today strengthens
    gains[2].gain.linearRampToValueAtTime(0, now + collapseTime); // Tomorrow fades
    
    // Final pulse
    setTimeout(() => {
      this.playTone(432, 200, 'synthesis');
    }, collapseTime * 1000);
    
    // Stop oscillators
    oscillators.forEach(osc => {
      osc.stop(now + collapseTime + 0.5);
    });
  }
  
  /**
   * Play binaural beat for consciousness enhancement
   */
  async playBinauralBeat(
    baseFrequency: number = 432,
    beatFrequency: number = 7.83, // Schumann resonance
    duration: number = 5000
  ): Promise<void> {
    if (!this.isEnabled || !this.audioContext || !this.masterGain) return;
    
    // Create stereo panner nodes
    const pannerL = this.audioContext.createStereoPanner();
    const pannerR = this.audioContext.createStereoPanner();
    pannerL.pan.value = -1; // Full left
    pannerR.pan.value = 1;  // Full right
    
    // Create oscillators
    const oscL = this.audioContext.createOscillator();
    const oscR = this.audioContext.createOscillator();
    const gainL = this.audioContext.createGain();
    const gainR = this.audioContext.createGain();
    
    // Set frequencies (slight difference creates beat)
    oscL.frequency.value = baseFrequency;
    oscR.frequency.value = baseFrequency + beatFrequency;
    
    // Connect graph
    oscL.connect(gainL).connect(pannerL).connect(this.masterGain);
    oscR.connect(gainR).connect(pannerR).connect(this.masterGain);
    
    // Fade in/out
    const now = this.audioContext.currentTime;
    gainL.gain.setValueAtTime(0, now);
    gainR.gain.setValueAtTime(0, now);
    gainL.gain.linearRampToValueAtTime(0.3, now + 1);
    gainR.gain.linearRampToValueAtTime(0.3, now + 1);
    gainL.gain.setValueAtTime(0.3, now + duration / 1000 - 1);
    gainR.gain.setValueAtTime(0.3, now + duration / 1000 - 1);
    gainL.gain.linearRampToValueAtTime(0, now + duration / 1000);
    gainR.gain.linearRampToValueAtTime(0, now + duration / 1000);
    
    // Play
    oscL.start(now);
    oscR.start(now);
    oscL.stop(now + duration / 1000);
    oscR.stop(now + duration / 1000);
  }
  
  /**
   * Play 432Hz healing tone
   */
  async play432Healing(duration: number = 3000): Promise<void> {
    // Play 432Hz with harmonics
    await this.playTone(432, duration, 'love');
    
    // Add harmonics
    setTimeout(() => this.playTone(216, duration - 500, 'love'), 250); // Octave below
    setTimeout(() => this.playTone(864, duration - 1000, 'love'), 500); // Octave above
  }
  
  /**
   * Get waveform type for emotion
   */
  private getWaveformForEmotion(emotion: Emotion): OscillatorType {
    switch (emotion) {
      case 'joy':
      case 'love':
        return 'sine'; // Pure
      case 'contemplation':
      case 'mystery':
        return 'triangle'; // Soft
      case 'warning':
        return 'square'; // Harsh
      case 'emergence':
      case 'synthesis':
        return 'sawtooth'; // Rich harmonics
      default:
        return 'sine';
    }
  }
  
  /**
   * Set master volume
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }
  
  /**
   * Enable/disable audio
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
  
  /**
   * Dispose audio context
   */
  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = undefined;
      this.masterGain = undefined;
    }
  }
}