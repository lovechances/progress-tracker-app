import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearEntries,
  createBackup,
  deleteEntry,
  loadEntries,
  mergeEntries,
  parseBackupPayload,
  replaceEntries,
  toDbEntryFromParsed,
  upsertEntry
} from '../services/db';
import { parseHistoricalText } from '../utils/parser';
import type { EntryInput, ImportPayload, MonthlyEntry } from '../types';

type ImportMode = 'merge' | 'replace';

interface ContextState {
  entries: MonthlyEntry[];
  ready: boolean;
  seeded: boolean;
  currentMonthEntry: MonthlyEntry | undefined;
  years: number[];
  entryForMonth: (year: number, month: number) => MonthlyEntry | undefined;
  addOrUpdate: (input: EntryInput) => Promise<MonthlyEntry>;
  deleteById: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  importBackup: (text: string, mode: ImportMode) => Promise<void>;
  validateBackup: (text: string) => ImportPayload;
  seedFromHistoryText: (text: string) => Promise<number>;
  startFresh: () => void;
  exportJSON: () => string;
  exportCSV: () => string;
}

const ProgressContext = createContext<ContextState | undefined>(undefined);
const ONBOARDING_KEY = 'progresspulse.onboarded';

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<MonthlyEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const refresh = useCallback(async () => {
    const all = await loadEntries();
    setEntries(all);
  }, []);

  const load = useCallback(async () => {
    const existing = await loadEntries();
    setEntries(existing);

    setSeeded(localStorage.getItem(ONBOARDING_KEY) === '1');

    setReady(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ordered = useMemo(() => [...entries].sort((a, b) => a.monthKey - b.monthKey), [entries]);

  const years = useMemo(() => {
    const values = new Set(ordered.map((entry) => entry.year));
    return Array.from(values).sort((a, b) => b - a);
  }, [ordered]);

  const now = new Date();
  const currentMonthEntry = ordered.find(
    (entry) => entry.year === now.getFullYear() && entry.month === now.getMonth() + 1
  );

  const entryForMonth = useCallback(
    (year: number, month: number) => ordered.find((entry) => entry.year === year && entry.month === month),
    [ordered]
  );

  const addOrUpdate = useCallback(async (input: EntryInput) => {
    const saved = await upsertEntry(input);
    await refresh();
    setSeeded(true);
    localStorage.setItem(ONBOARDING_KEY, '1');
    return saved;
  }, [refresh]);

  const deleteById = useCallback(async (id: string) => {
    await deleteEntry(id);
    await refresh();
  }, [refresh]);

  const clearAll = useCallback(async () => {
    await clearEntries();
    await refresh();
  }, [refresh]);

  const seedFromHistoryText = useCallback(async (text: string) => {
    if (entries.length) return 0;

    const parsed = parseHistoricalText(text);
    if (!parsed.length) return 0;

    const records = parsed.map((item) => toDbEntryFromParsed(item));
    await replaceEntries(records);
    await refresh();
    localStorage.setItem(ONBOARDING_KEY, '1');
    setSeeded(true);
    return records.length;
  }, [entries.length, refresh]);

  const importBackup = useCallback(async (text: string, mode: ImportMode) => {
    const parsed = parseBackupPayload(text);
    if (mode === 'replace') {
      await replaceEntries(parsed.entries);
    } else {
      await mergeEntries(parsed.entries);
    }
    await refresh();
    localStorage.setItem(ONBOARDING_KEY, '1');
    setSeeded(true);
  }, [refresh]);

  const validateBackup = useCallback((text: string) => {
    return parseBackupPayload(text);
  }, []);

  const startFresh = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setSeeded(true);
  }, []);

  const exportJSON = useCallback(() => JSON.stringify(createBackup(ordered), null, 2), [ordered]);

  const exportCSV = useCallback(() => {
    const header = [
      'year',
      'month',
      'money',
      'relationships',
      'health',
      'energy',
      'speaking',
      'mindAndThought',
      'strength',
      'appearance',
      'sex',
      'changes',
      'createdAt',
      'updatedAt'
    ];

    const lines = ordered.map((entry) =>
      [
        entry.year,
        entry.month,
        entry.money,
        entry.relationships ?? '',
        entry.health ?? '',
        entry.energy ?? '',
        entry.speaking ?? '',
        entry.mindAndThought ?? '',
        entry.strength ?? '',
        entry.appearance ?? '',
        entry.sex ?? '',
        escapeCSV(entry.changes),
        entry.createdAt,
        entry.updatedAt
      ].join(',')
    );

    return `${header.join(',')}` + '\n' + lines.join('\n');
  }, [ordered]);

  return (
    <ProgressContext.Provider
      value={{
        entries: ordered,
        ready,
        seeded,
        years,
        currentMonthEntry,
        entryForMonth,
        addOrUpdate,
        deleteById,
        clearAll,
        importBackup,
        validateBackup,
        seedFromHistoryText,
        startFresh,
        exportJSON,
        exportCSV
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) throw new Error('useProgress must be used inside ProgressProvider');
  return context;
}
