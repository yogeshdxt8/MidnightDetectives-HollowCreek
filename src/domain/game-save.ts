export const GAME_SAVE_VERSION = 1 as const;

export interface GameSaveData {
  readonly version: typeof GAME_SAVE_VERSION;
  readonly activeCaseId: string;
  readonly discoveredClueIds: readonly string[];
  readonly solvedPuzzleIds: readonly string[];
  readonly completedCaseIds: readonly string[];
}

export function createNewGameSave(): GameSaveData {
  return {
    version: GAME_SAVE_VERSION,
    activeCaseId: 'case-001',
    discoveredClueIds: [],
    solvedPuzzleIds: [],
    completedCaseIds: []
  };
}

export function serializeGameSave(save: GameSaveData): string {
  const serialized = JSON.stringify(save);
  if (serialized.length > 3 * 1024 * 1024) {
    throw new Error('Game save exceeds the YouTube Playables 3 MiB limit.');
  }
  return serialized;
}

export function parseGameSave(serialized: string): GameSaveData {
  if (serialized.length > 3 * 1024 * 1024) {
    throw new Error('Game save exceeds the supported size limit.');
  }

  const parsed: unknown = JSON.parse(serialized);
  if (!isRecord(parsed)) throw new Error('Game save must be an object.');

  if (parsed['version'] !== GAME_SAVE_VERSION) {
    throw new Error(`Unsupported game save version: ${String(parsed['version'])}`);
  }

  if (typeof parsed['activeCaseId'] !== 'string' ||
      !isStringArray(parsed['discoveredClueIds']) ||
      !isStringArray(parsed['solvedPuzzleIds']) ||
      !isStringArray(parsed['completedCaseIds'])) {
    throw new Error('Game save has an invalid shape.');
  }

  return {
    version: GAME_SAVE_VERSION,
    activeCaseId: parsed['activeCaseId'],
    discoveredClueIds: unique(parsed['discoveredClueIds']),
    solvedPuzzleIds: unique(parsed['solvedPuzzleIds']),
    completedCaseIds: unique(parsed['completedCaseIds'])
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
