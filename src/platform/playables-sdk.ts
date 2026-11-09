export interface PlayablesSdk {
  readonly IN_PLAYABLES_ENV: boolean;
  readonly game: {
    firstFrameReady(): void;
    gameReady(): void;
    loadData(): Promise<string>;
    saveData(data: string): Promise<void>;
  };
  readonly system: {
    isAudioEnabled(): boolean;
    onAudioEnabledChange(callback: (enabled: boolean) => void): () => void;
    onPause(callback: () => void): () => void;
    onResume(callback: () => void): () => void;
  };
}

declare global {
  interface Window {
    ytgame?: PlayablesSdk;
  }
}

export interface PlayablesLifecycleHandlers {
  readonly onPause: () => void;
  readonly onResume: () => void;
  readonly onAudioEnabledChange: (enabled: boolean) => void;
}

export class PlayablesPlatform {
  private readonly sdk: PlayablesSdk | undefined;
  private loaded = false;
  private readonly unsubscribe: Array<() => void> = [];

  constructor(sdk: PlayablesSdk | undefined = window.ytgame) {
    this.sdk = sdk;
  }

  get isAvailable(): boolean {
    return this.sdk !== undefined;
  }

  get isInPlayablesEnvironment(): boolean {
    return this.sdk?.IN_PLAYABLES_ENV ?? false;
  }

  get audioEnabled(): boolean {
    return this.sdk?.system.isAudioEnabled() ?? false;
  }

  notifyFirstFrameReady(): void {
    this.sdk?.game.firstFrameReady();
  }

  notifyGameReady(): void {
    if (!this.loaded) {
      throw new Error('Game cannot be marked ready before cloud data has loaded.');
    }
    this.sdk?.game.gameReady();
  }

  async loadData(): Promise<string> {
    if (!this.sdk) {
      this.loaded = true;
      return '';
    }

    const data = await this.sdk.game.loadData();
    this.loaded = true;
    return data;
  }

  async saveData(data: string): Promise<void> {
    if (!this.loaded) {
      throw new Error('Cloud save is blocked until loadData succeeds.');
    }
    if (!this.sdk) return;
    await this.sdk.game.saveData(data);
  }

  registerLifecycle(handlers: PlayablesLifecycleHandlers): void {
    if (!this.sdk) return;
    this.unsubscribe.push(
      this.sdk.system.onPause(handlers.onPause),
      this.sdk.system.onResume(handlers.onResume),
      this.sdk.system.onAudioEnabledChange(handlers.onAudioEnabledChange)
    );
  }

  dispose(): void {
    this.unsubscribe.splice(0).forEach(unsubscribe => unsubscribe());
  }
}
