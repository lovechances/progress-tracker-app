import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useProgress } from '../context/ProgressContext';
import { lifeScore, ratingChange } from '../lib/analytics';
import { ratingCategoryList, ratingDisplayName, type MonthlyEntry, type RatingCategory } from '../types';
import { formatDelta, moneyText, monthLong, ratingText } from '../utils/format';

function changeSummary(entry: MonthlyEntry, previous?: MonthlyEntry) {
  if (!previous) return { best: null, worst: null };
  const changes = ratingCategoryList.map((category) => ({ category, delta: ratingChange(entry[category], previous[category]) })).filter((item): item is { category: RatingCategory; delta: number } => item.delta !== null);
  const sorted = [...changes].sort((a, b) => b.delta - a.delta);
  return { best: sorted[0]?.delta && sorted[0].delta > 0 ? sorted[0] : null, worst: sorted.at(-1)?.delta && sorted.at(-1)!.delta < 0 ? sorted.at(-1)! : null };
}

export function HistoryScreen({ onSelect }: { onSelect: (entry: MonthlyEntry) => void }) {
  const { entries, years, entryForMonth } = useProgress();
  const [year, setYear] = useState<number | 'all'>('all');
  const filtered = useMemo(() => (year === 'all' ? [...entries] : entries.filter((entry) => entry.year === year)).reverse(), [entries, year]);

  return <div className="screen-stack history-screen">
    <section className="page-intro"><span className="eyebrow">Your timeline</span><h2>History</h2><p>{entries.length ? `${entries.length} monthly reviews` : 'No reviews yet.'}</p></section>
    <div className="filter-scroll" role="tablist" aria-label="Filter history by year"><button className={`filter-pill ${year === 'all' ? 'selected' : ''}`} type="button" onClick={() => setYear('all')}>All</button>{years.map((value) => <button key={value} className={`filter-pill ${year === value ? 'selected' : ''}`} type="button" onClick={() => setYear(value)}>{value}</button>)}</div>
    <section className="timeline-list">{filtered.map((entry) => {
      const previous = entryForMonth(entry.month === 1 ? entry.year - 1 : entry.year, entry.month === 1 ? 12 : entry.month - 1);
      const summary = changeSummary(entry, previous);
      const focus = entry.changes.replace(/\s+/g, ' ').trim();
      return <button className="timeline-item" type="button" key={entry.id} onClick={() => onSelect(entry)}><div className="timeline-top"><div><strong>{monthLong(entry.year, entry.month)}</strong><span>{moneyText(entry.money)}</span></div><div className="timeline-score"><strong>{ratingText(lifeScore(entry) ?? undefined)}</strong><span>Life score</span></div></div><div className="timeline-changes">{summary.best ? <span className="positive-text">{ratingDisplayName[summary.best.category]} {formatDelta(summary.best.delta)}</span> : <span>First review</span>}{summary.worst ? <span className="negative-text">{ratingDisplayName[summary.worst.category]} {formatDelta(summary.worst.delta)}</span> : null}</div>{focus ? <p>{focus}</p> : null}<Icon name="chevron" /></button>;
    })}</section>
  </div>;
}
