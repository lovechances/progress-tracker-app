import { useMemo, useState } from 'react';
import { useProgress } from '../context/ProgressContext';
import { monthLong, ratingText, moneyText } from '../utils/format';
import { lifeScore } from '../lib/analytics';
import { ratingCategoryList, ratingDisplayName, type MonthlyEntry } from '../types';

export function HistoryScreen({
  onSelect
}: {
  onSelect: (entry: MonthlyEntry) => void;
}) {
  const { entries, years } = useProgress();
  const [filterYear, setFilterYear] = useState<number | 'all'>('all');

  const filtered = useMemo(() => {
    if (filterYear === 'all') return [...entries].reverse();
    return [...entries].filter((entry) => entry.year === filterYear).reverse();
  }, [entries, filterYear]);

  return (
    <div className="stack">
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 className="section-title">History</h2>
          <select
            value={filterYear}
            onChange={(event) => {
              const value = event.target.value === 'all' ? 'all' : Number(event.target.value);
              setFilterYear(value);
            }}
          >
            <option value="all">All years</option>
            {years.map((year) => (
              <option value={year} key={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? <div className="notice">No entries for this selection.</div> : null}

        <div className="stack" style={{ marginTop: 10 }}>
          {filtered.map((entry) => {
            const life = lifeScore(entry);
            return (
              <button
                className="card"
                onClick={() => onSelect(entry)}
                key={entry.id}
                style={{ textAlign: 'left' }}
                type="button"
              >
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>{monthLong(entry.year, entry.month).toUpperCase()}</strong>
                  <span>{moneyText(entry.money)}</span>
                </div>
                <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
                  <span className="notice">Life Score</span>
                  <span>{life !== null ? ratingText(life) : '—'}</span>
                </div>
                <div className="history-ratings" aria-label="Monthly ratings">
                  {ratingCategoryList.map((category) => (
                    <span key={category}>{ratingDisplayName[category]} {ratingText(entry[category])}</span>
                  ))}
                </div>
                <div className="notice" style={{ marginTop: 8 }}>
                  {entry.changes ? entry.changes : 'No focus text.'}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
