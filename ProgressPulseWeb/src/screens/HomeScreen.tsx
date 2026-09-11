import { useMemo } from 'react';
import { DeltaBadge } from '../components/DeltaBadge';
import { useProgress } from '../context/ProgressContext';
import { lifeScore, lifeScoreChange, ratingChange } from '../lib/analytics';
import { ratingCategoryList, ratingDisplayName, type RatingCategory } from '../types';
import { formatDelta, moneyText, monthLong, ratingText } from '../utils/format';

export function HomeScreen({ onCompleteReview, onEditCurrent }: { onCompleteReview: () => void; onEditCurrent: () => void }) {
  const { entries, currentMonthEntry, entryForMonth } = useProgress();
  const now = new Date();
  const latest = entries.at(-1);
  const displayEntry = currentMonthEntry ?? latest;
  const previous = useMemo(() => {
    if (!displayEntry) return undefined;
    return entryForMonth(displayEntry.month === 1 ? displayEntry.year - 1 : displayEntry.year, displayEntry.month === 1 ? 12 : displayEntry.month - 1);
  }, [displayEntry, entryForMonth]);
  const score = displayEntry ? lifeScore(displayEntry) : null;
  const scoreDelta = displayEntry ? lifeScoreChange(displayEntry, previous ?? null) : null;
  const moneyDelta = displayEntry && previous ? displayEntry.money - previous.money : undefined;
  const mover = useMemo(() => {
    if (!displayEntry || !previous) return null;
    const candidates = ratingCategoryList.map((category) => ({ category, delta: ratingChange(displayEntry[category], previous[category]) })).filter((item): item is { category: RatingCategory; delta: number } => item.delta !== null);
    return candidates.sort((a, b) => b.delta - a.delta)[0] ?? null;
  }, [displayEntry, previous]);

  if (!displayEntry) {
    return <section className="empty-state"><span className="eyebrow">September 2026</span><h2>No reviews yet.</h2><p>Complete your first monthly review to start seeing your progress.</p><button className="primary-button" type="button" onClick={onCompleteReview}>Complete September Review</button></section>;
  }

  const currentMonth = monthLong(now.getFullYear(), now.getMonth() + 1);
  const reviewName = monthLong(displayEntry.year, displayEntry.month);
  return (
    <div className="screen-stack">
      <section className="home-intro">
        <span className="eyebrow">{currentMonth}</span>
        <h2>{currentMonthEntry ? 'Your month at a glance' : `${reviewName} Review`}</h2>
        <p>{currentMonthEntry ? 'Keep the momentum going.' : `${ratingText(score ?? undefined)} Life Score · ${moneyText(displayEntry.money)}`}</p>
        <button className="primary-button" type="button" onClick={currentMonthEntry ? onEditCurrent : onCompleteReview}>{currentMonthEntry ? `Edit ${currentMonth} Review` : `Complete ${currentMonth} Review`}</button>
      </section>

      <section className="snapshot" aria-label="Current snapshot">
        <div className="snapshot-primary"><span className="eyebrow">Life score</span><strong>{ratingText(score ?? undefined)}</strong><DeltaBadge value={scoreDelta ?? undefined} /></div>
        <div className="snapshot-metric"><span>Money</span><strong>{moneyText(displayEntry.money)}</strong><DeltaBadge value={moneyDelta} asMoney /></div>
      </section>

      <section className="section-block">
        <div className="section-heading"><h3>Ratings</h3><span>{reviewName}</span></div>
        <div className="rating-list">
          {ratingCategoryList.map((category) => {
            const value = displayEntry[category];
            const delta = previous ? ratingChange(value, previous[category]) : null;
            return <div className="rating-scan-row" key={category}><span>{ratingDisplayName[category]}</span><div className="rating-track" aria-hidden="true"><i style={{ width: `${(value ?? 0) * 10}%` }} /></div><strong>{ratingText(value)}</strong><span className="rating-delta">{delta === null ? '—' : formatDelta(delta)}</span></div>;
          })}
        </div>
      </section>

      <section className="focus-block"><div className="section-heading"><h3>Focus</h3><span>{reviewName}</span></div><p>{displayEntry.changes || 'No focus set for this month.'}</p></section>
      {mover && mover.delta > 0 ? <p className="quiet-insight"><strong>{ratingDisplayName[mover.category]}</strong> improved the most last month: {formatDelta(mover.delta)}.</p> : null}
    </div>
  );
}
