export class GameAudio {
  private enabled: boolean;
  private context: AudioContext | undefined;

  constructor(initiallyEnabled: boolean) {
    this.enabled = initiallyEnabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && this.context && this.context.state !== 'closed') {
      void this.context.suspend();
    } else if (enabled && this.context?.state === 'suspended') {
      // Resume is attempted on the next player gesture to satisfy autoplay policy.
    }
  }

  playUiCue(): void {
    if (!this.enabled || typeof window === 'undefined') return;
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) return;
    try {
      this.context ??= new AudioContextConstructor();
      if (this.context.state === 'suspended') void this.context.resume();
      if (this.context.state !== 'running') return;
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
    if (this.context && this.context.state !== 'closed') void this.context.close();
    this.context = undefined;
  }
}
