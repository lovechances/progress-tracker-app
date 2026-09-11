import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DeltaBadge } from '../components/DeltaBadge';
import { useProgress } from '../context/ProgressContext';
import { allTimeHighForCategory, allTimeHighLifeScore, allTimeHighMoney, allTimeLowMoney, bestWorst3MonthLife, categorySeries, changeFrom, lifeScoreSeries, largestMonthLifeDelta, momentum, moneySeries, trendWindowEntries } from '../lib/analytics';
import { recurringThemes } from '../lib/focus';
import { ratingCategoryList, ratingDisplayName, type RatingCategory, type TrendWindow } from '../types';
import { formatDelta, moneyText, monthShort, ratingText } from '../utils/format';

type InsightView = 'overview' | 'explore' | 'patterns';
type Metric = 'life' | 'money' | RatingCategory;
type Point = { date: string; label: string; value: number };

const views: Array<{ id: InsightView; label: string }> = [{ id: 'overview', label: 'Overview' }, { id: 'explore', label: 'Explore' }, { id: 'patterns', label: 'Patterns' }];
const ranges: Array<{ id: TrendWindow; label: string }> = [{ id: '6M', label: '6M' }, { id: '1Y', label: '1Y' }, { id: 'ALL', label: 'All' }];
const metricOptions: Array<[Metric, string]> = [['life', 'Life Score'], ['money', 'Money'], ...ratingCategoryList.map((category) => [category, ratingDisplayName[category]] as [Metric, string])];

function seriesStats(points: Point[]) {
  if (!points.length) return null;
  const values = points.map((point) => point.value);
  return { current: values.at(-1)!, average: values.reduce((sum, value) => sum + value, 0) / values.length, high: Math.max(...values), low: Math.min(...values), recent: values.length > 1 ? values.at(-1)! - values.at(-2)! : null };
}

function TrendChart({ points, money = false }: { points: Point[]; money?: boolean }) {
  if (points.length < 2) return <div className="chart-empty">Add another review to see a trend.</div>;
  return <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{ top: 4, right: 2, left: money ? 10 : -16, bottom: 0 }}><CartesianGrid vertical={false} stroke="#273449" strokeDasharray="3 4" /><XAxis dataKey="label" minTickGap={30} axisLine={false} tickLine={false} tick={{ fill: '#8290a8', fontSize: 10 }} /><YAxis width={money ? 54 : 32} tickFormatter={(value) => money ? `$${Math.round(value / 1000)}k` : value.toFixed(0)} axisLine={false} tickLine={false} tick={{ fill: '#8290a8', fontSize: 10 }} /><Tooltip contentStyle={{ background: '#172235', border: '1px solid #30405a', borderRadius: 12 }} labelStyle={{ color: '#dce7f7' }} formatter={(value) => [money ? moneyText(Number(value)) : ratingText(Number(value)), money ? 'Money' : 'Score']} /><Line type="monotone" dataKey="value" stroke={money ? '#66c7b2' : '#86a8ff'} strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: money ? '#66c7b2' : '#86a8ff', strokeWidth: 0 }} />{money ? <ReferenceLine y={0} stroke="#6d7b92" strokeDasharray="3 4" /> : null}</LineChart></ResponsiveContainer></div>;
}

function ChartSurface({ title, points, money, range, onRangeChange, showMetricPicker, metric, onMetricChange }: { title: string; points: Point[]; money?: boolean; range: TrendWindow; onRangeChange: (range: TrendWindow) => void; showMetricPicker?: boolean; metric?: Metric; onMetricChange?: (metric: Metric) => void }) {
  const stats = seriesStats(points);
  return <section className="chart-surface"><div className="chart-heading"><div><span className="eyebrow">{title}</span><strong>{stats ? money ? moneyText(stats.current) : ratingText(stats.current) : '—'}</strong></div><DeltaBadge value={stats?.recent ?? undefined} asMoney={money} /></div>{showMetricPicker ? <div className="metric-scroll" aria-label="Explore a metric">{metricOptions.map(([id, label]) => <button className={`metric-chip ${metric === id ? 'selected' : ''}`} key={id} type="button" onClick={() => onMetricChange?.(id)}>{label}</button>)}</div> : null}<TrendChart points={points} money={money} /><div className="range-control" aria-label="Chart range">{ranges.map((item) => <button key={item.id} className={range === item.id ? 'selected' : ''} type="button" onClick={() => onRangeChange(item.id)}>{item.label}</button>)}</div></section>;
}

