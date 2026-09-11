import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { DeltaBadge } from '../components/DeltaBadge';
import { useProgress } from '../context/ProgressContext';
import { ratingCategoryList, ratingDisplayName, type MonthlyEntry } from '../types';
import { moneyText, monthLong, ratingText } from '../utils/format';

export function NewEntryScreen({ initial, onSaved, onCancel }: { initial?: MonthlyEntry; onSaved?: () => void; onCancel?: () => void }) {
  const { entryForMonth, addOrUpdate } = useProgress();
  const now = new Date();
  const [year, setYear] = useState(initial?.year ?? now.getFullYear());
  const [month, setMonth] = useState(initial?.month ?? now.getMonth() + 1);
  const [moneyInput, setMoneyInput] = useState(initial ? String(initial.money) : '');
  const [changes, setChanges] = useState(initial?.changes ?? '');
  const [error, setError] = useState('');
  const [ratings, setRatings] = useState<Record<string, number>>({ relationships: initial?.relationships ?? 5, health: initial?.health ?? 5, energy: initial?.energy ?? 5, speaking: initial?.speaking ?? 5, mindAndThought: initial?.mindAndThought ?? 5, strength: initial?.strength ?? 5, appearance: initial?.appearance ?? 5 });

  useEffect(() => {
    if (!initial) return;
    setYear(initial.year); setMonth(initial.month); setMoneyInput(String(initial.money)); setChanges(initial.changes);
    setRatings({ relationships: initial.relationships ?? 5, health: initial.health ?? 5, energy: initial.energy ?? 5, speaking: initial.speaking ?? 5, mindAndThought: initial.mindAndThought ?? 5, strength: initial.strength ?? 5, appearance: initial.appearance ?? 5 });
  }, [initial]);

  const previous = useMemo(() => entryForMonth(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1), [entryForMonth, month, year]);
  const existing = useMemo(() => entryForMonth(year, month), [entryForMonth, month, year]);
  const title = `${monthLong(year, month).replace(/ \d{4}$/, '')} Review`;

  const parseMoney = (value: string): number | null => {
    const clean = value.replace(/[$,]/g, '').trim().toLowerCase();
    if (!clean) return null;
    const multiplier = clean.endsWith('k') ? 1000 : 1;
    const number = Number(multiplier === 1000 ? clean.slice(0, -1) : clean);
    return Number.isFinite(number) ? number * multiplier : null;
  };
  const enteredMoney = parseMoney(moneyInput);

  const save = async () => {
    const money = parseMoney(moneyInput);
    if (money === null) { setError('Enter a valid money amount.'); return; }
    await addOrUpdate({ year, month, money, relationships: ratings.relationships, health: ratings.health, energy: ratings.energy, speaking: ratings.speaking, mindAndThought: ratings.mindAndThought, strength: ratings.strength, appearance: ratings.appearance, sex: initial?.sex, changes });
    onSaved?.();
  };

  return <form className="review-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
    <section className="review-heading"><span className="eyebrow">{initial ? 'Edit review' : 'Monthly review'}</span><h2>{title}</h2><p>{previous ? `Compared with ${monthLong(previous.year, previous.month).replace(/ \d{4}$/, '')}` : 'Your first review for this period.'}</p><div className="date-controls"><select aria-label="Review month" value={month} onChange={(event) => setMonth(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{monthLong(year, value).replace(/ \d{4}$/, '')}</option>)}</select><select aria-label="Review year" value={year} onChange={(event) => setYear(Number(event.target.value))}>{Array.from({ length: 10 }, (_, index) => now.getFullYear() - 5 + index).map((value) => <option key={value} value={value}>{value}</option>)}</select></div>{existing && existing.id !== initial?.id ? <p className="inline-note">Saving updates the existing review for this month.</p> : null}</section>

    <section className="form-section"><label className="money-field"><span>Money</span><div><span>$</span><input inputMode="decimal" aria-label="Money" value={moneyInput} placeholder="0" onChange={(event) => setMoneyInput(event.target.value)} /></div></label><p className="field-help">{previous ? <>Last month {moneyText(previous.money)} {enteredMoney === null ? null : <DeltaBadge value={enteredMoney - previous.money} asMoney />}</> : 'Enter savings or debt. Negative amounts are supported.'}</p></section>

    <section className="form-section"><div className="section-heading"><h3>Ratings</h3><span>0 to 10</span></div><div className="rating-controls">{ratingCategoryList.map((category) => { const prior = previous?.[category]; const delta = prior === undefined ? undefined : ratings[category] - prior; return <label className="rating-control" key={category}><div><span>{ratingDisplayName[category]}</span><strong>{ratings[category].toFixed(1)}</strong></div><div className="rating-meta"><span>{prior === undefined ? 'No previous review' : `Last month ${ratingText(prior)}`}</span>{delta === undefined ? null : <DeltaBadge value={delta} />}</div><input type="range" min="0" max="10" step="0.5" value={ratings[category]} style={{ '--range-progress': `${ratings[category] * 10}%` } as CSSProperties} aria-label={`${ratingDisplayName[category]} rating`} onChange={(event) => setRatings((current) => ({ ...current, [category]: Number(event.target.value) }))} /></label>; })}</div></section>

    <section className="form-section"><label className="focus-field"><span>Focus for next month</span><textarea value={changes} placeholder="What needs attention?" onChange={(event) => setChanges(event.target.value)} /></label></section>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <div className="form-actions"><button className="primary-button" type="submit">Save {monthLong(year, month).replace(/ \d{4}$/, '')} Review</button><button className="text-button" type="button" onClick={onCancel}>Cancel</button></div>
  </form>;
}
