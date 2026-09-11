import { useMemo, useState } from 'react';
import {
  ReferenceLine,
  ResponsiveContainer,
  Line,
  LineChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useProgress } from '../context/ProgressContext';
import {
  allTimeHighForCategory,
  allTimeHighLifeScore,
  allTimeHighMoney,
  allTimeLowLifeScore,
  allTimeLowMoney,
  bestWorst3MonthLife,
  categorySeries,
  changeFrom,
  lifeScoreSeries,
  largestMonthLifeDelta,
  momentum,
  moneySeries,
  threeMonthLifeScoreAverage,
  sixMonthLifeScoreAverage,
  trendWindowEntries
} from '../lib/analytics';
import { recurringThemes } from '../lib/focus';
import { ratingCategoryList, ratingDisplayName, type RatingCategory, type TrendWindow } from '../types';
import { formatDelta, moneyText, monthShort, ratingText } from '../utils/format';

const windows: Array<{ id: TrendWindow; label: string }> = [
  { id: '6M', label: '6M' },
  { id: '1Y', label: '1Y' },
  { id: 'ALL', label: 'All' }
];

type SeriesPoint = { date: string; label: string; value: number };

function chartStats(points: SeriesPoint[]) {
  if (!points.length) return null;
  const values = points.map((point) => point.value);
  const current = values.at(-1);
  const previous = values.at(-2);
  const high = Math.max(...values);
  const low = Math.min(...values);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    current,
    previous,
    change: current !== undefined && previous !== undefined ? current - previous : null,
    high,
    low,
    average,
    min: low,
    max: high,
    count: values.length
  };
}

