import Dexie from 'dexie';
import type { EntryInput, ImportPayload, MonthlyEntry, ParsedHistoryEntry } from '../types';
import { monthKey } from './monthKey';

class ProgressPulseDatabase extends Dexie {
  entries!: Dexie.Table<MonthlyEntry, string>;

  constructor() {
    super('ProgressPulse');

    this.version(1).stores({
      entries: 'id, monthKey, year, month, updatedAt'
    });
  }
}

export const db = new ProgressPulseDatabase();

function toEntry(input: EntryInput, existing?: MonthlyEntry): MonthlyEntry {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? crypto.randomUUID(),
    year: input.year,
    month: input.month,
    monthKey: monthKey(input.year, input.month),
    money: input.money,
    relationships: input.relationships,
    health: input.health,
    energy: input.energy,
    speaking: input.speaking,
    mindAndThought: input.mindAndThought,
    strength: input.strength,
    appearance: input.appearance,
    sex: input.sex,
    changes: input.changes,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
}

export async function loadEntries(): Promise<MonthlyEntry[]> {
  return db.entries.orderBy('monthKey').toArray();
}

export async function findByMonth(year: number, month: number): Promise<MonthlyEntry | undefined> {
  return db.entries.where('monthKey').equals(monthKey(year, month)).first();
}

export async function upsertEntry(input: EntryInput): Promise<MonthlyEntry> {
  const existing = await findByMonth(input.year, input.month);
  const entry = toEntry(input, existing);
  await db.entries.put(entry);
  return entry;
}

export async function deleteEntry(id: string): Promise<void> {
  await db.entries.delete(id);
}

export async function clearEntries(): Promise<void> {
  await db.entries.clear();
}

export async function replaceEntries(entries: MonthlyEntry[]): Promise<void> {
  const unique = dedupeByMonth(entries);
  await db.transaction('rw', db.entries, async () => {
    await db.entries.clear();
    if (unique.length) await db.entries.bulkAdd(unique);
  });
}

export async function mergeEntries(entries: MonthlyEntry[]): Promise<void> {
  const existing = await loadEntries();
  const byMonth = new Map<number, MonthlyEntry>(existing.map((entry) => [entry.monthKey, entry]));

  await db.transaction('rw', db.entries, async () => {
    for (const incoming of dedupeByMonth(entries)) {
      const current = byMonth.get(incoming.monthKey);
      const mapped = {
        ...incoming,
        id: current?.id ?? incoming.id,
        createdAt: current?.createdAt ?? incoming.createdAt,
        updatedAt: new Date().toISOString(),
        monthKey: monthKey(incoming.year, incoming.month)
      };
      await db.entries.put(mapped);
      byMonth.set(mapped.monthKey, mapped);
    }
  });
}

export function toDbEntryFromParsed(record: ParsedHistoryEntry): MonthlyEntry {
  if (record.money === undefined) throw new Error('Historical entry is missing Money');
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    year: record.year,
    month: record.month,
    monthKey: monthKey(record.year, record.month),
    money: record.money,
    relationships: record.relationships,
    health: record.health,
    energy: record.energy,
    speaking: record.speaking,
    mindAndThought: record.mindAndThought,
    strength: record.strength,
    appearance: record.appearance,
    sex: record.sex,
    changes: record.changes,
    createdAt: now,
    updatedAt: now
  };
}

export function parseBackupPayload(rawText: string): ImportPayload {
  const parsed = JSON.parse(rawText) as Record<string, unknown>;
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid payload format');
  }

  if ('version' in parsed && parsed.version !== 1) {
    throw new Error('Unsupported backup version');
  }

  if ('schemaVersion' in parsed && parsed.schemaVersion !== 1) {
    throw new Error('Unsupported backup version');
  }

  if (!Array.isArray(parsed.entries)) {
    throw new Error('Invalid backup file');
  }

  const normalized = dedupeByMonth(parsed.entries.map((entry) => normalizeBackupEntry(entry)));
  const exportedAt = typeof parsed.exportedAt === 'string' && !Number.isNaN(Date.parse(parsed.exportedAt))
    ? String(parsed.exportedAt)
    : new Date().toISOString();

  return {
    version: 1,
    schemaVersion: 1,
    exportedAt,
    entries: normalized
  };
}

function normalizeBackupEntry(entry: unknown): MonthlyEntry {
  if (!entry || typeof entry !== 'object') throw new Error('Invalid backup entry');
  const candidate = entry as Record<string, unknown>;

  const year = Number(candidate.year);
  const month = Number(candidate.month);
  const money = Number(candidate.money);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Invalid month/year in backup entry');
  }

  if (!Number.isFinite(money)) {
    throw new Error('Invalid money in backup entry');
  }

  return {
    id:
      typeof candidate.id === 'string'
        ? candidate.id
        : `${year}-${String(month).padStart(2, '0')}-${Date.parse(String(candidate.updatedAt || candidate.createdAt)) || crypto.randomUUID()}`,
    year,
    month,
    monthKey: monthKey(year, month),
    money,
    relationships: toNumberOrUndefined(candidate.relationships),
    health: toNumberOrUndefined(candidate.health),
    energy: toNumberOrUndefined(candidate.energy),
    speaking: toNumberOrUndefined(candidate.speaking),
    mindAndThought: toNumberOrUndefined(candidate.mindAndThought),
    strength: toNumberOrUndefined(candidate.strength),
    appearance: toNumberOrUndefined(candidate.appearance),
    sex: toNumberOrUndefined(candidate.sex),
    changes: typeof candidate.changes === 'string' ? candidate.changes : '',
    createdAt: isDateString(candidate.createdAt) ? String(candidate.createdAt) : new Date().toISOString(),
    updatedAt: isDateString(candidate.updatedAt) ? String(candidate.updatedAt) : new Date().toISOString()
  };
}

function toNumberOrUndefined(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) throw new Error('Invalid rating in backup entry');
  return Math.max(0, Math.min(10, Math.round(parsed * 2) / 2));
}

function dedupeByMonth(entries: MonthlyEntry[]): MonthlyEntry[] {
  const byMonth = new Map<number, MonthlyEntry>();
  for (const entry of entries) {
    byMonth.set(monthKey(entry.year, entry.month), {
      ...entry,
      monthKey: monthKey(entry.year, entry.month)
    });
  }
  return Array.from(byMonth.values()).sort((a, b) => a.monthKey - b.monthKey);
}

function isDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

export function createBackup(entries: MonthlyEntry[]) {
  return {
    version: 1 as const,
    schemaVersion: 1 as const,
    exportedAt: new Date().toISOString(),
    entries
  };
}

export function backupFilename(d: Date) {
  return `progress-tracker-backup-${d.toISOString().slice(0, 10)}.json`;
}

export function downloadAsFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
