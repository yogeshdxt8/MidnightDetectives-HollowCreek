import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameAudio } from '../src/platform/game-audio';

class FakeAudioContext {
  state: AudioContextState = 'suspended';
  currentTime = 0;
  destination = {};
  oscillatorStarted = false;
  resume = vi.fn(async () => { this.state = 'running'; });
  suspend = vi.fn(async () => { this.state = 'suspended'; });
  close = vi.fn(async () => { this.state = 'closed'; });
  createOscillator() {
    return {
      type: 'sine',
      frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: () => { this.oscillatorStarted = true; },
      stop: vi.fn()
    };
  }
  createGain() {
    return {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn()
    };
  }
}

describe('game audio lifecycle', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('does not create or play audio while paused', async () => {
    const audioContext = vi.fn(() => new FakeAudioContext());
    vi.stubGlobal('window', { AudioContext: audioContext });
    const audio = new GameAudio(true);
    audio.pause();
    await audio.playUiCue();
    expect(audioContext).not.toHaveBeenCalled();
    audio.dispose();
  });

  it('does not create audio when YouTube audio is disabled', async () => {
    const audioContext = vi.fn(() => new FakeAudioContext());
    vi.stubGlobal('window', { AudioContext: audioContext });
    const audio = new GameAudio(false);
    await audio.playUiCue();
    expect(audioContext).not.toHaveBeenCalled();
    audio.dispose();
  });

  it('allows future cues after the platform resumes audio', async () => {
    const context = new FakeAudioContext();
    const audioContext = vi.fn(() => context);
    vi.stubGlobal('window', { AudioContext: audioContext });
    const audio = new GameAudio(true);
    audio.pause();
    audio.resume();
    await audio.playUiCue();
    expect(audioContext).toHaveBeenCalledOnce();
    expect(context.oscillatorStarted).toBe(true);
    audio.dispose();
  });
});
