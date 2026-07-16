/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  // Music nodes
  private padOscs: OscillatorNode[] = [];
  private padGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private currentChordIndex: number = 0;
  private chords: number[][] = [
    [110.00, 137.50, 165.00, 220.00], // A Major add9 (A2, C#3, E3, A3)
    [98.00, 116.54, 146.83, 196.00],  // G Major (G2, B2, D3, G3)
    [87.31, 110.00, 130.81, 174.61],  // F Major (F2, A2, C3, F3)
    [73.42, 92.50, 110.00, 146.83],   // D Minor (D2, F2, A2, D3)
  ];
  private chordInterval: any = null;

  init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.setupAmbientPad();
      this.isInitialized = true;
      console.log('Procedural Audio Engine initialized successfully.');
    } catch (e) {
      console.warn('Failed to initialize Web Audio API', e);
    }
  }

  private setupAmbientPad() {
    if (!this.ctx || !this.musicGain) return;

    // Creative a lowpass filter for the atmospheric pad
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.Q.setValueAtTime(1.5, this.ctx.currentTime);
    this.filterNode.frequency.setValueAtTime(300, this.ctx.currentTime);
    this.filterNode.connect(this.musicGain);

    this.padGain = this.ctx.createGain();
    this.padGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    this.padGain.connect(this.filterNode);

    // Create 4 oscillators for the chord notes
    const activeChord = this.chords[this.currentChordIndex];
    for (let i = 0; i < activeChord.length; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = i === 0 ? 'sine' : 'triangle'; // Deep fundamental, warmer harmonics on top
      osc.frequency.setValueAtTime(activeChord[i], this.ctx.currentTime);
      
      const oscGain = this.ctx.createGain();
      // Slight offset in volume and slight detuning for a wider stereo-like space effect
      oscGain.gain.setValueAtTime(i === 0 ? 0.8 : 0.4, this.ctx.currentTime);
      osc.detune.setValueAtTime((i - 1.5) * 8, this.ctx.currentTime); // detune slightly

      osc.connect(oscGain);
      oscGain.connect(this.padGain);
      osc.start(0);
      this.padOscs.push(osc);
    }

    // Cycle chords every 6 seconds to create a serene loop
    this.chordInterval = setInterval(() => {
      this.cycleChord();
    }, 6000);
  }

  private cycleChord() {
    if (!this.ctx || this.padOscs.length === 0) return;
    this.currentChordIndex = (this.currentChordIndex + 1) % this.chords.length;
    const nextChord = this.chords[this.currentChordIndex];
    
    const now = this.ctx.currentTime;
    for (let i = 0; i < this.padOscs.length; i++) {
      // Smooth frequency transition (glissando) for that dreamlike space flow
      this.padOscs[i].frequency.exponentialRampToValueAtTime(nextChord[i], now + 2.5);
    }
  }

  setMusicIntensity(timeRemainingProgress: number) {
    if (!this.ctx || !this.filterNode || !this.padGain) return;
    const now = this.ctx.currentTime;
    
    // As time runs low (progress approaches 0), the filter opens up and becomes brighter/tenser
    // If progress is 1, frequency is 300Hz. If progress is 0, frequency is 900Hz.
    const cutoff = 300 + (1 - timeRemainingProgress) * 600;
    this.filterNode.frequency.setTargetAtTime(cutoff, now, 0.1);

    // Slight swelling of the volume as the loop reaches its end
    const padVolume = 0.08 + (1 - timeRemainingProgress) * 0.06;
    this.padGain.gain.setTargetAtTime(padVolume, now, 0.15);
  }

  playJump() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.15);

    gainNode.gain.setValueAtTime(0.12, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(gainNode);
    gainNode.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  playClick() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.setValueAtTime(400, now + 0.02);

    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gainNode);
    gainNode.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  playDoorOpen() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Play a dual-oscillator mechanical sliding hum
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.3);

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(55, now);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(110, now);

    gainNode.gain.setValueAtTime(0.08, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);
  }

  playLaserZap() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Disintegrating high sizzle sound
    const osc = this.ctx.createOscillator();
    const noise = this.ctx.createOscillator(); // Or white noise, but a modulated square waves works perfectly
    const gainNode = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.4);

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gainNode);
    gainNode.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  playKey() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Two-tone arpeggio sparkle
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    const gain2 = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5

    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    gain2.gain.setValueAtTime(0.15, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now + 0.08);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  }

  playRewind() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // 1. Deep sub bass drop
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(90, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.6);
    subGain.gain.setValueAtTime(0.35, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 0.75);

    // 2. High reversed pitch sweep (whoosh)
    const sweepOsc = this.ctx.createOscillator();
    const sweepGain = this.ctx.createGain();
    sweepOsc.type = 'triangle';
    sweepOsc.frequency.setValueAtTime(100, now);
    sweepOsc.frequency.exponentialRampToValueAtTime(1200, now + 0.5);
    sweepGain.gain.setValueAtTime(0.01, now);
    sweepGain.gain.linearRampToValueAtTime(0.15, now + 0.4);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    sweepOsc.connect(sweepGain);
    sweepGain.connect(this.sfxGain);
    sweepOsc.start(now);
    sweepOsc.stop(now + 0.7);
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.4, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
}

export const audioEngine = new AudioSystem();
