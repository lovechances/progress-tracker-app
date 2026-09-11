export type RatingCategory =
  | 'relationships'
  | 'health'
  | 'energy'
  | 'speaking'
  | 'mindAndThought'
  | 'strength'
  | 'appearance';

export const ratingCategoryList: RatingCategory[] = [
  'relationships',
  'health',
  'energy',
  'speaking',
  'mindAndThought',
  'strength',
  'appearance'
];

export const ratingDisplayName: Record<RatingCategory, string> = {
  relationships: 'Relationships',
  health: 'Health',
  energy: 'Energy',
  speaking: 'Speaking',
  mindAndThought: 'Mind & Thought',
  strength: 'Strength',
  appearance: 'Appearance'
};

export interface MonthlyEntry {
  id: string;
  year: number;
  month: number;
  monthKey: number;
  money: number;
  relationships?: number;
  health?: number;
  energy?: number;
  speaking?: number;
  mindAndThought?: number;
  strength?: number;
  appearance?: number;
  sex?: number;
  changes: string;
  createdAt: string;
  updatedAt: string;
}

export interface EntryInput {
  year: number;
  month: number;
  money: number;
  relationships?: number;
  health?: number;
  energy?: number;
  speaking?: number;
  mindAndThought?: number;
  strength?: number;
  appearance?: number;
  sex?: number;
  changes: string;
}

export interface ParsedHistoryEntry {
  year: number;
  month: number;
  money?: number;
  relationships?: number;
  health?: number;
  energy?: number;
  speaking?: number;
  mindAndThought?: number;
  strength?: number;
  appearance?: number;
  sex?: number;
  changes: string;
}

export interface ImportPayload {
  version: 1;
  schemaVersion: 1;
  exportedAt: string;
  entries: MonthlyEntry[];
}

export interface FocusTheme {
  label: string;
  count: number;
  firstSeen: string;
  months: string[];
}

export type TrendWindow = '6M' | '1Y' | 'ALL';
