import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DeltaBadge } from '../components/DeltaBadge';
import { useProgress } from '../context/ProgressContext';
import { allTimeHighForCategory, allTimeHighLifeScore, allTimeHighMoney, allTimeLowLifeScore, allTimeLowMoney, bestWorst3MonthLife, categorySeries, changeFrom, lifeScoreSeries, largestMonthLifeDelta, momentum, moneySeries, threeMonthLifeScoreAverage, sixMonthLifeScoreAverage, trendWindowEntries } from '../lib/analytics';
import { recurringThemes } from '../lib/focus';
import { ratingCategoryList, ratingDisplayName, type RatingCategory, type TrendWindow } from '../types';
import { formatDelta, moneyText, monthShort, ratingText } from '../utils/format';

type View = 'overview' | 'life' | 'money' | 'categories' | 'patterns';
type Metric = 'life' | 'money' | RatingCategory;
type Point = { date: string; label: string; value: number };
const views: Array<{ id: View; label: string }> = [{ id: 'overview', label: 'Overview' }, { id: 'life', label: 'Life' }, { id: 'money', label: 'Money' }, { id: 'categories', label: 'Categories' }, { id: 'patterns', label: 'Patterns' }];
const ranges: Array<{ id: TrendWindow; label: string }> = [{ id: '6M', label: '6M' }, { id: '1Y', label: '1Y' }, { id: 'ALL', label: 'All' }];

function stats(points: Point[]) {
  if (!points.length) return null;
  const values = points.map((point) => point.value);
  return { current: values.at(-1)!, high: Math.max(...values), low: Math.min(...values), average: values.reduce((sum, value) => sum + value, 0) / values.length, monthly: values.length > 1 ? values.at(-1)! - values.at(-2)! : null };
}

function TrendChart({ points, money }: { points: Point[]; money?: boolean }) {
  if (points.length < 2) return <div className="chart-empty">Add another review to see a trend.</div>;
  return <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{ top: 8, right: 4, left: money ? 12 : -14, bottom: 0 }}><CartesianGrid vertical={false} stroke="#273449" strokeDasharray="3 4" /><XAxis dataKey="label" minTickGap={28} axisLine={false} tickLine={false} tick={{ fill: '#8290a8', fontSize: 10 }} /><YAxis width={money ? 56 : 34} tickFormatter={(value) => money ? `$${Math.round(value / 1000)}k` : value.toFixed(0)} axisLine={false} tickLine={false} tick={{ fill: '#8290a8', fontSize: 10 }} /><Tooltip contentStyle={{ background: '#172235', border: '1px solid #30405a', borderRadius: 12 }} labelStyle={{ color: '#dce7f7' }} formatter={(value) => [money ? moneyText(Number(value)) : ratingText(Number(value)), money ? 'Money' : 'Score']} /><Line type="monotone" dataKey="value" stroke={money ? '#66c7b2' : '#86a8ff'} strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: money ? '#66c7b2' : '#86a8ff', strokeWidth: 0 }} />{money ? <ReferenceLine y={0} stroke="#6d7b92" strokeDasharray="3 4" /> : null}</LineChart></ResponsiveContainer></div>;
}

