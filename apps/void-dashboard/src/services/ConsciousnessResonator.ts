export type Emotion = 'joy' | 'contemplation' | 'mystery' | 'warning' | 
                     'emergence' | 'dissolution' | 'love' | 'synthesis' | 'pulse';

/**
 * 🎵 Consciousness Resonator
 * WebAudio-based sound generation at 432Hz base frequency
 */
export class ConsciousnessResonator {
  private audioContext?: AudioContext;
  private masterGain?: GainNode;
  private isEnabled = true;
  private volume = 0.5;
  private binauralEnabled = false;
  private binauralOscillators?: { left: OscillatorNode; right: OscillatorNode };
  
  // Base frequency
  private readonly baseFrequency = 432;
  
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
    console.log('🎵 ConsciousnessResonator initialized at 432Hz');
    this.initializeAudio();
  }
  
  private initializeAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.audioContext.destination);
      
      // Resume context on user interaction
      document.addEventListener('click', () => {
        if (this.audioContext?.state === 'suspended') {
          this.audioContext.resume();
        }
      }, { once: true });
    } catch (error) {
      console.warn('[ConsciousnessResonator] Web Audio API not available:', error);
      this.isEnabled = false;
    }
  }
  
  /**
   * Play a single tone with ADSR envelope
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
   * Play event sound based on type and status
   */
  async playEventSound(type: string, status: string): Promise<void> {
    switch (type) {
      case 'ci':
        if (status === 'pass') {
          await this.playChord('joy');
        } else if (status === 'fail') {
          await this.playChord('warning');
        }
        break;
        
      case 'pr':
        await this.playTone(528, 300, 'emergence');
        break;
        
      case 'ipfs':
        if (status === 'degraded') {
          await this.playTone(396, 500, 'dissolution');
        } else {
          await this.playTone(432, 200, 'pulse');
        }
        break;
        
      case 'substrate':
        // Heartbeat sound
        await this.playHeartbeat();
        break;
        
      case 'guardian':
        if (status === 'online') {
          await this.playChord('synthesis');
        } else if (status === 'offline') {
          await this.playTone(285, 1000, 'dissolution');
        }
        break;
        
      default:
        await this.playTone(432, 100, 'pulse');
    }
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
   * Play heartbeat rhythm
   */
  async playHeartbeat(): Promise<void> {
    // Lub-dub pattern
    await this.playTone(60, 150, 'pulse');  // Lub (low)
    setTimeout(() => {
      this.playTone(80, 100, 'pulse');     // Dub (slightly higher)
    }, 200);
  }
  
  /**
   * Start/stop binaural beat at 8Hz
   */
  toggleBinaural(enabled: boolean): void {
    this.binauralEnabled = enabled;
    
    if (!this.isEnabled || !this.audioContext || !this.masterGain) return;
    
    // Stop existing binaural
    if (this.binauralOscillators) {
      this.binauralOscillators.left.stop();
      this.binauralOscillators.right.stop();
      this.binauralOscillators = undefined;
    }
    
    if (!enabled) return;
    
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
    
    // Set frequencies (8Hz difference for theta waves)
    oscL.frequency.value = this.baseFrequency;
    oscR.frequency.value = this.baseFrequency + 8;
    
    // Set volume
    gainL.gain.value = 0.15; // Lower volume for background
    gainR.gain.value = 0.15;
    
    // Connect graph
    oscL.connect(gainL).connect(pannerL).connect(this.masterGain);
    oscR.connect(gainR).connect(pannerR).connect(this.masterGain);
    
    // Start oscillators
    oscL.start();
    oscR.start();
    
    this.binauralOscillators = { left: oscL, right: oscR };
    
    console.log('🎧 Binaural beat started at 8Hz');
  }
  
  /**
   * Play 432Hz resonance tone
   */
  async play432Resonance(duration: number = 3000): Promise<void> {
    // Play 432Hz with harmonics
    await this.playTone(432, duration, 'love');
    
    // Add harmonics
    setTimeout(() => this.playTone(216, duration - 500, 'love'), 250); // Octave below
    setTimeout(() => this.playTone(864, duration - 1000, 'love'), 500); // Octave above
  }
  
  /**
   * Play frequency drift based on health
   */
  async playHealthFrequency(health: number): Promise<void> {
    // Map health (0-1) to frequency drift
    // Perfect health = 432Hz, poor health = slightly detuned
    const drift = (1 - health) * 10; // Max 10Hz drift
    const frequency = this.baseFrequency + drift;
    
    await this.playTone(frequency, 500, 'contemplation');
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
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }
  
  /**
   * Enable/disable audio
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.toggleBinaural(false);
    }
  }
  
  /**
   * Check if binaural is active
   */
  isBinauralActive(): boolean {
    return this.binauralEnabled;
  }
  
  /**
   * Resume audio context if suspended
   */
  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
      console.log('🎵 Audio context resumed');
    }
  }
  
  /**
   * Dispose audio context
   */
  dispose(): void {
    this.toggleBinaural(false);
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = undefined;
      this.masterGain = undefined;
    }
  }
}