import { describe, expect, it } from 'vitest';
import { allTimeHighLifeScore, allTimeLowMoney, categorySeries, changeFrom, lifeScore, lifeScoreSeries, momentum, moneySeries, normalizeSeries, rollingAverage, seriesRangeChange, trendWindowEntries } from './analytics';
import type { MonthlyEntry } from '../types';

function entry(year: number, month: number, values: Partial<MonthlyEntry> = {}): MonthlyEntry {
  return { id: `${year}-${month}`, year, month, monthKey: year * 100 + month, money: 0, changes: '', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', ...values };
}

describe('analytics', () => {
  it('averages only available main ratings and excludes money and Sex', () => {
    expect(lifeScore(entry(2026, 1, { money: 9000, sex: 10, health: 8, energy: 6 }))).toBe(7);
  });
  it('sorts monthly entries chronologically and calculates rolling changes', () => {
    const entries = normalizeSeries([entry(2026, 2), entry(2025, 12), entry(2026, 1)]);
    expect(entries.map((item) => item.monthKey)).toEqual([202512, 202601, 202602]);
    expect(rollingAverage([3, 6, 9], 3)).toBe(6);
    expect(changeFrom([{ date: '', label: '', value: 2 }, { date: '', label: '', value: 4 }, { date: '', label: '', value: 7 }], 2)).toBe(5);
  });
  it('finds personal bests and negative-money lows', () => {
    const entries = [entry(2026, 1, { money: -9000, health: 3 }), entry(2026, 2, { money: 5000, health: 9 })];
    expect(allTimeHighLifeScore(entries)?.value).toBe(9);
    expect(allTimeLowMoney(entries)?.value).toBe(-9000);
  });
  it('compares the latest three available ratings with the preceding three', () => {
    const entries = [1, 2, 3, 7, 8, 9].map((health, index) => entry(2026, index + 1, { health }));
    expect(momentum(entries).improving).toContainEqual({ category: 'health', change: 6 });
  });

  it('uses the same 6M, 1Y, and All chart series for Life Score start-to-end change', () => {
    const entries = Array.from({ length: 13 }, (_, index) => entry(2025 + Math.floor(index / 12), (index % 12) + 1, { health: index }));
    expect(seriesRangeChange(lifeScoreSeries(trendWindowEntries(entries, '6M')))).toBe(5);
    expect(seriesRangeChange(lifeScoreSeries(trendWindowEntries(entries, '1Y')))).toBe(11);
    expect(seriesRangeChange(lifeScoreSeries(trendWindowEntries(entries, 'ALL')))).toBe(12);
  });

  it('calculates Money start-to-end changes including negative-to-positive and genuine zero values', () => {
    expect(seriesRangeChange(moneySeries([entry(2026, 1, { money: 1500 }), entry(2026, 2, { money: 5500 })]))).toBe(4000);
    expect(seriesRangeChange(moneySeries([entry(2026, 1, { money: 9500 }), entry(2026, 2, { money: 5500 })]))).toBe(-4000);
    expect(seriesRangeChange(moneySeries([entry(2026, 1, { money: -9000 }), entry(2026, 2, { money: 5500 })]))).toBe(14500);
    expect(seriesRangeChange(moneySeries([entry(2026, 1, { money: 0 }), entry(2026, 2, { money: 0 })]))).toBe(0);
  });

  it('ignores missing category values and returns no range change without two valid points', () => {
    const entries = [entry(2026, 1), entry(2026, 2, { health: 2 }), entry(2026, 3, { health: 5 })];
    expect(seriesRangeChange(categorySeries(entries, 'health'))).toBe(3);
    expect(seriesRangeChange(categorySeries([entry(2026, 1, { health: 7 }), entry(2026, 2, { health: 5 })], 'health'))).toBe(-2);
    expect(seriesRangeChange(categorySeries([entry(2026, 1, { health: 5 })], 'health'))).toBeNull();
    expect(seriesRangeChange(categorySeries([entry(2026, 1, { health: 5 }), entry(2026, 2, { health: 5 })], 'health'))).toBe(0);
  });
});