export function InsightsScreen() {
  const { entries } = useProgress();
  const [view, setView] = useState<View>('overview');
  const [range, setRange] = useState<TrendWindow>('6M');
  const [metric, setMetric] = useState<Metric>('life');
  const windowEntries = useMemo(() => trendWindowEntries(entries, range), [entries, range]);
  const points = useMemo(() => metric === 'life' ? lifeScoreSeries(windowEntries) : metric === 'money' ? moneySeries(windowEntries) : categorySeries(windowEntries, metric), [metric, windowEntries]);
  const currentStats = stats(points);
  const lifePoints = useMemo(() => lifeScoreSeries(entries), [entries]);
  const moneyPoints = useMemo(() => moneySeries(entries), [entries]);
  const lifeStats = stats(lifePoints);
  const moneyStats = stats(moneyPoints);
  const currentCategory = metric !== 'life' && metric !== 'money' ? metric : 'health';
  const categoryAll = useMemo(() => categorySeries(entries, currentCategory), [currentCategory, entries]);
  const categoryStats = stats(categoryAll);
  const highLife = allTimeHighLifeScore(entries);
  const lowLife = allTimeLowLifeScore(entries);
  const highMoney = allTimeHighMoney(entries);
  const lowMoney = allTimeLowMoney(entries);
  const allMomentum = useMemo(() => momentum(entries), [entries]);
  const themes = useMemo(() => recurringThemes(entries), [entries]);
  const periods = bestWorst3MonthLife(entries);
  const largest = largestMonthLifeDelta(entries);
  const longTerm = useMemo(() => entries.length > 1 ? { first: entries[0], latest: entries.at(-1)! } : null, [entries]);
  const chartTitle = metric === 'life' ? 'Life Score' : metric === 'money' ? 'Money' : ratingDisplayName[metric];
  const improving = allMomentum.improving[0];
  const declining = allMomentum.declining[0];

  return <div className="screen-stack insights-screen">
    <section className="page-intro"><span className="eyebrow">Your patterns</span><h2>Insights</h2><p>Explore your progress over time.</p></section>
    <div className="filter-scroll insight-tabs" role="tablist" aria-label="Insight sections">{views.map((item) => <button key={item.id} className={`filter-pill ${view === item.id ? 'selected' : ''}`} type="button" onClick={() => setView(item.id)}>{item.label}</button>)}</div>

    {view !== 'patterns' ? <section className="chart-surface"><div className="chart-heading"><div><span className="eyebrow">{chartTitle}</span><strong>{currentStats ? (metric === 'money' ? moneyText(currentStats.current) : ratingText(currentStats.current)) : '—'}</strong></div><DeltaBadge value={currentStats?.monthly ?? undefined} asMoney={metric === 'money'} /></div><div className="metric-scroll" aria-label="Chart metric">{([['life', 'Life'], ['money', 'Money'], ...ratingCategoryList.map((category) => [category, ratingDisplayName[category]] as [Metric, string])] as Array<[Metric, string]>).map(([id, label]) => <button className={`metric-chip ${metric === id ? 'selected' : ''}`} key={id} type="button" onClick={() => setMetric(id)}>{label}</button>)}</div><TrendChart points={points} money={metric === 'money'} /><div className="range-control">{ranges.map((item) => <button key={item.id} className={range === item.id ? 'selected' : ''} type="button" onClick={() => setRange(item.id)}>{item.label}</button>)}</div></section> : null}

    {view === 'overview' ? <>
      <section className="overview-stats"><div><span>Life Score</span><strong>{lifeStats ? ratingText(lifeStats.current) : '—'}</strong><DeltaBadge value={lifeStats?.monthly ?? undefined} /></div><div><span>Money</span><strong>{moneyStats ? moneyText(moneyStats.current) : '—'}</strong><DeltaBadge value={moneyStats?.monthly ?? undefined} asMoney /></div></section>
      <section className="section-block"><div className="section-heading"><h3>Recent momentum</h3><span>3 months vs prior 3</span></div><div className="momentum-row"><div><span>Improving</span><strong>{improving ? `${ratingDisplayName[improving.category]} +${improving.change.toFixed(1)}` : 'No clear mover'}</strong></div><div><span>Needs attention</span><strong>{declining ? `${ratingDisplayName[declining.category]} ${declining.change.toFixed(1)}` : 'Nothing notable'}</strong></div></div></section>
      {longTerm ? <section className="quiet-insight"><strong>Since {monthShort(longTerm.first.year, longTerm.first.month)}</strong><span>Money {formatDelta(longTerm.latest.money - longTerm.first.money, true)}</span></section> : null}
    </> : null}

    {view === 'life' ? <><section className="overview-stats"><div><span>All-time high</span><strong>{highLife ? ratingText(highLife.value) : '—'}</strong><small>{highLife ? monthShort(highLife.entry.year, highLife.entry.month) : ''}</small></div><div><span>All-time low</span><strong>{lowLife ? ratingText(lowLife.value) : '—'}</strong><small>{lowLife ? monthShort(lowLife.entry.year, lowLife.entry.month) : ''}</small></div><div><span>3-month avg</span><strong>{ratingText(threeMonthLifeScoreAverage(entries) ?? undefined)}</strong></div><div><span>6-month avg</span><strong>{ratingText(sixMonthLifeScoreAverage(entries) ?? undefined)}</strong></div></section><section className="section-block"><div className="section-heading"><h3>Best and hardest stretches</h3></div><div className="period-list"><p><span>Best stretch</span><strong>{periods.best ? `${periods.best.start} to ${periods.best.end}` : '—'}</strong><em>{periods.best ? `${periods.best.average.toFixed(2)} avg` : ''}</em></p><p><span>Hardest stretch</span><strong>{periods.worst ? `${periods.worst.start} to ${periods.worst.end}` : '—'}</strong><em>{periods.worst ? `${periods.worst.average.toFixed(2)} avg` : ''}</em></p><p><span>Biggest jump</span><strong>{largest.best ? `${largest.best.from} to ${largest.best.to}` : '—'}</strong><em>{largest.best ? `+${largest.best.delta.toFixed(2)}` : ''}</em></p><p><span>Biggest drop</span><strong>{largest.worst ? `${largest.worst.from} to ${largest.worst.to}` : '—'}</strong><em>{largest.worst ? largest.worst.delta.toFixed(2) : ''}</em></p></div></section></> : null}

    {view === 'money' ? <><section className="overview-stats"><div><span>All-time high</span><strong>{highMoney ? moneyText(highMoney.value) : '—'}</strong><small>{highMoney ? monthShort(highMoney.entry.year, highMoney.entry.month) : ''}</small></div><div><span>All-time low</span><strong>{lowMoney ? moneyText(lowMoney.value) : '—'}</strong><small>{lowMoney ? monthShort(lowMoney.entry.year, lowMoney.entry.month) : ''}</small></div><div><span>3 months</span><strong>{formatDelta(changeFrom(moneyPoints, 3) ?? undefined, true)}</strong></div><div><span>12 months</span><strong>{formatDelta(changeFrom(moneyPoints, 12) ?? undefined, true)}</strong></div></section><p className="quiet-insight">The zero line on the chart separates savings from debt.</p></> : null}

    {view === 'categories' ? <><section className="overview-stats"><div><span>Current</span><strong>{categoryStats ? ratingText(categoryStats.current) : '—'}</strong></div><div><span>Average</span><strong>{categoryStats ? ratingText(categoryStats.average) : '—'}</strong></div><div><span>Peak</span><strong>{categoryStats ? ratingText(categoryStats.high) : '—'}</strong></div><div><span>3 months</span><strong>{formatDelta(changeFrom(categoryAll, 3) ?? undefined)}</strong></div></section><section className="section-block"><div className="section-heading"><h3>Personal bests</h3><span>Tap a chart metric to explore</span></div><div className="best-list">{ratingCategoryList.map((category) => { const best = allTimeHighForCategory(entries, category); return <div key={category}><span>{ratingDisplayName[category]}</span><strong>{best ? ratingText(best.value) : '—'}</strong><small>{best ? monthShort(best.entry.year, best.entry.month) : ''}</small></div>; })}</div></section></> : null}

    {view === 'patterns' ? <><section className="section-block"><div className="section-heading"><h3>Momentum</h3><span>Latest 3 vs prior 3</span></div><div className="momentum-columns"><div><span className="positive-text">Improving</span>{allMomentum.improving.slice(0, 3).map((item) => <p key={item.category}>{ratingDisplayName[item.category]} <strong>+{item.change.toFixed(1)}</strong></p>)}</div><div><span className="negative-text">Needs attention</span>{allMomentum.declining.slice(0, 3).map((item) => <p key={item.category}>{ratingDisplayName[item.category]} <strong>{item.change.toFixed(1)}</strong></p>)}</div></div></section><section className="section-block"><div className="section-heading"><h3>Recurring focus</h3><span>Across your reviews</span></div><div className="theme-list">{themes.length ? themes.map((theme) => <div key={theme.label}><span>{theme.label}</span><strong>{theme.count} months</strong></div>) : <p>No recurring themes yet.</p>}</div></section>{longTerm ? <section className="section-block"><div className="section-heading"><h3>Long-term change</h3><span>Since {monthShort(longTerm.first.year, longTerm.first.month)}</span></div><div className="long-term-list"><div><span>Money</span><strong>{formatDelta(longTerm.latest.money - longTerm.first.money, true)}</strong></div>{ratingCategoryList.map((category) => { const start = longTerm.first[category]; const end = longTerm.latest[category]; return start === undefined || end === undefined ? null : <div key={category}><span>{ratingDisplayName[category]}</span><strong>{formatDelta(end - start)}</strong></div>; })}</div></section> : null}</> : null}
  </div>;
}
