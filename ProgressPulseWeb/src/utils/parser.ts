import type { ParsedHistoryEntry } from '../types';
import { monthKey } from '../services/monthKey';

const monthHeader = /^\s*(\d{1,2})\/(\d{2,4})\s*$/;

const labelMap: Record<string, keyof ParsedHistoryEntry | 'changes'> = {
  money: 'money',
  relationships: 'relationships',
  health: 'health',
  energy: 'energy',
  speaking: 'speaking',
  'mind and thought': 'mindAndThought',
  'mind & thought': 'mindAndThought',
  strength: 'strength',
  sex: 'sex',
  appearance: 'appearance',
  change: 'changes',
  changes: 'changes'
};

function parseMoney(raw: string): number | null {
  const clean = raw.trim().toLowerCase().replace(/,/g, '');
  const match = clean.match(/(-?\$?\s*\d+(?:\.\d+)?)\s*(k)?/i);
  if (!match) return null;

  const numeric = Number(match[1].replace(/\$/g, '').trim());
  if (Number.isNaN(numeric)) return null;
  return numeric * (match[2] ? 1000 : 1);
}

function normalizeRating(raw: string): number | undefined {
  const match = raw.match(/-?\d+(?:\.\d+)?/);
  if (!match) return undefined;
  const value = Number(match[0]);
  if (Number.isNaN(value)) return undefined;
  const snapped = Math.round(value * 2) / 2;
  return Math.min(10, Math.max(0, snapped));
}

export function parseMonthLine(line: string): { month: number; year: number } | null {
  const match = monthHeader.exec(line);
  if (!match) return null;
  const month = Number(match[1]);
  let year = Number(match[2]);
  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || !Number.isInteger(month)) return null;
  return { month, year };
}

export function parseHistoricalText(raw: string): ParsedHistoryEntry[] {
  const normalized = raw.replace(/\r\n/g, '\n');
  const chunks = normalized
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const out: ParsedHistoryEntry[] = [];
  const seen = new Set<number>();

  for (const chunk of chunks) {
    const lines = chunk
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) continue;
    const header = parseMonthLine(lines[0]);
    if (!header) continue;

    const entry: ParsedHistoryEntry = {
      year: header.year,
      month: header.month,
      changes: ''
    };

    for (const line of lines.slice(1)) {
      const index = line.indexOf(':');
      if (index < 0) continue;

      const rawKey = line.slice(0, index).trim().toLowerCase();
      const rawValue = line.slice(index + 1).trim();
      const key = labelMap[rawKey];
      if (!key) continue;

      if (key === 'changes') {
        entry.changes = rawValue;
      } else if (key === 'money') {
        const money = parseMoney(rawValue);
        if (money !== null) {
          entry.money = money;
        }
      } else {
        const normalized = normalizeRating(rawValue);
        if (normalized !== undefined) {
          entry[key] = normalized;
        }
      }
    }

    if (typeof entry.money !== 'number') continue;

    const key = monthKey(entry.year, entry.month);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }

  return out.sort((a, b) => {
    if (a.year === b.year) return a.month - b.month;
    return a.year - b.year;
  });
}

export function normalizeBackup(raw: unknown): ParsedHistoryEntry {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid entry object');
  }

  const value = raw as Record<string, unknown>;
  const year = Number(value.year);
  const month = Number(value.month);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month/year: ${String(value.year)}/${String(value.month)}`);
  }

  const money = Number(value.money);
  if (!Number.isFinite(money)) {
    throw new Error(`Invalid money in ${month}/${year}`);
  }

  return {
    year,
    month,
    money,
    relationships: toRating(value.relationships),
    health: toRating(value.health),
    energy: toRating(value.energy),
    speaking: toRating(value.speaking),
    mindAndThought: toRating(value.mindAndThought),
    strength: toRating(value.strength),
    appearance: toRating(value.appearance),
    sex: toRating(value.sex),
    changes: typeof value.changes === 'string' ? value.changes : ''
  };
}

function toRating(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(0, Math.min(10, Math.round(parsed * 2) / 2));
}
