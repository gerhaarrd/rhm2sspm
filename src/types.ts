export interface MapPreview {
  path: string;
  title: string;
  songName: string;
  mappers: string[];
  durationMs: number;
  noteCount: number;
  quantumNoteCount: number;
  difficulty: number;
  customDifficultyName: string;
  starRating: number;
  hasAudio: boolean;
  hasCover: boolean;
  coverDataUrl: string | null;
  timingPointsCount: number;
  outputBytes: number;
  warnings: string[];
  /** Note count per time bucket, normalized 0..1 against the densest bucket. */
  noteDensity: number[];
}

export interface ConversionOutcome {
  inputPath: string;
  outputPath: string;
  title: string;
  noteCount: number;
  quantumNoteCount: number;
  durationMs: number;
  hasAudio: boolean;
  hasCover: boolean;
  preservedTimingPoints: number;
  outputBytes: number;
}

export type QueueStatus = "loading" | "ready" | "converting" | "done" | "error";

export interface MetadataOverrides {
  title?: string;
  songName?: string;
  mappers?: string[];
  difficulty?: number;
  customDifficultyName?: string;
}

export interface HistoryEntry {
  id: string;
  title: string;
  inputPath: string;
  outputPath: string;
  noteCount: number;
  quantumNoteCount: number;
  durationMs: number;
  convertedAt: string;
}

export interface QueueEntry {
  id: string;
  path: string;
  status: QueueStatus;
  preview: MapPreview | null;
  outcome: ConversionOutcome | null;
  error: string | null;
  overrides: MetadataOverrides | null;
}
