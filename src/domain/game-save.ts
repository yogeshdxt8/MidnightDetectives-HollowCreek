export const GAME_SAVE_VERSION = 2 as const;

export interface InvestigationProgressSave {
  readonly discoveredEvidenceIds: readonly string[];
  readonly trackedLeadIds: readonly string[];
  readonly unlockedLocationIds: readonly string[];
  readonly searchedLocationIds: readonly string[];
  readonly solvedPuzzleIds: readonly string[];
  readonly askedKeeperTopicIds: readonly string[];
  readonly presentedKeeperEvidenceIds: readonly string[];
  readonly recoveredObjectIds: readonly string[];
  readonly completedDeductionIds: readonly string[];
}

export interface GameSaveData {
  readonly version: typeof GAME_SAVE_VERSION;
  readonly activeCaseId: string;
  readonly discoveredClueIds: readonly string[];
  readonly solvedPuzzleIds: readonly string[];
  readonly completedCaseIds: readonly string[];
  readonly investigation: InvestigationProgressSave;
}

export function createNewGameSave(): GameSaveData {
  return {
    version: GAME_SAVE_VERSION,
    activeCaseId: 'case-001',
    discoveredClueIds: [],
    solvedPuzzleIds: [],
    completedCaseIds: [],
    investigation: {
      discoveredEvidenceIds: [], trackedLeadIds: [], unlockedLocationIds: [],
      searchedLocationIds: [], solvedPuzzleIds: [], askedKeeperTopicIds: [],
      presentedKeeperEvidenceIds: [], recoveredObjectIds: [], completedDeductionIds: []
    }
  };
}

export function serializeGameSave(save: GameSaveData): string {
  const serialized = JSON.stringify(save);
  if (serialized.length > 3 * 1024 * 1024) throw new Error('Game save exceeds the YouTube Playables 3 MiB limit.');
  return serialized;
}

export function parseGameSave(serialized: string): GameSaveData {
  if (serialized.length > 3 * 1024 * 1024) throw new Error('Game save exceeds the supported size limit.');
  const parsed: unknown = JSON.parse(serialized);
  if (!isRecord(parsed)) throw new Error('Game save must be an object.');
  if (parsed['version'] !== 1 && parsed['version'] !== GAME_SAVE_VERSION) throw new Error(`Unsupported game save version: ${String(parsed['version'])}`);
  if (typeof parsed['activeCaseId'] !== 'string' || !isStringArray(parsed['discoveredClueIds']) ||
      !isStringArray(parsed['solvedPuzzleIds']) || !isStringArray(parsed['completedCaseIds'])) {
    throw new Error('Game save has an invalid shape.');
  }
  // Version 1 stored only the original clue/puzzle/case collections.
  // Preserve those collections and initialize newer investigation progress empty.
  if (parsed['version'] === 1) {
    const migrated = createNewGameSave();
    return {
      ...migrated,
      activeCaseId: parsed['activeCaseId'],
      discoveredClueIds: unique(parsed['discoveredClueIds']),
      solvedPuzzleIds: unique(parsed['solvedPuzzleIds']),
      completedCaseIds: unique(parsed['completedCaseIds'])
    };
  }
  if (!isRecord(parsed['investigation'])) throw new Error('Game save has an invalid shape.');
  const investigation = parsed['investigation'];
  const keys: readonly (keyof InvestigationProgressSave)[] = [
    'discoveredEvidenceIds','trackedLeadIds','unlockedLocationIds','searchedLocationIds',
    'solvedPuzzleIds','askedKeeperTopicIds','presentedKeeperEvidenceIds','recoveredObjectIds','completedDeductionIds'
  ];
  if (keys.some(key => !isStringArray(investigation[key]))) throw new Error('Game save investigation progress has an invalid shape.');
  const normalized = Object.fromEntries(keys.map(key => [key, unique(investigation[key] as string[])])) as unknown as InvestigationProgressSave;
  return {
    version: GAME_SAVE_VERSION,
    activeCaseId: parsed['activeCaseId'],
    discoveredClueIds: unique(parsed['discoveredClueIds']),
    solvedPuzzleIds: unique(parsed['solvedPuzzleIds']),
    completedCaseIds: unique(parsed['completedCaseIds']),
    investigation: normalized
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}
function unique(values: readonly string[]): string[] { return [...new Set(values)]; }
