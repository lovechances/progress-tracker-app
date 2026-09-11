import { useMemo, useState } from 'react';
import { monthLong, ratingText, moneyText } from '../utils/format';
import { lifeScore } from '../lib/analytics';
import { ratingDisplayName, ratingCategoryList } from '../types';
import { DeltaBadge } from '../components/DeltaBadge';
import type { MonthlyEntry } from '../types';

export function MonthDetailScreen({
  entry,
  previous,
  onEdit,
  onDelete,
  onBack
}: {
  entry: MonthlyEntry;
  previous?: MonthlyEntry;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const currentLife = lifeScore(entry);
  const previousLife = previous ? lifeScore(previous) : null;

  const lifeDelta =
    currentLife === null || previousLife === null ? null : Number((currentLife - previousLife).toFixed(1));

  const comparisons = useMemo(() => {
    const results = ratingCategoryList
      .map((category) => {
        const current = entry[category];
        const prior = previous?.[category];
        const delta = current === undefined || prior === undefined ? undefined : current - prior;
        return {
          category,
          current,
          delta
        };
      })
      .filter((item) => item.current !== undefined);

    const biggest = results.filter((item) => item.delta !== undefined) as Array<{
      category: (typeof ratingCategoryList)[number];
      current: number;
      delta: number;
    }>;

    const sorted = [...biggest].sort((a, b) => b.delta - a.delta);
    const best = sorted[0]?.delta && sorted[0].delta > 0 ? sorted[0] : undefined;
    const candidateWorst = sorted.at(-1);
    const worst = candidateWorst?.delta !== undefined && candidateWorst.delta < 0 ? candidateWorst : undefined;

    return { biggest, best, worst };
  }, [entry, previous]);

  return (
    <div className="stack">
      <button type="button" className="pill" onClick={onBack}>
        Back
      </button>

      <div className="card">
        <h2 className="section-title">{monthLong(entry.year, entry.month)}</h2>
        <div className="stats-row" style={{ marginTop: 10 }}>
          <div className="kpi">
            <div className="notice">Money</div>
            <div>{moneyText(entry.money)}</div>
          </div>
          <div className="kpi">
            <div className="notice">Life Score</div>
            <div>{currentLife !== null ? ratingText(currentLife) : '—'}</div>
          </div>
          <div className="kpi">
            <div className="notice">vs previous</div>
            <div>{lifeDelta !== null ? <DeltaBadge value={lifeDelta} /> : '—'}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">Ratings</h3>
        <div className="stack" style={{ marginTop: 8 }}>
          {ratingCategoryList.map((category) => {
            const current = entry[category];
            const prev = previous?.[category];
            const delta = current === undefined || prev === undefined ? undefined : current - prev;
            return (
              <div key={category} className="row" style={{ justifyContent: 'space-between' }}>
                <span>{ratingDisplayName[category]}</span>
                <span className="row" style={{ gap: 8 }}>
                  <span>{ratingText(current)}</span>
                  {delta === undefined ? <span className="notice">—</span> : <DeltaBadge value={delta} />}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">Changes / Focus</h3>
        <p style={{ whiteSpace: 'pre-wrap' }}>{entry.changes || 'No focus text.'}</p>
        {entry.sex !== undefined ? <p className="notice">Sex: {ratingText(entry.sex)}</p> : null}
      </div>

      <div className="card">
        <h3 className="section-title">Month-over-month</h3>
        <div className="row">
          <div>
            <div className="notice">BIGGEST IMPROVEMENT</div>
            <p>
              {comparisons.best
                ? `${ratingDisplayName[comparisons.best.category]} +${comparisons.best.delta.toFixed(1)}`
                : '—'}
            </p>
          </div>
          <div>
            <div className="notice">BIGGEST DECLINE</div>
            <p>
              {comparisons.worst
                ? `${ratingDisplayName[comparisons.worst.category]} ${comparisons.worst.delta.toFixed(1)}`
                : '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 8 }}>
        <button onClick={onEdit} type="button">Edit</button>
        {confirmDelete ? (
          <>
            <button onClick={onDelete} type="button">Confirm delete</button>
            <button onClick={() => setConfirmDelete(false)} type="button">Cancel</button>
          </>
        ) : <button onClick={() => setConfirmDelete(true)} type="button">Delete</button>}
      </div>
    </div>
  );
}
