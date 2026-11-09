import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayablesPlatform, type PlayablesSdk } from '../src/platform/playables-sdk';

function createSdk(): PlayablesSdk {
  return {
    IN_PLAYABLES_ENV: true,
    game: {
      firstFrameReady: vi.fn(),
      gameReady: vi.fn(),
      loadData: vi.fn().mockResolvedValue('saved-progress'),
      saveData: vi.fn().mockResolvedValue(undefined)
    },
    system: {
      isAudioEnabled: vi.fn().mockReturnValue(true),
      onAudioEnabledChange: vi.fn().mockReturnValue(vi.fn()),
      onPause: vi.fn().mockReturnValue(vi.fn()),
      onResume: vi.fn().mockReturnValue(vi.fn())
    }
  };
}

describe('YouTube Playables platform adapter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('can be constructed in a non-browser test/runtime without a global window', () => {
    expect(() => new PlayablesPlatform()).not.toThrow();
    expect(new PlayablesPlatform().isAvailable).toBe(false);
  });

  it('uses browser preview mode when the SDK script exists outside Playables', () => {
    const sdk = { ...createSdk(), IN_PLAYABLES_ENV: false };
    const platform = new PlayablesPlatform(sdk);
    expect(platform.isAvailable).toBe(false);
    expect(() => platform.notifyGameReady()).not.toThrow();
    expect(sdk.game.gameReady).not.toHaveBeenCalled();
  });

  it('requires a successful load before gameReady or saveData', async () => {
    const sdk = createSdk();
    const platform = new PlayablesPlatform(sdk);
    expect(() => platform.notifyGameReady()).toThrow('before cloud data has loaded');
    await expect(platform.saveData('progress')).rejects.toThrow('until loadData succeeds');
    await platform.loadData();
    platform.notifyGameReady();
    await platform.saveData('progress');
    expect(sdk.game.gameReady).toHaveBeenCalledOnce();
    expect(sdk.game.saveData).toHaveBeenCalledWith('progress');
  });

  it('does not mark load complete when the SDK load fails', async () => {
    const sdk = createSdk();
    vi.mocked(sdk.game.loadData).mockRejectedValueOnce(new Error('offline'));
    const platform = new PlayablesPlatform(sdk);
    await expect(platform.loadData()).rejects.toThrow('offline');
    await expect(platform.saveData('new-game')).rejects.toThrow('until loadData succeeds');
    platform.notifyGameReady();
    expect(sdk.game.gameReady).toHaveBeenCalledOnce();
    expect(sdk.game.saveData).not.toHaveBeenCalled();
  });

  it('exposes YouTube audio state and registers lifecycle callbacks', () => {
    const sdk = createSdk();
    const platform = new PlayablesPlatform(sdk);
    const handlers = { onPause: vi.fn(), onResume: vi.fn(), onAudioEnabledChange: vi.fn() };
    expect(platform.audioEnabled).toBe(true);
    platform.registerLifecycle(handlers);
    expect(sdk.system.onPause).toHaveBeenCalledWith(handlers.onPause);
    expect(sdk.system.onResume).toHaveBeenCalledWith(handlers.onResume);
    expect(sdk.system.onAudioEnabledChange).toHaveBeenCalledWith(handlers.onAudioEnabledChange);
  });

  it('supports local preview without pretending to persist across reloads', async () => {
    const platform = new PlayablesPlatform(undefined);
    expect(platform.isAvailable).toBe(false);
    expect(await platform.loadData()).toBe('');
    await expect(platform.saveData('preview-only')).resolves.toBeUndefined();
  });

  it('unregisters lifecycle callbacks on disposal', () => {
    const sdk = createSdk();
    const platform = new PlayablesPlatform(sdk);
    platform.registerLifecycle({ onPause: vi.fn(), onResume: vi.fn(), onAudioEnabledChange: vi.fn() });
    platform.dispose();
    expect(sdk.system.onPause).toHaveBeenCalledOnce();
  });
});