function SimpleLineChart({
  points,
  color,
  showZeroLine = false,
  formatValue
}: {
  points: Array<{ date: string; label: string; value: number }>;
  color: string;
  showZeroLine?: boolean;
  formatValue?: (value: number) => string;
}) {
  if (points.length < 2) return <div className="notice">Not enough data yet.</div>;

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <CartesianGrid stroke="#243149" strokeDasharray="4 4" />
          <XAxis dataKey="label" minTickGap={10} fontSize={10} stroke="#7f8aa0" />
          <YAxis tickFormatter={formatValue} stroke="#7f8aa0" />
          <Tooltip
            formatter={(value) => {
              const numeric = Number(value);
              return [formatValue ? formatValue(numeric) : numeric.toFixed(1), 'Value'];
            }}
            labelFormatter={(label) => `Month: ${label}`}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.2} dot={false} />
          {showZeroLine ? <ReferenceLine y={0} stroke="#47556d" strokeDasharray="4 4" /> : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function InsightsScreen() {
  const { entries } = useProgress();
  const [lifeWindow, setLifeWindow] = useState<TrendWindow>('6M');
  const [categoryWindow, setCategoryWindow] = useState<TrendWindow>('6M');
  const [trendCategory, setTrendCategory] = useState<RatingCategory>('health');

  const lifeEntries = useMemo(() => trendWindowEntries(entries, lifeWindow), [entries, lifeWindow]);
  const lifePoints = useMemo(() => lifeScoreSeries(lifeEntries), [lifeEntries]);

  const moneyEntries = useMemo(() => trendWindowEntries(entries, categoryWindow), [entries, categoryWindow]);
  const moneyPoints = useMemo(() => moneySeries(moneyEntries), [moneyEntries]);

  const categoryPoints = useMemo(
    () => categorySeries(trendWindowEntries(entries, categoryWindow), trendCategory),
    [entries, categoryWindow, trendCategory]
  );

  const lifeStats = useMemo(() => chartStats(lifeScoreSeries(entries)), [entries]);
  const moneyStats = useMemo(() => chartStats(moneySeries(entries)), [entries]);

  const lifeThree = useMemo(() => threeMonthLifeScoreAverage(entries), [entries]);
  const lifeSix = useMemo(() => sixMonthLifeScoreAverage(entries), [entries]);

  const bestLife = allTimeHighLifeScore(entries);
  const worstLife = allTimeLowLifeScore(entries);
  const bestMoney = allTimeHighMoney(entries);
  const worstMoney = allTimeLowMoney(entries);

  const allMomentum = useMemo(() => momentum(entries), [entries]);

  const longTerm = useMemo(() => {
    if (!entries.length) return null;
    const first = entries[0];
    const latest = entries.at(-1)!;
    const ratings = ratingCategoryList
      .map((category) => {
        const start = first[category];
        const end = latest[category];
        if (start === undefined || end === undefined) return null;
        return {
          category,
          delta: end - start
        };
      })
      .filter((item): item is { category: RatingCategory; delta: number } => item !== null);

    return {
      start: first,
      latest,
      money: latest.money - first.money,
      ratings
    };
  }, [entries]);

  const periodStats = bestWorst3MonthLife(entries);
  const largest = largestMonthLifeDelta(entries);
  const recurring = useMemo(() => recurringThemes(entries), [entries]);

  return (
    <div className="stack">
      <div className="card">
        <h2 className="section-title">Overall Life Score</h2>
        <div className="stats-row" style={{ marginTop: 8 }}>
          <div className="kpi">
            <div className="notice">Current</div>
            <strong>{lifeStats?.current === undefined ? '—' : ratingText(lifeStats.current)}</strong>
          </div>
          <div className="kpi">
            <div className="notice">All-time High</div>
            <strong>{bestLife ? ratingText(bestLife.value) : '—'}</strong>
          </div>
          <div className="kpi">
            <div className="notice">All-time Low</div>
            <strong>{worstLife ? ratingText(worstLife.value) : '—'}</strong>
          </div>
          <div className="kpi">
            <div className="notice">3M / 6M avg</div>
            <strong>
              {lifeThree === null ? '—' : ratingText(lifeThree)} / {lifeSix === null ? '—' : ratingText(lifeSix)}
            </strong>
          </div>
        </div>
        <div className="notice" style={{ marginTop: 8 }}>
          Change from previous month: {lifeStats && lifeStats.change !== null ? formatDelta(lifeStats.change) : '—'}
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="section-title">Life Score Trend</h3>
          <div className="row">
            {windows.map((item) => (
              <button
                key={item.id}
                onClick={() => setLifeWindow(item.id)}
                type="button"
                className={lifeWindow === item.id ? 'pill good' : 'pill'}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <SimpleLineChart points={lifePoints} color="#67e8f9" formatValue={(value) => ratingText(value)} />
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="section-title">Money</h3>
          <div className="row">
            {windows.map((item) => (
              <button
                key={item.id}
                onClick={() => setCategoryWindow(item.id)}
                type="button"
                className={categoryWindow === item.id ? 'pill good' : 'pill'}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="stats-row" style={{ marginTop: 8 }}>
          <div className="kpi">
            <div className="notice">Current</div>
            <strong>{moneyStats && moneyStats.current !== undefined ? moneyText(moneyStats.current) : '—'}</strong>
          </div>
          <div className="kpi">
            <div className="notice">All-time High</div>
            <strong>{bestMoney ? moneyText(bestMoney.value) : '—'}</strong>
          </div>
          <div className="kpi">
            <div className="notice">All-time Low</div>
            <strong>{worstMoney ? moneyText(worstMoney.value) : '—'}</strong>
          </div>
          <div className="kpi">
            <div className="notice">1M / 3M / 12M</div>
            <strong>{moneyStats?.change === null || moneyStats?.change === undefined ? '—' : formatDelta(moneyStats.change, true)} / {changeFrom(moneySeries(entries), 3) === null ? '—' : formatDelta(changeFrom(moneySeries(entries), 3) as number, true)} / {changeFrom(moneySeries(entries), 12) === null ? '—' : formatDelta(changeFrom(moneySeries(entries), 12) as number, true)}</strong>
          </div>
        </div>

        <SimpleLineChart
          points={moneyPoints}
          color="#34d399"
          showZeroLine
          formatValue={(value) => moneyText(value)}
        />
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="section-title">Category Trends</h3>
          <select
            value={trendCategory}
            onChange={(event) => setTrendCategory(event.target.value as RatingCategory)}
          >
            {ratingCategoryList.map((category) => (
              <option key={category} value={category}>
                {ratingDisplayName[category]}
              </option>
            ))}
          </select>
        </div>

        <div className="stats-row" style={{ marginTop: 8 }}>
          <div className="kpi">
            <div className="notice">Current</div>
            <strong>{categoryPoints.length ? ratingText(categoryPoints.at(-1)!.value) : '—'}</strong>
          </div>
          <div className="kpi">
            <div className="notice">High / Low</div>
            <strong>
              {categoryPoints.length
                ? `${ratingText(Math.max(...categoryPoints.map((item) => item.value)))} / ${ratingText(Math.min(...categoryPoints.map((item) => item.value)))}`
                : '—'}
            </strong>
          </div>
          <div className="kpi">
            <div className="notice">Avg</div>
            <strong>
              {categoryPoints.length ? ratingText(categoryPoints.reduce((sum, item) => sum + item.value, 0) / categoryPoints.length) : '—'}
            </strong>
          </div>
          <div className="kpi">
            <div className="notice">3M / 12M</div>
            <strong>
              {changeFrom(categoryPoints, 3) === null ? '—' : formatDelta(changeFrom(categoryPoints, 3) as number)} / {changeFrom(categoryPoints, 12) === null ? '—' : formatDelta(changeFrom(categoryPoints, 12) as number)}
            </strong>
          </div>
        </div>

        <SimpleLineChart points={categoryPoints} color="#a78bfa" formatValue={(value) => ratingText(value)} />
      </div>

      <div className="card">
        <h3 className="section-title">Current Momentum (last 3 vs previous 3)</h3>
        <div className="grid-2" style={{ marginTop: 8 }}>
          <div>
            <div className="notice">Improving</div>
            <div className="stack">
              {allMomentum.improving.slice(0, 3).map((item) => (
                <div className="row" key={item.category} style={{ justifyContent: 'space-between' }}>
                  <span>{ratingDisplayName[item.category]}</span>
                  <span className="pill good">+{item.change}</span>
                </div>
              ))}
              {!allMomentum.improving.length ? <div className="notice">No improving categories currently.</div> : null}
            </div>
          </div>

          <div>
            <div className="notice">Declining</div>
            <div className="stack">
              {allMomentum.declining.slice(0, 3).map((item) => (
                <div className="row" key={item.category} style={{ justifyContent: 'space-between' }}>
                  <span>{ratingDisplayName[item.category]}</span>
                  <span className="pill bad">{item.change}</span>
                </div>
              ))}
              {!allMomentum.declining.length ? <div className="notice">No declining categories currently.</div> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">Long-Term Change (first to latest)</h3>
        {longTerm ? (
          <div className="stack" style={{ marginTop: 8 }}>
            <div className="notice">Since {monthShort(longTerm.start.year, longTerm.start.month)}</div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="notice">Money</span>
              <span>{formatDelta(longTerm.money, true)}</span>
            </div>
            {longTerm.ratings.map((item) => (
              <div key={item.category} className="row" style={{ justifyContent: 'space-between' }}>
                <span>{ratingDisplayName[item.category]}</span>
                <span>{item.delta >= 0 ? '+' : ''}{item.delta.toFixed(1)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="notice">Not enough data yet.</div>
        )}
      </div>

      <div className="card">
        <h3 className="section-title">Best / Worst Periods</h3>
        <div className="stack" style={{ marginTop: 8 }}>
          <div>
            <div className="notice">Best 3M Avg</div>
            {periodStats.best ? <p>{periodStats.best.start} to {periodStats.best.end} · {periodStats.best.average.toFixed(2)}</p> : <p>—</p>}
          </div>
          <div>
            <div className="notice">Worst 3M Avg</div>
            {periodStats.worst ? <p>{periodStats.worst.start} to {periodStats.worst.end} · {periodStats.worst.average.toFixed(2)}</p> : <p>—</p>}
          </div>
          <div>
            <div className="notice">Largest one-month improvement</div>
            {largest.best ? <p>{largest.best.from} to {largest.best.to} (+{largest.best.delta.toFixed(2)})</p> : <p>—</p>}
          </div>
          <div>
            <div className="notice">Largest one-month decline</div>
            {largest.worst ? <p>{largest.worst.from} to {largest.worst.to} ({largest.worst.delta.toFixed(2)})</p> : <p>—</p>}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">Personal Bests</h3>
        <div className="stack" style={{ marginTop: 8 }}>
          <div>
            <span className="notice">Life Score Peak</span>
            <p>{bestLife ? `${bestLife.value.toFixed(2)} · ${monthShort(bestLife.entry.year, bestLife.entry.month)}` : '—'}</p>
          </div>
          <div>
            <span className="notice">Money Peak</span>
            <p>{bestMoney ? `${moneyText(bestMoney.value)} · ${monthShort(bestMoney.entry.year, bestMoney.entry.month)}` : '—'}</p>
          </div>
          {ratingCategoryList.map((category) => {
            const entry = allTimeHighForCategory(entries, category);
            if (!entry) return null;
            return (
              <div key={category}>
                <span className="notice">{ratingDisplayName[category]} best</span>
                <p>
                  {entry.value.toFixed(1)} · {monthShort(entry.entry.year, entry.entry.month)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">Recurring Focus Areas</h3>
        {recurring.length === 0 ? <div className="notice">No recurring themes detected yet.</div> : null}
        <div className="stack" style={{ marginTop: 8 }}>
          {recurring.slice(0, 10).map((theme) => (
            <div key={theme.label} className="row" style={{ justifyContent: 'space-between' }}>
              <span>{theme.label}</span>
              <span className="pill">{theme.count} months</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
