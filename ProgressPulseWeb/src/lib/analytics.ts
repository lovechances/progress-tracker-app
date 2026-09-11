import type { MonthlyEntry, RatingCategory, TrendWindow } from '../types';
import { monthLong } from '../utils/format';
import { ratingCategoryList } from '../types';

type SeriesPoint = {
  date: string;
  label: string;
  value: number;
};

export const lifeCategories: RatingCategory[] = ratingCategoryList;

export function normalizeSeries(entries: MonthlyEntry[]): MonthlyEntry[] {
  return [...entries].sort((a, b) => a.monthKey - b.monthKey);
}

export function lifeScore(entry: MonthlyEntry): number | null {
  const values = lifeCategories
    .map((category) => entry[category])
    .filter((value): value is number => typeof value === 'number');

  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function lifeScoreSeries(entries: MonthlyEntry[]): SeriesPoint[] {
  return normalizeSeries(entries)
    .map((entry) => {
      const score = lifeScore(entry);
      if (score === null) return null;
      return {
        date: `${entry.year}-${String(entry.month).padStart(2, '0')}`,
        label: monthLong(entry.year, entry.month).toUpperCase(),
        value: score
      };
    })
    .filter((point): point is SeriesPoint => Boolean(point));
}

export function moneySeries(entries: MonthlyEntry[]): SeriesPoint[] {
  return normalizeSeries(entries).map((entry) => ({
    date: `${entry.year}-${String(entry.month).padStart(2, '0')}`,
    label: monthLong(entry.year, entry.month).toUpperCase(),
    value: entry.money
  }));
}

export function categorySeries(entries: MonthlyEntry[], category: RatingCategory): SeriesPoint[] {
  return normalizeSeries(entries)
    .map((entry) => {
      const value = entry[category];
      if (value === undefined) return null;
      return {
        date: `${entry.year}-${String(entry.month).padStart(2, '0')}`,
        label: monthLong(entry.year, entry.month).toUpperCase(),
        value
      };
    })
    .filter((point): point is SeriesPoint => Boolean(point));
}

export function ratingChange(current: number | undefined, previous: number | undefined): number | null {
  if (current === undefined || previous === undefined) return null;
  return current - previous;
}

export function lifeScoreChange(current: MonthlyEntry | null, previous: MonthlyEntry | null): number | null {
  if (!current || !previous) return null;
  const currentScore = lifeScore(current);
  const previousScore = lifeScore(previous);
  if (currentScore === null || previousScore === null) return null;
  return currentScore - previousScore;
}

export function rollingAverage(values: number[], window: number): number | null {
  if (values.length < window) return null;
  const tail = values.slice(values.length - window);
  return tail.reduce((sum, value) => sum + value, 0) / tail.length;
}

export function threeMonthLifeScoreAverage(entries: MonthlyEntry[]): number | null {
  return rollingAverage(lifeScoreSeries(entries).map((point) => point.value), 3);
}

export function sixMonthLifeScoreAverage(entries: MonthlyEntry[]): number | null {
  return rollingAverage(lifeScoreSeries(entries).map((point) => point.value), 6);
}

export function changeFrom(series: SeriesPoint[], periods: number): number | null {
  if (series.length < periods + 1) return null;
  return series.at(-1)!.value - series.at(-1 - periods)!.value;
}

export function allTimeHigh(entries: MonthlyEntry[], extractor: (entry: MonthlyEntry) => number | null): MonthlyEntry | null {
  let best: MonthlyEntry | null = null;
  let score = -Infinity;
  for (const entry of normalizeSeries(entries)) {
    const value = extractor(entry);
    if (value !== null && value > score) {
      best = entry;
      score = value;
    }
  }
  return best;
}

export function allTimeLow(entries: MonthlyEntry[], extractor: (entry: MonthlyEntry) => number | null): MonthlyEntry | null {
  let best: MonthlyEntry | null = null;
  let score = Infinity;
  for (const entry of normalizeSeries(entries)) {
    const value = extractor(entry);
    if (value !== null && value < score) {
      best = entry;
      score = value;
    }
  }
  return best;
}

export function allTimeHighForCategory(entries: MonthlyEntry[], category: RatingCategory) {
  const target = allTimeHigh(entries, (entry) => (entry[category] as number | undefined) ?? null);
  if (!target) return null;
  const value = target[category];
  if (value === undefined) return null;
  return { entry: target, value };
}

export function allTimeHighLifeScore(entries: MonthlyEntry[]) {
  const target = allTimeHigh(entries, (entry) => lifeScore(entry));
  if (!target) return null;
  const value = lifeScore(target);
  if (value === null) return null;
  return { entry: target, value };
}

export function allTimeLowLifeScore(entries: MonthlyEntry[]) {
  const target = allTimeLow(entries, (entry) => lifeScore(entry));
  if (!target) return null;
  const value = lifeScore(target);
  if (value === null) return null;
  return { entry: target, value };
}

export function allTimeHighMoney(entries: MonthlyEntry[]) {
  const target = allTimeHigh(entries, (entry) => entry.money);
  if (!target) return null;
  return { entry: target, value: target.money };
}

export function allTimeLowMoney(entries: MonthlyEntry[]) {
  const target = allTimeLow(entries, (entry) => entry.money);
  if (!target) return null;
  return { entry: target, value: target.money };
}

export function highestToLowest(entries: MonthlyEntry[]): string {
  const items = normalizeSeries(entries);
  if (!items.length) return '';
  return monthLong(items.at(-1)!.year, items.at(-1)!.month).toUpperCase();
}

export function momentum(entries: MonthlyEntry[]) {
  const ordered = normalizeSeries(entries);
  const window = 3;
  const improving: Array<{ category: RatingCategory; change: number }> = [];
  const declining: Array<{ category: RatingCategory; change: number }> = [];
  const stable: Array<{ category: RatingCategory; change: number }> = [];

  for (const category of lifeCategories) {
    const values = ordered
      .map((entry) => entry[category])
      .filter((value): value is number => value !== undefined);

    if (values.length < window * 2) continue;

    const recent = values.slice(-window);
    const previous = values.slice(-window * 2, -window);
    const recentAvg = recent.reduce((sum, value) => sum + value, 0) / recent.length;
    const previousAvg = previous.reduce((sum, value) => sum + value, 0) / previous.length;
    const delta = recentAvg - previousAvg;

    if (Math.abs(delta) < 0.15) {
      stable.push({ category, change: 0 });
      continue;
    }

    if (delta > 0) improving.push({ category, change: Number(delta.toFixed(1)) });
    if (delta < 0) declining.push({ category, change: Number(delta.toFixed(1)) });
  }

  improving.sort((a, b) => b.change - a.change);
  declining.sort((a, b) => a.change - b.change);

  return { improving, declining, stable };
}

export function firstVsLatestDelta(entries: MonthlyEntry[]) {
  const ordered = normalizeSeries(entries);
  if (ordered.length < 2) return [];

  const first = ordered[0];
  const latest = ordered.at(-1)!;

  return lifeCategories
    .map((category) => {
      const start = first[category];
      const end = latest[category];
      if (start === undefined || end === undefined) return null;
      return { category, value: end - start };
    })
    .filter((item): item is { category: RatingCategory; value: number } => item !== null);
}

export function bestWorst3MonthLife(entries: MonthlyEntry[]) {
  const points = lifeScoreSeries(entries);
  if (points.length < 3) return { best: null, worst: null };

  let best: { start: string; end: string; average: number } | null = null;
  let worst: { start: string; end: string; average: number } | null = null;

  for (let index = 2; index < points.length; index += 1) {
    const range = points.slice(index - 2, index + 1);
    const average = range.reduce((sum, item) => sum + item.value, 0) / 3;
    const candidate = {
      start: range[0].label,
      end: range[2].label,
      average
    };

    if (!best || candidate.average > best.average) best = candidate;
    if (!worst || candidate.average < worst.average) worst = candidate;
  }

  return { best, worst };
}

export function largestMonthLifeDelta(entries: MonthlyEntry[]) {
  const ordered = normalizeSeries(entries);
  if (ordered.length < 2) return { best: null, worst: null };

  let best: { from: string; to: string; delta: number } | null = null;
  let worst: { from: string; to: string; delta: number } | null = null;

  for (let index = 1; index < ordered.length; index += 1) {
    const prevScore = lifeScore(ordered[index - 1]);
    const currScore = lifeScore(ordered[index]);
    if (prevScore === null || currScore === null) continue;

    const delta = currScore - prevScore;
    const candidate = {
      from: monthLong(ordered[index - 1].year, ordered[index - 1].month).toUpperCase(),
      to: monthLong(ordered[index].year, ordered[index].month).toUpperCase(),
      delta
    };

    if (!best || delta > best.delta) best = candidate;
    if (!worst || delta < worst.delta) worst = candidate;
  }

  return { best, worst };
}

export function trendWindowEntries(entries: MonthlyEntry[], window: TrendWindow): MonthlyEntry[] {
  const ordered = normalizeSeries(entries);
  if (window === 'ALL') return ordered;
  if (window === '6M') return ordered.slice(-6);
  return ordered.slice(-12);
}

export function strongestCategory(entry: MonthlyEntry | undefined): RatingCategory | null {
  if (!entry) return null;
  const values = lifeCategories
    .map((category) => {
      const value = entry[category];
      return value === undefined ? null : { category, value };
    })
    .filter((entry): entry is { category: RatingCategory; value: number } => Boolean(entry));

  if (!values.length) return null;
  return values.sort((a, b) => b.value - a.value)[0].category;
}

export function weakestCategory(entry: MonthlyEntry | undefined): RatingCategory | null {
  if (!entry) return null;
  const values = lifeCategories
    .map((category) => {
      const value = entry[category];
      return value === undefined ? null : { category, value };
    })
    .filter((entry): entry is { category: RatingCategory; value: number } => Boolean(entry));

  if (!values.length) return null;
  return values.sort((a, b) => a.value - b.value)[0].category;
}
