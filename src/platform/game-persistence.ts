import { createNewGameSave, parseGameSave, serializeGameSave, type GameSaveData } from '../domain/game-save';
import type { PlayablesPlatform } from './playables-sdk';

export interface BrowserSaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface PersistenceInitialization {
  readonly save: GameSaveData;
  readonly source: 'cloud' | 'browser' | 'new';
  readonly writable: boolean;
  readonly warning?: string;
}

const BROWSER_SAVE_KEY = 'midnight-detectives-hollow-creek.save.v2';

export class GamePersistence {
  private initialized = false;
  private writable = false;
  private readonly platform: PlayablesPlatform;
  private readonly browserStorage: BrowserSaveStorage | undefined;

  constructor(platform: PlayablesPlatform, browserStorage?: BrowserSaveStorage) {
    this.platform = platform;
    this.browserStorage = browserStorage;
  }

  async initialize(): Promise<PersistenceInitialization> {
    if (this.initialized) throw new Error('Game persistence can only be initialized once.');
    this.initialized = true;

    if (this.platform.isAvailable) {
      try {
        const raw = await this.platform.loadData();
        const save = raw.length === 0 ? createNewGameSave() : parseGameSave(raw);
        this.writable = true;
        return { save, source: raw.length === 0 ? 'new' : 'cloud', writable: true };
      } catch {
        // Never write to cloud after a failed load or an unreadable payload.
        return {
          save: createNewGameSave(),
          source: 'new',
          writable: false,
          warning: 'Cloud progress could not be safely loaded. This session is temporary; existing cloud data will not be overwritten.'
        };
      }
    }

    if (!this.browserStorage) {
      this.writable = false;
      return { save: createNewGameSave(), source: 'new', writable: false, warning: 'Browser storage is unavailable. Progress is temporary.' };
    }

    try {
      const raw = this.browserStorage.getItem(BROWSER_SAVE_KEY);
      const save = raw === null ? createNewGameSave() : parseGameSave(raw);
      this.writable = true;
      return { save, source: raw === null ? 'new' : 'browser', writable: true };
    } catch {
      this.writable = false;
      return {
        save: createNewGameSave(),
        source: 'new',
        writable: false,
        warning: 'Saved browser progress could not be read. This session is temporary; the unreadable save will not be overwritten.'
      };
    }
  }

  async save(save: GameSaveData): Promise<boolean> {
    if (!this.initialized) throw new Error('Initialize persistence before saving.');
    if (!this.writable) return false;
    const serialized = serializeGameSave(save);
    if (this.platform.isAvailable) {
      await this.platform.saveData(serialized);
      return true;
    }
    if (!this.browserStorage) return false;
    this.browserStorage.setItem(BROWSER_SAVE_KEY, serialized);
    return true;
  }
}
