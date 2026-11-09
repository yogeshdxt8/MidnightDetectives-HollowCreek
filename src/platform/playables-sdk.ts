export interface PlayablesSdk {
  readonly IN_PLAYABLES_ENV: boolean;
  readonly game: {
    firstFrameReady(): void;
    gameReady(): void;
    loadData(): Promise<string>;
    saveData(data: string): Promise<void>;
  };
  readonly engagement: {
    sendScore(score: { readonly value: number }): Promise<void>;
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

function getDefaultSdk(): PlayablesSdk | undefined {
  return typeof window === 'undefined' ? undefined : window.ytgame;
}

export class PlayablesPlatform {
  private readonly sdk: PlayablesSdk | undefined;
  private loadSettled = false;
  private loadSucceeded = false;
  private firstFrameNotified = false;
  private gameReadyNotified = false;
  private readonly unsubscribe: Array<() => void> = [];

  constructor(sdk: PlayablesSdk | undefined = getDefaultSdk()) {
    this.sdk = sdk;
  }

  get isAvailable(): boolean {
    return this.sdk?.IN_PLAYABLES_ENV === true;
  }

  get isInPlayablesEnvironment(): boolean {
    return this.sdk?.IN_PLAYABLES_ENV ?? false;
  }

  async sendScore(value: number): Promise<void> {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('Playables score must be a non-negative safe integer.');
    if (!this.isAvailable || !this.sdk?.engagement) return;
    await this.sdk.engagement.sendScore({ value });
  }

  get audioEnabled(): boolean {
    return this.sdk?.system.isAudioEnabled() ?? false;
  }

  notifyFirstFrameReady(): void {
    if (this.firstFrameNotified) return;
    this.firstFrameNotified = true;
    this.sdk?.game.firstFrameReady();
  }

  notifyGameReady(): void {
    if (!this.isAvailable || this.gameReadyNotified) return;
    if (!this.firstFrameNotified) {
      throw new Error('Game cannot be marked ready before firstFrameReady.');
    }
    if (!this.loadSettled) {
      throw new Error('Game cannot be marked ready before cloud data loading has settled.');
    }
    this.sdk?.game.gameReady();
    this.gameReadyNotified = true;
  }

  async loadData(): Promise<string> {
    if (!this.sdk) {
      this.loadSettled = true;
      this.loadSucceeded = true;
      return '';
    }

    try {
      const data = await this.sdk.game.loadData();
      this.loadSucceeded = true;
      return data;
    } finally {
      this.loadSettled = true;
    }
  }

  async saveData(data: string): Promise<void> {
    if (!this.loadSucceeded) {
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
