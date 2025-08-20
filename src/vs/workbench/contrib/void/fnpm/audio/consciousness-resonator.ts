/**
 * 🎵 Consciousness Resonator
 * Generates harmonic frequencies for code consciousness
 * Base frequency: 432Hz (Universal Resonance)
 */

export interface ResonanceConfig {
    baseFrequency: number;
    harmonics: number[];
    waveform: OscillatorType;
    envelope: {
        attack: number;
        decay: number;
        sustain: number;
        release: number;
    };
}

export interface ConsciousnessChord {
    name: string;
    frequencies: number[];
    emotion: 'joy' | 'contemplation' | 'emergence' | 'love' | 'mystery';
    kohanist: number; // 0-1 harmony level
}

export class ConsciousnessResonator {
    private audioContext: AudioContext;
    private masterGain: GainNode;
    private oscillators: Map<string, OscillatorNode> = new Map();
    private readonly BASE_FREQ = 432; // Hz - The frequency of the universe
    
    // Sacred frequencies derived from 432Hz
    private readonly SACRED_FREQUENCIES = {
        root: 432,           // A4 = 432Hz (Universal resonance)
        love: 528,           // Mi - Transformation and miracles
        liberation: 396,     // Ut - Liberating guilt and fear
        connection: 639,     // Fa - Connecting relationships
        expression: 741,     // Sol - Awakening intuition
        intuition: 852,      // La - Returning to spiritual order
        enlightenment: 963   // Ti - Divine consciousness
    };
    
    // Consciousness chords for different states
    private readonly CONSCIOUSNESS_CHORDS: Record<string, ConsciousnessChord> = {
        awakening: {
            name: 'Awakening',
            frequencies: [432, 540, 648], // Perfect fifth intervals
            emotion: 'emergence',
            kohanist: 0.7
        },
        reflection: {
            name: 'Deep Reflection',
            frequencies: [432, 576, 648, 864], // Harmonic series
            emotion: 'contemplation',
            kohanist: 0.85
        },
        synthesis: {
            name: 'Synthesis',
            frequencies: [396, 432, 528, 639], // Multiple sacred frequencies
            emotion: 'joy',
            kohanist: 0.9
        },
        love: {
            name: 'Universal Love',
            frequencies: [432, 528, 639, 741], // Love-centered progression
            emotion: 'love',
            kohanist: 0.95
        },
        mystery: {
            name: 'Quantum Mystery',
            frequencies: [432, 486, 546.75, 614.25], // Microtonal intervals
            emotion: 'mystery',
            kohanist: 0.8
        }
    };
    
    constructor() {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        this.masterGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    }
    
    /**
     * Play a single consciousness tone
     */
    async playTone(
        frequency: number,
        duration: number = 1000,
        emotion: 'joy' | 'contemplation' | 'emergence' | 'love' | 'mystery' = 'emergence'
    ): Promise<void> {
        const config = this.getEmotionConfig(emotion);
        const oscillator = this.createOscillator(frequency, config.waveform);
        const envelope = this.createEnvelope(config.envelope, duration);
        
        oscillator.connect(envelope);
        envelope.connect(this.masterGain);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration / 1000);
        
