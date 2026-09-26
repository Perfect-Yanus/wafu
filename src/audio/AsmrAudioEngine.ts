/**
 * AsmrAudioEngine
 * 100% Procedural Web Audio API sound synthesizer tailored for:
 * - Wafu Ball Squishy/Jelly touch & squeeze
 * - Brittle outer shell cracking & snapping
 * - Crispy/crunchy tape ball & clay micro-fractures
 * - Balloon/jelly pop bursts
 * - Smooth blade slicing
 * - Katamari rolling low-frequency rumbling & tiered item absorption
 */

export class AsmrAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private rollGain: GainNode | null = null;
  private rollFilter: BiquadFilterNode | null = null;
  private rollSource: AudioBufferSourceNode | null = null;

  private masterVolume: number = 0.8;
  private muted: boolean = false;
  private unlocked: boolean = false;

  private whiteNoiseBuffer: AudioBuffer | null = null;
  private pinkNoiseBuffer: AudioBuffer | null = null;

  constructor() {
    this.initContext();
  }

  private initContext(): void {
    if (typeof window === 'undefined') return;

    try {
      const AudioContextClass =
        window.AudioContext ||
        // @ts-expect-error webkit prefix fallback
        window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.generateNoiseBuffers();
        this.setupRollRumble();
      }
    } catch (e) {
      console.warn('AudioContext initialization failed or not supported:', e);
    }
  }

  /**
   * Unlock AudioContext on first user interaction (touch/click/keypress)
   */
  public async unlock(): Promise<void> {
    if (!this.ctx) {
      this.initContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
        this.unlocked = true;
      } catch (e) {
        console.warn('Failed to resume AudioContext:', e);
      }
    } else if (this.ctx && this.ctx.state === 'running') {
      this.unlocked = true;
    }
  }

  public isUnlocked(): boolean {
    return this.unlocked;
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setMasterVolume(val: number): void {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx && !this.muted) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
  }

  /**
   * Pre-generate 2 seconds of high quality procedural white and pink noise
   */
  private generateNoiseBuffers(): void {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate || 44100;
    const bufferSize = sampleRate * 2;

    // White Noise
    this.whiteNoiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const whiteData = this.whiteNoiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      whiteData[i] = Math.random() * 2 - 1;
    }

    // Pink Noise (Paul Kellet's filter method)
    this.pinkNoiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const pinkData = this.pinkNoiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      pinkData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }

  /**
   * Rolling Rumble setup: loop pink noise through dynamic lowpass & gain
   */
  private setupRollRumble(): void {
    if (!this.ctx || !this.masterGain || !this.pinkNoiseBuffer) return;

    try {
      this.rollFilter = this.ctx.createBiquadFilter();
      this.rollFilter.type = 'lowpass';
      this.rollFilter.frequency.setValueAtTime(60, this.ctx.currentTime);
      this.rollFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

      this.rollGain = this.ctx.createGain();
      this.rollGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.rollSource = this.ctx.createBufferSource();
      this.rollSource.buffer = this.pinkNoiseBuffer;
      this.rollSource.loop = true;

      this.rollSource.connect(this.rollFilter);
      this.rollFilter.connect(this.rollGain);
      this.rollGain.connect(this.masterGain);

      this.rollSource.start(0);
    } catch {
      // In tests or headless environments, might not be fully supported
    }
  }

  /**
   * Update rolling rumble sound based on player's speed
   */
  public updateRollRumble(speed: number, _surfaceType: 'pavement' | 'grass' | 'wood' = 'pavement'): void {
    if (!this.ctx || !this.rollGain || !this.rollFilter) return;

    const t = this.ctx.currentTime;
    const normalizedSpeed = Math.min(1.0, speed / 30.0);

    if (normalizedSpeed < 0.03) {
      this.rollGain.gain.linearRampToValueAtTime(0, t + 0.1);
    } else {
      const targetGain = 0.05 + normalizedSpeed * 0.35;
      const targetFreq = 70 + normalizedSpeed * 280;

      this.rollGain.gain.linearRampToValueAtTime(targetGain, t + 0.08);
      this.rollFilter.frequency.linearRampToValueAtTime(targetFreq, t + 0.08);
    }
  }

  /**
   * 1. SQUISH ASMR (말랑 젤리 찌르기 & 주무르기)
   * Low-pass resonant squelch + downward bubble frequency sweep
   */
  public playSquish(intensity: number = 0.5): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    const clampedIntensity = Math.max(0.1, Math.min(1.0, intensity));

    // Bubble oscillator
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    const baseFreq = 160 + Math.random() * 80;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.14 * clampedIntensity);

    oscGain.gain.setValueAtTime(0.01, t);
    oscGain.gain.linearRampToValueAtTime(0.4 * clampedIntensity, t + 0.015);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16 * clampedIntensity);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);

    // Wet squelch noise transient
    if (this.pinkNoiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.pinkNoiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600 + Math.random() * 400, t);
      filter.Q.setValueAtTime(4.5, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3 * clampedIntensity, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      noise.start(t);
      noise.stop(t + 0.1);
    }
  }

  /**
   * 2. STRETCH ASMR (쫀득하게 늘리기)
   * Upward frequency glide with elastic tension
   */
  public playStretch(stretchAmount: number = 0.5): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const startFreq = 110;
    const endFreq = startFreq + stretchAmount * 240;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.15);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /**
   * 3. CRUNCH ASMR (바삭한 슈가/점토/테이프볼 크런치)
   * High-pass granular crackle burst
   */
  public playCrunch(intensity: number = 0.8): void {
    if (!this.ctx || !this.masterGain || !this.whiteNoiseBuffer || this.muted) return;
    const t = this.ctx.currentTime;
    const count = 3 + Math.floor(Math.random() * 4);

    for (let i = 0; i < count; i++) {
      const offset = i * (0.012 + Math.random() * 0.01);
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.whiteNoiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(3200 + Math.random() * 2500, t + offset);
      filter.Q.setValueAtTime(2.0, t + offset);

      const gain = this.ctx.createGain();
      const burstVol = (0.2 + Math.random() * 0.25) * intensity;
      gain.gain.setValueAtTime(burstVol, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.025);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(t + offset);
      noise.stop(t + offset + 0.03);
    }
  }

  /**
   * 4. CRACK ASMR (외피 단단한 껍질 깨뜨리기 / 스냅)
   * Sharp brittle click + resonant body thud
   */
  public playCrack(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;

    // Sharp snap click
    if (this.whiteNoiseBuffer) {
      const snapNoise = this.ctx.createBufferSource();
      snapNoise.buffer = this.whiteNoiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(4200, t);
      filter.Q.setValueAtTime(8.0, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.55, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      snapNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      snapNoise.start(t);
      snapNoise.stop(t + 0.05);
    }

    // Low hollow shell resonant thud
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(75, t + 0.09);

    oscGain.gain.setValueAtTime(0.4, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  /**
   * 5. SLICE ASMR (칼로 외피 자르기 / 슬라이스)
   * High-pass blade hiss + smooth squelch
   */
  public playSlice(): void {
    if (!this.ctx || !this.masterGain || !this.whiteNoiseBuffer || this.muted) return;
    const t = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.whiteNoiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, t);
    filter.frequency.linearRampToValueAtTime(5400, t + 0.12);
    filter.Q.setValueAtTime(5.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.38, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.16);
  }

  /**
   * 6. POP ASMR (풍선 / 젤리 버블 터짐)
   * Fast downward pitch sweep + sub-impact boom
   */
  public playPop(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.05);

    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.08);

    // High bubble burst transient
    if (this.whiteNoiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.whiteNoiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, t);
      filter.Q.setValueAtTime(2.0, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      noise.start(t);
      noise.stop(t + 0.05);
    }
  }

  /**
   * 7. ABSORB CHIME (괴혼 물체 흡수 쾌감 사운드)
   * Joyful ascending chime and squelch scaled by tier
   */
  public playAbsorb(tier: number = 1): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;

    const baseNote = 260 + (tier * 60) % 500;
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(baseNote, t);
    osc1.frequency.exponentialRampToValueAtTime(baseNote * 1.5, t + 0.09);

    gain1.gain.setValueAtTime(0.28, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(t);
    osc1.stop(t + 0.14);

    // Also trigger light squish
    this.playSquish(0.4);
  }

  /**
   * 8. HAMMER SMASH ASMR (망치로 쾅! 깨뜨리기 / 부수기)
   * Deep sub-impact boom + explosive brittle fracture
   */
  public playHammerSmash(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;

    // Sub-bass heavy impact thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.18);

    gain.gain.setValueAtTime(0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.25);

    // Explosive fracture noise
    this.playCrack();
    this.playCrunch(1.2);
  }

  /**
   * 9. HYDRAULIC CRUSH ASMR (유압 프레스로 짓누르기)
   * Pressurized mechanical hum + viscous squelch & fluid hiss
   */
  public playHydraulicCrush(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;

    // Low mechanical press drone
    const drone = this.ctx.createOscillator();
    const droneGain = this.ctx.createGain();
    drone.type = 'sawtooth';
    drone.frequency.setValueAtTime(65, t);
    drone.frequency.linearRampToValueAtTime(50, t + 0.4);

    droneGain.gain.setValueAtTime(0.01, t);
    droneGain.gain.linearRampToValueAtTime(0.35, t + 0.05);
    droneGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    drone.connect(droneGain);
    droneGain.connect(this.masterGain);
    drone.start(t);
    drone.stop(t + 0.5);

    // Multiple viscous squelches
    this.playSquish(1.0);
    setTimeout(() => this.playSquish(0.8), 60);
    setTimeout(() => this.playSquish(0.9), 130);
  }

  /**
   * 10. WIRE SHRED ASMR (와이어 커터로 깍두기 절단)
   * High harmonic wire vibrations + crisp slicing
   */
  public playWireShred(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;

    // Wire pluck harmonics
    [480, 720, 960].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.02);

      gain.gain.setValueAtTime(0.2, t + idx * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.02 + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + idx * 0.02);
      osc.stop(t + idx * 0.02 + 0.15);
    });

    this.playSlice();
  }

  /**
   * 11. WATER BEADS POP ASMR (워터비즈 / 개구리알 톡톡 쾌감음)
   * Rapid juicy micro-pops
   */
  public playWaterBeads(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    const count = 5;

    for (let i = 0; i < count; i++) {
      const offset = i * 0.025 + Math.random() * 0.01;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const startFreq = 800 + Math.random() * 400;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, t + offset);
      osc.frequency.exponentialRampToValueAtTime(120, t + offset + 0.035);

      gain.gain.setValueAtTime(0.3, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.04);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + offset);
      osc.stop(t + offset + 0.05);
    }
  }

  /**
   * 12. FLOAM CRUNCH ASMR (폼폼이 / 스티로폼 알갱이 ASMR)
   * Sizzling crisp crackle
   */
  public playFloamCrunch(): void {
    this.playCrunch(0.95);
    this.playSquish(0.4);
  }

  /**
   * 13. CLAY CRACK ASMR (바삭 점토 껍질 파열음)
   * Crisp brittle snap + dry crust crackle
   */
  public playClayCrack(): void {
    this.playCrack();
    this.playCrunch(1.1);
  }

  /**
   * 14. PUNCTURE & DEFLATION ASMR (선인장 / 가시 찔림 파열 및 바람 빠지는 소리)
   * Sharp prick pop + escaping air hiss + deflating squish
   */
  public playPuncture(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;

    // 1. Sharp prick pop (needle puncture)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.08);

    oscGain.gain.setValueAtTime(0.5, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.1);

    // 2. High-pressure air hiss puff
    if (this.whiteNoiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.whiteNoiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2800, t);
      filter.Q.setValueAtTime(3.0, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      noise.start(t);
      noise.stop(t + 0.3);
    }

    this.playSquish(0.6);
  }

  /**
   * 15. TIME BONUS ASMR (보너스 시계 획득 차임벨)
   * Bright crystal chime arpeggio
   */
  public playTimeBonus(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    chord.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.04);

      gain.gain.setValueAtTime(0.22, t + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + idx * 0.04);
      osc.stop(t + idx * 0.04 + 0.4);
    });
  }

  /**
   * 16. TIME WARNING ASMR (카운트다운 임박 심장박동 경고음)
   */
  public playTimeWarning(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.12);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  /**
   * 17. CHARACTER REACTION SOUNDS (괴혼 스타일 캐릭터 흡수 리액션 음성/효과음)
   */
  public playCharacterReaction(type: 'human' | 'cat' | 'dog' | 'car' | string): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;

    if (type === 'cat') {
      // 야옹~ (Cute kitten meow: 620Hz -> 880Hz -> 540Hz)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.12);
      osc.frequency.exponentialRampToValueAtTime(540, t + 0.28);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.32);
    } else if (type === 'dog') {
      // 멍멍! (Double perky bark)
      [0, 0.09].forEach((delay) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, t + delay);
        osc.frequency.exponentialRampToValueAtTime(140, t + delay + 0.07);

        gain.gain.setValueAtTime(0.28, t + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.08);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(t + delay);
        osc.stop(t + delay + 0.09);
      });
    } else if (type === 'car') {
      // 빵빵! (Dual-tone cheerful cartoon horn)
      [0, 0.12].forEach((delay) => {
        [440, 554.37].forEach((freq) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, t + delay);

          gain.gain.setValueAtTime(0.18, t + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.09);

          osc.connect(gain);
          gain.connect(this.masterGain!);
          osc.start(t + delay);
          osc.stop(t + delay + 0.1);
        });
      });
    } else {
      // 사람: "와아아~!" (Funny high-pitched Katamari citizen squeak)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(1100, t + 0.14);
      osc.frequency.exponentialRampToValueAtTime(750, t + 0.28);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.32);
    }
  }

  /**
   * 18. PORTAL ENTER ASMR (차원 탈출 포털 진입 워프 효과음)
   */
  public playPortalEnter(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    const freqs = [300, 450, 600, 900, 1200, 1800, 2400];

    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.04);

      gain.gain.setValueAtTime(0.25, t + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + idx * 0.04);
      osc.stop(t + idx * 0.04 + 0.45);
    });

    this.playPop();
  }

  // ---------------- PROCEDURAL UPBEAT KATAMARI BGM ----------------
  private bgmPlaying: boolean = false;
  private bgmTimer: number | null = null;
  private bgmStep: number = 0;
  private bgmGainNode: GainNode | null = null;

  public startBgm(): void {
    if (this.bgmPlaying || !this.ctx) return;
    this.bgmPlaying = true;

    if (!this.bgmGainNode) {
      this.bgmGainNode = this.ctx.createGain();
      this.bgmGainNode.gain.setValueAtTime(0.18, this.ctx.currentTime);
      this.bgmGainNode.connect(this.masterGain ?? this.ctx.destination);
    }

    const stepIntervalMs = 120; // ~125 BPM 16th notes
    let nextNoteTime = this.ctx.currentTime + 0.05;

    // 4-Bar Chord Progression: F -> Dm -> Gm -> C7
    const bassline = [
      174.61, 0, 174.61, 220.0, 261.63, 0, 220.0, 174.61, // Bar 1: F
      146.83, 0, 146.83, 174.61, 220.0, 0, 174.61, 146.83, // Bar 2: Dm
      196.0, 0, 196.0, 233.08, 293.66, 0, 233.08, 196.0,  // Bar 3: Gm
      130.81, 0, 164.81, 196.0, 233.08, 0, 196.0, 164.81, // Bar 4: C7
    ];

    const melodyNotes = [
      523.25, 659.25, 783.99, 0, 659.25, 783.99, 1046.5, 0,
      880.0, 0, 783.99, 659.25, 587.33, 0, 523.25, 0,
      587.33, 698.46, 880.0, 0, 698.46, 880.0, 1174.66, 0,
      1046.5, 0, 880.0, 783.99, 659.25, 587.33, 523.25, 0,
    ];

    this.bgmTimer = window.setInterval(() => {
      if (!this.bgmPlaying || !this.ctx || !this.bgmGainNode) return;

      while (nextNoteTime < this.ctx.currentTime + 0.25) {
        const step = this.bgmStep % 32;

        // 1. Synth Bass Note
        const bassFreq = bassline[step];
        if (bassFreq > 0) {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(bassFreq, nextNoteTime);

          g.gain.setValueAtTime(0.35, nextNoteTime);
          g.gain.exponentialRampToValueAtTime(0.001, nextNoteTime + 0.18);

          osc.connect(g);
          g.connect(this.bgmGainNode);
          osc.start(nextNoteTime);
          osc.stop(nextNoteTime + 0.2);
        }

        // 2. Playful Lead Melody
        const melFreq = melodyNotes[step];
        if (melFreq > 0 && step % 2 === 0) {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(melFreq, nextNoteTime);

          g.gain.setValueAtTime(0.2, nextNoteTime);
          g.gain.exponentialRampToValueAtTime(0.001, nextNoteTime + 0.16);

          osc.connect(g);
          g.connect(this.bgmGainNode);
          osc.start(nextNoteTime);
          osc.stop(nextNoteTime + 0.18);
        }

        // 3. Shaker / Hi-hat percussive tick on off-beats
        if (step % 2 === 1 && this.whiteNoiseBuffer) {
          const noise = this.ctx.createBufferSource();
          noise.buffer = this.whiteNoiseBuffer;

          const filter = this.ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(5000, nextNoteTime);

          const ng = this.ctx.createGain();
          ng.gain.setValueAtTime(0.09, nextNoteTime);
          ng.gain.exponentialRampToValueAtTime(0.001, nextNoteTime + 0.04);

          noise.connect(filter);
          filter.connect(ng);
          ng.connect(this.bgmGainNode);
          noise.start(nextNoteTime);
          noise.stop(nextNoteTime + 0.05);
        }

        this.bgmStep++;
        nextNoteTime += 0.12;
      }
    }, stepIntervalMs);
  }

  public stopBgm(): void {
    this.bgmPlaying = false;
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  public isBgmPlaying(): boolean {
    return this.bgmPlaying;
  }
}

// Global Singleton
export const asmrAudio = new AsmrAudioEngine();