export function InsightsScreen() {
  const { entries } = useProgress();
  const [view, setView] = useState<InsightView>('overview');
  const [range, setRange] = useState<TrendWindow>('6M');
  const [metric, setMetric] = useState<Metric>('life');
  const overviewPoints = useMemo(() => lifeScoreSeries(trendWindowEntries(entries, range)), [entries, range]);
  const explorePoints = useMemo(() => {
    const windowEntries = trendWindowEntries(entries, range);
    return metric === 'life' ? lifeScoreSeries(windowEntries) : metric === 'money' ? moneySeries(windowEntries) : categorySeries(windowEntries, metric);
  }, [entries, metric, range]);
  const lifePoints = useMemo(() => lifeScoreSeries(entries), [entries]);
  const moneyPoints = useMemo(() => moneySeries(entries), [entries]);
  const lifeStats = seriesStats(lifePoints);
  const moneyStats = seriesStats(moneyPoints);
  const exploreStats = seriesStats(explorePoints);
  const currentCategory = metric !== 'life' && metric !== 'money' ? metric : null;
  const allCategoryPoints = useMemo(() => currentCategory ? categorySeries(entries, currentCategory) : [], [currentCategory, entries]);
  const momentumData = useMemo(() => momentum(entries), [entries]);
  const themes = useMemo(() => recurringThemes(entries), [entries]);
  const periods = bestWorst3MonthLife(entries);
  const largest = largestMonthLifeDelta(entries);
  const longTerm = entries.length > 1 ? { first: entries[0], latest: entries.at(-1)! } : null;
  const strongest = momentumData.improving[0];
  const weakest = momentumData.declining[0];
  const exploreTitle = metric === 'life' ? 'Life Score' : metric === 'money' ? 'Money' : ratingDisplayName[metric];

  return <div className="screen-stack insights-screen">
    <section className="page-intro"><span className="eyebrow">Your patterns</span><h2>Insights</h2><p>{view === 'overview' ? 'Where you are right now.' : view === 'explore' ? 'Choose a metric to explore.' : 'What keeps happening over time.'}</p></section>
    <div className="filter-scroll insight-tabs" role="tablist" aria-label="Insights sections">{views.map((item) => <button key={item.id} className={`filter-pill ${view === item.id ? 'selected' : ''}`} type="button" onClick={() => setView(item.id)}>{item.label}</button>)}</div>

    {view === 'overview' ? <>
      <section className="overview-stats"><div><span>Life Score</span><strong>{lifeStats ? ratingText(lifeStats.current) : '—'}</strong><DeltaBadge value={lifeStats?.recent ?? undefined} /></div><div><span>Money</span><strong>{moneyStats ? moneyText(moneyStats.current) : '—'}</strong><DeltaBadge value={moneyStats?.recent ?? undefined} asMoney /></div></section>
      <ChartSurface title="Life Score" points={overviewPoints} range={range} onRangeChange={setRange} />
      <section className="signal-pair"><div><span>Strongest mover</span><strong>{strongest ? `${ratingDisplayName[strongest.category]} +${strongest.change.toFixed(1)}` : 'No clear mover'}</strong></div><div><span>Needs attention</span><strong>{weakest ? `${ratingDisplayName[weakest.category]} ${weakest.change.toFixed(1)}` : 'Nothing notable'}</strong></div></section>
      {longTerm ? <p className="quiet-insight"><strong>Since {monthShort(longTerm.first.year, longTerm.first.month)}</strong><span>Money {formatDelta(longTerm.latest.money - longTerm.first.money, true)}</span></p> : null}
    </> : null}

    {view === 'explore' ? <>
      <ChartSurface title={exploreTitle} points={explorePoints} money={metric === 'money'} range={range} onRangeChange={setRange} showMetricPicker metric={metric} onMetricChange={setMetric} />
      {metric === 'life' ? <section className="overview-stats"><div><span>Current</span><strong>{exploreStats ? ratingText(exploreStats.current) : '—'}</strong></div><div><span>Average</span><strong>{exploreStats ? ratingText(exploreStats.average) : '—'}</strong></div><div><span>Peak</span><strong>{exploreStats ? ratingText(exploreStats.high) : '—'}</strong></div><div><span>Recent change</span><strong>{formatDelta(exploreStats?.recent ?? undefined)}</strong></div></section> : null}
      {metric === 'money' ? <section className="overview-stats"><div><span>Current</span><strong>{moneyStats ? moneyText(moneyStats.current) : '—'}</strong></div><div><span>High</span><strong>{allTimeHighMoney(entries) ? moneyText(allTimeHighMoney(entries)!.value) : '—'}</strong></div><div><span>Low</span><strong>{allTimeLowMoney(entries) ? moneyText(allTimeLowMoney(entries)!.value) : '—'}</strong></div><div><span>3M / 12M</span><strong>{formatDelta(changeFrom(moneyPoints, 3) ?? undefined, true)} / {formatDelta(changeFrom(moneyPoints, 12) ?? undefined, true)}</strong></div></section> : null}
      {currentCategory ? <section className="overview-stats"><div><span>Current</span><strong>{exploreStats ? ratingText(exploreStats.current) : '—'}</strong></div><div><span>Average</span><strong>{exploreStats ? ratingText(exploreStats.average) : '—'}</strong></div><div><span>Peak</span><strong>{exploreStats ? ratingText(exploreStats.high) : '—'}</strong></div><div><span>3 months</span><strong>{formatDelta(changeFrom(allCategoryPoints, 3) ?? undefined)}</strong></div></section> : null}
    </> : null}

    {view === 'patterns' ? <>
      <section className="section-block"><div className="section-heading"><h3>Momentum</h3><span>Latest 3 vs prior 3</span></div><div className="momentum-columns"><div><span className="positive-text">Improving</span>{momentumData.improving.slice(0, 3).map((item) => <p key={item.category}>{ratingDisplayName[item.category]} <strong>+{item.change.toFixed(1)}</strong></p>)}{!momentumData.improving.length ? <p>Nothing notable</p> : null}</div><div><span className="negative-text">Needs attention</span>{momentumData.declining.slice(0, 3).map((item) => <p key={item.category}>{ratingDisplayName[item.category]} <strong>{item.change.toFixed(1)}</strong></p>)}{!momentumData.declining.length ? <p>Nothing notable</p> : null}</div></div></section>
      <section className="section-block"><div className="section-heading"><h3>Recurring focus</h3><span>Across your reviews</span></div><div className="theme-list">{themes.map((theme) => <div key={theme.label}><span>{theme.label}</span><strong>{theme.count} months</strong></div>)}{!themes.length ? <p>No recurring themes yet.</p> : null}</div></section>
      {longTerm ? <section className="section-block"><div className="section-heading"><h3>Long-term change</h3><span>Since {monthShort(longTerm.first.year, longTerm.first.month)}</span></div><div className="long-term-list"><div><span>Money</span><strong>{formatDelta(longTerm.latest.money - longTerm.first.money, true)}</strong></div>{ratingCategoryList.map((category) => { const start = longTerm.first[category]; const end = longTerm.latest[category]; return start === undefined || end === undefined ? null : <div key={category}><span>{ratingDisplayName[category]}</span><strong>{formatDelta(end - start)}</strong></div>; })}</div></section> : null}
      <section className="section-block"><div className="section-heading"><h3>Personal bests</h3></div><div className="best-list"><div><span>Peak Life Score</span><strong>{allTimeHighLifeScore(entries) ? ratingText(allTimeHighLifeScore(entries)!.value) : '—'}</strong></div>{ratingCategoryList.map((category) => { const best = allTimeHighForCategory(entries, category); return <div key={category}><span>{ratingDisplayName[category]}</span><strong>{best ? ratingText(best.value) : '—'}</strong><small>{best ? monthShort(best.entry.year, best.entry.month) : ''}</small></div>; })}</div></section>
      <section className="section-block"><div className="section-heading"><h3>Best and hardest stretches</h3></div><div className="period-list"><p><span>Best stretch</span><strong>{periods.best ? `${periods.best.start} to ${periods.best.end}` : '—'}</strong><em>{periods.best ? `${periods.best.average.toFixed(2)} avg` : ''}</em></p><p><span>Hardest stretch</span><strong>{periods.worst ? `${periods.worst.start} to ${periods.worst.end}` : '—'}</strong><em>{periods.worst ? `${periods.worst.average.toFixed(2)} avg` : ''}</em></p><p><span>Biggest jump</span><strong>{largest.best ? `${largest.best.from} to ${largest.best.to}` : '—'}</strong><em>{largest.best ? `+${largest.best.delta.toFixed(2)}` : ''}</em></p><p><span>Biggest drop</span><strong>{largest.worst ? `${largest.worst.from} to ${largest.worst.to}` : '—'}</strong><em>{largest.worst ? largest.worst.delta.toFixed(2) : ''}</em></p></div></section>
    </> : null}
  </div>;
}
