import { useMemo } from 'react';
import { useProgress } from '../context/ProgressContext';
import { monthLong, ratingText, formatDelta, moneyText } from '../utils/format';
import { DeltaBadge } from '../components/DeltaBadge';
import { lifeScore, lifeScoreChange, ratingChange, strongestCategory, weakestCategory } from '../lib/analytics';
import { ratingCategoryList, ratingDisplayName } from '../types';

interface HomeScreenProps {
  onCompleteReview: () => void;
  onEditCurrent?: () => void;
}

export function HomeScreen({ onCompleteReview, onEditCurrent }: HomeScreenProps) {
  const { entries, entryForMonth, currentMonthEntry } = useProgress();
  const hasData = entries.length > 0;

  const now = new Date();
  const currentMonth = monthLong(now.getFullYear(), now.getMonth() + 1);
  const latest = entries.at(-1);
  const latestLife = latest ? lifeScore(latest) : null;
  const previous = entries.length >= 2 ? entries.at(-2) : undefined;
  const lifeDelta = latest ? lifeScoreChange(latest, previous ?? null) : null;

  const target = currentMonthEntry ?? latest;

  const strongest = strongestCategory(target);
  const weakest = weakestCategory(target);

  const previousOfTarget = useMemo(() => {
    if (!target) return undefined;
    const prevMonth = target.month === 1 ? 12 : target.month - 1;
    const prevYear = target.month === 1 ? target.year - 1 : target.year;
    return entryForMonth(prevYear, prevMonth);
  }, [entryForMonth, target]);

  const ctaLabel = target ? 'Update Current Month' : 'Complete Monthly Review';

  return (
    <div className="stack">
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div className="notice">HOME</div>
            <h2 className="section-title">{currentMonth}</h2>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {currentMonthEntry ? <button onClick={onEditCurrent} type="button">Edit This Month</button> : null}
            {hasData && !currentMonthEntry ? <button onClick={onCompleteReview} type="button">{ctaLabel}</button> : null}
            {!hasData ? <button onClick={onCompleteReview} type="button">{ctaLabel}</button> : null}
          </div>
        </div>

        <div className="stats-row" style={{ marginTop: 10 }}>
          <div className="kpi">
            <div className="notice">Latest Completed</div>
            <div>{latest ? monthLong(latest.year, latest.month) : '—'}</div>
          </div>
          <div className="kpi">
            <div className="notice">Money</div>
            <div>{target ? moneyText(target.money) : '—'}</div>
          </div>
          <div className="kpi">
            <div className="notice">Life Score</div>
            <div>{latestLife !== null ? ratingText(latestLife) : '—'}</div>
          </div>
          <div className="kpi">
            <div className="notice">Life Score Δ</div>
            <div>{lifeDelta !== null ? <DeltaBadge value={lifeDelta} /> : '—'}</div>
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
            <span className="notice">Strongest: {strongest ? ratingDisplayName[strongest] : '—'}</span>
            <span className="notice">Weakest: {weakest ? ratingDisplayName[weakest] : '—'}</span>
        </div>

        <div className="notice" style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}>
          {target?.changes || 'No focus text saved for this month.'}
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Current ratings</h2>
        <div className="stack" style={{ marginTop: 8 }}>
          {ratingCategoryList.map((category) => {
            const value = target ? target[category] : undefined;
            const prev = previousOfTarget && previousOfTarget[category];
            const delta = previousOfTarget ? ratingChange(value, prev) : null;
            return (
              <div className="rating-row" key={category}>
                <div className="header">
                  <span>{ratingDisplayName[category]}</span>
                  <span className="row" style={{ gap: 8 }}>
                    <span>{ratingText(value)}</span>
                    <span>{delta !== null ? formatDelta(delta) : '—'}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
