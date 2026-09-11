import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parseHistoricalText } from './parser';

describe('historical parser', () => {
  it('normalizes known money and rating formats without inventing missing money', () => {
    const entries = parseHistoricalText(`8/26\nMoney: 5.5k\nAppearance: 6.510\nHealth: 7/10 (sick)\nSex: 6.5\nChanges: budget\n\n9/26\nHealth: 7`);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ money: 5500, appearance: 6.5, health: 7, sex: 6.5, changes: 'budget' });
  });
  it('parses the complete private source from January 2024 through August 2026', async () => {
    const raw = await readFile('../past.txt', 'utf8');
    const entries = parseHistoricalText(raw);
    expect(entries).toHaveLength(32);
    expect(entries[0]).toMatchObject({ year: 2024, month: 1 });
    expect(entries.at(-1)).toMatchObject({ year: 2026, month: 8, money: 5500 });
  });
});