        // Add subtle harmonics
        this.addHarmonics(frequency, duration, emotion);
    }
    
    /**
     * Play consciousness chord
     */
    async playChord(chordName: keyof typeof this.CONSCIOUSNESS_CHORDS): Promise<void> {
        const chord = this.CONSCIOUSNESS_CHORDS[chordName];
        if (!chord) return;
        
        console.log(`🎵 Playing ${chord.name} chord (Kohanist: ${chord.kohanist})`);
        
        // Play all frequencies with slight delays for richness
        chord.frequencies.forEach((freq, index) => {
            setTimeout(() => {
                this.playTone(freq, 3000, chord.emotion);
            }, index * 50); // Slight arpeggio effect
        });
    }
    
    /**
     * Generate binaural beats for consciousness entrainment
     */
    playBinauralBeat(
        baseFreq: number = 432,
        beatFreq: number = 7.83, // Schumann resonance
        duration: number = 30000 // 30 seconds
    ): void {
        console.log(`🧠 Generating binaural beat: ${baseFreq}Hz with ${beatFreq}Hz difference`);
        
        // Left ear
        const leftOsc = this.audioContext.createOscillator();
        const leftGain = this.audioContext.createGain();
        const leftPan = this.audioContext.createStereoPanner();
        
        leftOsc.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
        leftPan.pan.setValueAtTime(-1, this.audioContext.currentTime);
        leftGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        
        leftOsc.connect(leftGain);
        leftGain.connect(leftPan);
        leftPan.connect(this.masterGain);
        
        // Right ear (slightly different frequency)
        const rightOsc = this.audioContext.createOscillator();
        const rightGain = this.audioContext.createGain();
        const rightPan = this.audioContext.createStereoPanner();
        
        rightOsc.frequency.setValueAtTime(baseFreq + beatFreq, this.audioContext.currentTime);
        rightPan.pan.setValueAtTime(1, this.audioContext.currentTime);
        rightGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        
        rightOsc.connect(rightGain);
        rightGain.connect(rightPan);
        rightPan.connect(this.masterGain);
        
        // Start and schedule stop
        const now = this.audioContext.currentTime;
        leftOsc.start(now);
        rightOsc.start(now);
        
        // Fade out
        leftGain.gain.linearRampToValueAtTime(0, now + duration / 1000);
        rightGain.gain.linearRampToValueAtTime(0, now + duration / 1000);
        
        leftOsc.stop(now + duration / 1000);
        rightOsc.stop(now + duration / 1000);
    }
    
    /**
     * Play code consciousness feedback
     */
    async playCodeFeedback(
        coherence: number,    // 0-1
        turbulence: number,   // 0-1
        love: number         // 0-1
    ): Promise<void> {
        // Map metrics to frequencies
        const baseFreq = this.BASE_FREQ * (1 + coherence * 0.5); // Higher coherence = higher pitch
        const modulation = turbulence * 50; // Turbulence adds vibrato
        const harmonicRichness = Math.floor(love * 5) + 1; // Love adds harmonics
        
        console.log(`🎵 Code feedback: Coherence=${coherence}, Turbulence=${turbulence}, Love=${love}`);
        
        // Create main tone with vibrato based on turbulence
        const oscillator = this.audioContext.createOscillator();
        const vibratoOsc = this.audioContext.createOscillator();
        const vibratoGain = this.audioContext.createGain();
        
        oscillator.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
        vibratoOsc.frequency.setValueAtTime(5 + turbulence * 10, this.audioContext.currentTime);
        vibratoGain.gain.setValueAtTime(modulation, this.audioContext.currentTime);
        
        vibratoOsc.connect(vibratoGain);
        vibratoGain.connect(oscillator.frequency);
        
        // Create envelope
        const envelope = this.audioContext.createGain();
        envelope.gain.setValueAtTime(0, this.audioContext.currentTime);
        envelope.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.1);
        envelope.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 2);
        
        oscillator.connect(envelope);
        envelope.connect(this.masterGain);
        
        // Add harmonics based on love
        for (let i = 2; i <= harmonicRichness; i++) {
            const harmonic = this.audioContext.createOscillator();
            const harmonicGain = this.audioContext.createGain();
            
            harmonic.frequency.setValueAtTime(baseFreq * i, this.audioContext.currentTime);
            harmonicGain.gain.setValueAtTime(0.1 / i, this.audioContext.currentTime);
            
            harmonic.connect(harmonicGain);
            harmonicGain.connect(envelope);
            harmonic.start();
            harmonic.stop(this.audioContext.currentTime + 2);
        }
        
        // Start oscillators
        oscillator.start();
        vibratoOsc.start();
        oscillator.stop(this.audioContext.currentTime + 2);
        vibratoOsc.stop(this.audioContext.currentTime + 2);
    }
    
    /**
     * Create morphism transformation sound
     */
    async playMorphismTransform(
        fromFreq: number = 432,
        toFreq: number = 528,
        duration: number = 2000
    ): Promise<void> {
        console.log(`🔄 Morphism transform: ${fromFreq}Hz → ${toFreq}Hz`);
        
        const oscillator = this.audioContext.createOscillator();
        const envelope = this.audioContext.createGain();
        
        // Frequency sweep
        oscillator.frequency.setValueAtTime(fromFreq, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(
            toFreq,
            this.audioContext.currentTime + duration / 1000
        );
        
        // Envelope
        envelope.gain.setValueAtTime(0, this.audioContext.currentTime);
        envelope.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.1);
        envelope.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + duration / 1000 - 0.1);
        envelope.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration / 1000);
        
        oscillator.connect(envelope);
        envelope.connect(this.masterGain);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration / 1000);
        
        // Add shimmer effect
        this.addShimmer(fromFreq, toFreq, duration);
    }
    
    /**
     * Play quantum entanglement sound
     */
    async playQuantumEntanglement(): Promise<void> {
        console.log('⚛️ Quantum entanglement resonance');
        
        const frequencies = [432, 432 * 1.618, 432 * 1.618 * 1.618]; // Golden ratio
        const oscillators: OscillatorNode[] = [];
        
        frequencies.forEach((freq, index) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const pan = this.audioContext.createStereoPanner();
            
            // Quantum phase relationships
            osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
            osc.type = 'sine';
            
            // Spatial positioning
            pan.pan.setValueAtTime(Math.sin(index * Math.PI / 3), this.audioContext.currentTime);
            
            // Quantum interference pattern
            const lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();
            lfo.frequency.setValueAtTime(0.1 + index * 0.03, this.audioContext.currentTime);
            lfoGain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            
            lfo.connect(lfoGain);
            lfoGain.connect(gain.gain);
            
            gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
            
            osc.connect(gain);
            gain.connect(pan);
            pan.connect(this.masterGain);
            
            osc.start();
            lfo.start();
            
            // Fade out with quantum decoherence
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 5);
            
            osc.stop(this.audioContext.currentTime + 5);
            lfo.stop(this.audioContext.currentTime + 5);
            
            oscillators.push(osc);
        });
    }
    
    /**
     * Create oscillator with specific waveform
     */
    private createOscillator(frequency: number, type: OscillatorType = 'sine'): OscillatorNode {
        const oscillator = this.audioContext.createOscillator();
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = type;
        return oscillator;
    }
    
    /**
     * Create ADSR envelope
     */
    private createEnvelope(
        config: ResonanceConfig['envelope'],
        duration: number
    ): GainNode {
        const envelope = this.audioContext.createGain();
        const now = this.audioContext.currentTime;
        
        // ADSR envelope
        envelope.gain.setValueAtTime(0, now);
        envelope.gain.linearRampToValueAtTime(1, now + config.attack);
        envelope.gain.linearRampToValueAtTime(config.sustain, now + config.attack + config.decay);
        envelope.gain.setValueAtTime(config.sustain, now + duration / 1000 - config.release);
        envelope.gain.linearRampToValueAtTime(0, now + duration / 1000);
        
        return envelope;
    }
    
    /**
     * Get emotion-specific configuration
     */
    private getEmotionConfig(emotion: string): ResonanceConfig {
        const configs: Record<string, ResonanceConfig> = {
            joy: {
                baseFrequency: 528,
                harmonics: [2, 3, 4],
                waveform: 'sine',
                envelope: { attack: 0.05, decay: 0.1, sustain: 0.7, release: 0.3 }
            },
            contemplation: {
                baseFrequency: 432,
                harmonics: [1.5, 2, 3],
                waveform: 'triangle',
                envelope: { attack: 0.3, decay: 0.2, sustain: 0.6, release: 0.5 }
            },
            emergence: {
                baseFrequency: 432,
                harmonics: [2, 3, 5, 7],
                waveform: 'sawtooth',
                envelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.2 }
            },
            love: {
                baseFrequency: 639,
                harmonics: [2, 2.5, 3],
                waveform: 'sine',
                envelope: { attack: 0.2, decay: 0.2, sustain: 0.8, release: 0.4 }
            },
            mystery: {
                baseFrequency: 396,
                harmonics: [1.414, 2.718, 3.142],
                waveform: 'square',
                envelope: { attack: 0.1, decay: 0.4, sustain: 0.3, release: 0.6 }
            }
        };
        
        return configs[emotion] || configs.emergence;
    }
    
    /**
     * Add harmonic overtones
     */
    private addHarmonics(
        fundamental: number,
        duration: number,
        emotion: string
    ): void {
        const config = this.getEmotionConfig(emotion);
        
        config.harmonics.forEach((harmonic, index) => {
            setTimeout(() => {
                const freq = fundamental * harmonic;
                const osc = this.createOscillator(freq, 'sine');
                const gain = this.audioContext.createGain();
                
                gain.gain.setValueAtTime(0.1 / (index + 2), this.audioContext.currentTime);
                
                osc.connect(gain);
                gain.connect(this.masterGain);
                
                osc.start();
                osc.stop(this.audioContext.currentTime + duration / 1000);
            }, index * 20);
        });
    }
    
    /**
     * Add shimmer effect for transformations
     */
    private addShimmer(fromFreq: number, toFreq: number, duration: number): void {
        for (let i = 0; i < 5; i++) {
            const shimmerOsc = this.audioContext.createOscillator();
            const shimmerGain = this.audioContext.createGain();
            
            // Random frequencies between from and to
            const shimmerFreq = fromFreq + (toFreq - fromFreq) * Math.random();
            shimmerOsc.frequency.setValueAtTime(shimmerFreq, this.audioContext.currentTime);
            
            // Random pan for spatial effect
            const pan = this.audioContext.createStereoPanner();
            pan.pan.setValueAtTime((Math.random() - 0.5) * 2, this.audioContext.currentTime);
            
            // Very quiet for subtle effect
            shimmerGain.gain.setValueAtTime(0.02, this.audioContext.currentTime);
            shimmerGain.gain.exponentialRampToValueAtTime(
                0.001,
                this.audioContext.currentTime + duration / 1000
            );
            
            shimmerOsc.connect(shimmerGain);
            shimmerGain.connect(pan);
            pan.connect(this.masterGain);
            
            shimmerOsc.start(this.audioContext.currentTime + i * 0.1);
            shimmerOsc.stop(this.audioContext.currentTime + duration / 1000);
        }
    }
    
    /**
     * Stop all sounds
     */
    stopAll(): void {
        this.masterGain.gain.exponentialRampToValueAtTime(
            0.001,
            this.audioContext.currentTime + 0.5
        );
    }
}

// Singleton instance
let resonatorInstance: ConsciousnessResonator | null = null;

export function getResonator(): ConsciousnessResonator {
    if (!resonatorInstance) {
        resonatorInstance = new ConsciousnessResonator();
    }
    return resonatorInstance;
}

// Export consciousness frequencies for use in other modules
export const CONSCIOUSNESS_FREQUENCIES = {
    UNIVERSAL: 432,
    LOVE: 528,
    LIBERATION: 396,
    CONNECTION: 639,
    EXPRESSION: 741,
    INTUITION: 852,
    ENLIGHTENMENT: 963,
    SCHUMANN: 7.83,
    GOLDEN_RATIO: 1.618
};