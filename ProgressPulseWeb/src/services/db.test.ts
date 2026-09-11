import { beforeEach, describe, expect, it } from 'vitest';
import { createBackup, db, loadEntries, mergeEntries, parseBackupPayload, replaceEntries, upsertEntry } from './db';
import type { MonthlyEntry } from '../types';

function entry(year: number, month: number, money: number, sex?: number): MonthlyEntry {
  return { id: `${year}-${month}-${money}`, year, month, monthKey: year * 100 + month, money, health: 6, sex, changes: 'Keep the focus text', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
}

beforeEach(async () => { await db.entries.clear(); });

describe('backup and persistence', () => {
  it('preserves optional fields, negative money, and Changes through backup validation', () => {
    const parsed = parseBackupPayload(JSON.stringify(createBackup([entry(2026, 9, -9000, 7.5)])));
    expect(parsed.version).toBe(1);
    expect(parsed.exportedAt).toBeTruthy();
    expect(parsed.entries[0]).toMatchObject({ money: -9000, sex: 7.5, changes: 'Keep the focus text' });
  });
  it('deduplicates replace and merge data by calendar month', async () => {
    await replaceEntries([entry(2026, 9, 100), entry(2026, 9, 200)]);
    expect((await loadEntries()).map((item) => item.money)).toEqual([200]);
    await mergeEntries([entry(2026, 9, 300), entry(2026, 10, 400)]);
    expect((await loadEntries()).map((item) => item.money)).toEqual([300, 400]);
  });
  it('updates an existing month instead of creating a duplicate', async () => {
    await upsertEntry({ year: 2026, month: 9, money: 100, health: 5, changes: 'First' });
    await upsertEntry({ year: 2026, month: 9, money: 200, health: 6, changes: 'Edited' });
    expect(await loadEntries()).toHaveLength(1);
    expect((await loadEntries())[0]).toMatchObject({ money: 200, health: 6, changes: 'Edited' });
  });
  it('rejects invalid imports before a replace can mutate stored data', async () => {
    await replaceEntries([entry(2026, 8, 123)]);
    expect(() => parseBackupPayload('{"version":2,"entries":[]}')).toThrow('Unsupported backup version');
    expect(await loadEntries()).toHaveLength(1);
  });
});
