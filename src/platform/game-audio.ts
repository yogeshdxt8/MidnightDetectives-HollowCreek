export class GameAudio {
  private enabled: boolean;
  private context: AudioContext | undefined;
  private paused = false;

  constructor(initiallyEnabled: boolean) {
    this.enabled = initiallyEnabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && this.context && this.context.state !== 'closed') {
      void this.context.suspend().catch(() => undefined);
    }
  }

  pause(): void {
    this.paused = true;
    if (this.context && this.context.state === 'running') void this.context.suspend();
  }

  resume(): void {
    this.paused = false;
    if (this.enabled && this.context && this.context.state !== 'closed' && this.context.state !== 'running') void this.context.resume().catch(() => undefined);
  }

  async playThunder(): Promise<void> {
    if (!this.enabled || this.paused || !this.context || this.context.state !== 'running') return;
    try {
      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(58, now);
      oscillator.frequency.exponentialRampToValueAtTime(27, now + 1.8);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
      oscillator.connect(gain);
      gain.connect(this.context.destination);
      oscillator.start(now);
      oscillator.stop(now + 2.25);
    } catch {
      // Thunder is atmospheric only; audio failure must never block gameplay.
    }
  }

  async playDogBark(): Promise<void> {
    if (!this.enabled || this.paused || !this.context || this.context.state !== 'running') return;
    try {
      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      const filter = this.context.createBiquadFilter();
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(190, now);
      oscillator.frequency.exponentialRampToValueAtTime(82, now + 0.16);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.055, now + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(this.context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.21);
    } catch {
      // Bark effects are atmospheric only.
    }
  }

  async playUiCue(): Promise<void> {
    if (!this.enabled || this.paused || typeof window === 'undefined') return;
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) return;

    try {
      this.context ??= new AudioContextConstructor();
      // Start/resume synchronously from the player's gesture, then wait for the
      // browser's asynchronous state transition before creating the sound.
      if (this.context.state === 'suspended') await this.context.resume();
      if (!this.enabled || this.paused || this.context.state !== 'running') return;

      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(660, this.context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(440, this.context.currentTime + 0.045);
      gain.gain.setValueAtTime(0.0001, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.035, this.context.currentTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + 0.06);
      oscillator.connect(gain);
      gain.connect(this.context.destination);
      oscillator.start();
      oscillator.stop(this.context.currentTime + 0.065);
    } catch {
      // Audio is best-effort; a blocked or unavailable device must not affect gameplay.
    }
  }

  dispose(): void {
    if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => undefined);
    this.context = undefined;
  }
}
