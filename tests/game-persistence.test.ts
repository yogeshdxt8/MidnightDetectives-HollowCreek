import { describe, expect, it, vi } from 'vitest';
import { createNewGameSave, serializeGameSave } from '../src/domain/game-save';
import { GamePersistence, type BrowserSaveStorage } from '../src/platform/game-persistence';
import { PlayablesPlatform, type PlayablesSdk } from '../src/platform/playables-sdk';

function sdk(loadData: () => Promise<string>, saveData = vi.fn(async (_data: string) => undefined)): PlayablesSdk {
  return {
    IN_PLAYABLES_ENV: true,
    game: { firstFrameReady: vi.fn(), gameReady: vi.fn(), loadData, saveData },
    engagement: { sendScore: vi.fn(async (_score: { readonly value: number }) => undefined) },
    system: {
      isAudioEnabled: () => true,
      onAudioEnabledChange: () => () => undefined,
      onPause: () => () => undefined,
      onResume: () => () => undefined
    }
  };
}

class MemoryStorage implements BrowserSaveStorage {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe('game persistence coordinator', () => {
  it('loads cloud progress before allowing writes', async () => {
    const saved = vi.fn(async (_data: string) => undefined);
    const platform = new PlayablesPlatform(sdk(async () => serializeGameSave(createNewGameSave()), saved));
    const persistence = new GamePersistence(platform);
    const initialized = await persistence.initialize();
    expect(initialized.writable).toBe(true);
    expect(initialized.source).toBe('cloud');
    expect(await persistence.save(createNewGameSave())).toBe(true);
    expect(saved).toHaveBeenCalledOnce();
  });

  it('does not overwrite cloud data when cloud loading fails', async () => {
    const saved = vi.fn(async (_data: string) => undefined);
    const platform = new PlayablesPlatform(sdk(async () => { throw new Error('network unavailable'); }, saved));
    const persistence = new GamePersistence(platform);
    const initialized = await persistence.initialize();
    expect(initialized.writable).toBe(false);
    expect(initialized.warning).toContain('will not be overwritten');
    expect(await persistence.save(createNewGameSave())).toBe(false);
    expect(saved).not.toHaveBeenCalled();
  });

  it('does not overwrite malformed cloud data', async () => {
    const saved = vi.fn(async (_data: string) => undefined);
    const platform = new PlayablesPlatform(sdk(async () => '{"version":99}', saved));
    const persistence = new GamePersistence(platform);
    const initialized = await persistence.initialize();
    expect(initialized.writable).toBe(false);
    expect(await persistence.save(createNewGameSave())).toBe(false);
    expect(saved).not.toHaveBeenCalled();
  });

  it('uses browser storage when the Playables SDK is absent', async () => {
    const storage = new MemoryStorage();
    const persistence = new GamePersistence(new PlayablesPlatform(undefined), storage);
    const initialized = await persistence.initialize();
    expect(initialized.source).toBe('new');
    expect(initialized.writable).toBe(true);
    expect(await persistence.save(createNewGameSave())).toBe(true);
    expect([...storage.values.values()][0]).toContain('"version":2');
  });

  it('keeps unreadable browser data intact and disables writes', async () => {
    const storage = new MemoryStorage();
    storage.values.set('midnight-detectives-hollow-creek.save.v2', 'invalid-json');
    const persistence = new GamePersistence(new PlayablesPlatform(undefined), storage);
    const initialized = await persistence.initialize();
    expect(initialized.writable).toBe(false);
    expect(await persistence.save(createNewGameSave())).toBe(false);
    expect(storage.values.get('midnight-detectives-hollow-creek.save.v2')).toBe('invalid-json');
  });
});
