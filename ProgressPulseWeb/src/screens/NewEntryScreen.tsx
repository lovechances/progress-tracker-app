import { useEffect, useMemo, useState } from 'react';
import { useProgress } from '../context/ProgressContext';
import { DeltaBadge } from '../components/DeltaBadge';
import { monthLong, moneyText, ratingText } from '../utils/format';
import { ratingCategoryList, ratingDisplayName, type MonthlyEntry } from '../types';

interface NewEntryScreenProps {
  initial?: MonthlyEntry;
  onSaved?: () => void;
  onCancel?: () => void;
}

export function NewEntryScreen({ initial, onSaved, onCancel }: NewEntryScreenProps) {
  const { entryForMonth, addOrUpdate } = useProgress();

  const now = new Date();
  const [year, setYear] = useState(initial?.year ?? now.getFullYear());
  const [month, setMonth] = useState(initial?.month ?? now.getMonth() + 1);
  const [moneyInput, setMoneyInput] = useState(() => (initial ? String(initial.money) : ''));
  const [changes, setChanges] = useState(initial?.changes ?? '');
  const [error, setError] = useState('');
  const [ratings, setRatings] = useState<Record<string, number>>({
    relationships: initial?.relationships ?? 5,
    health: initial?.health ?? 5,
    energy: initial?.energy ?? 5,
    speaking: initial?.speaking ?? 5,
    mindAndThought: initial?.mindAndThought ?? 5,
    strength: initial?.strength ?? 5,
    appearance: initial?.appearance ?? 5
  });

  useEffect(() => {
    if (initial) {
      setYear(initial.year);
      setMonth(initial.month);
      setMoneyInput(String(initial.money));
      setChanges(initial.changes);
      setRatings({
        relationships: initial.relationships ?? 5,
        health: initial.health ?? 5,
        energy: initial.energy ?? 5,
        speaking: initial.speaking ?? 5,
        mindAndThought: initial.mindAndThought ?? 5,
        strength: initial.strength ?? 5,
        appearance: initial.appearance ?? 5
      });
    }
  }, [initial]);

  const existing = useMemo(() => entryForMonth(year, month), [entryForMonth, month, year]);

  const selectedMonthPrevious = useMemo(() => {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    return entryForMonth(prevYear, prevMonth);
  }, [entryForMonth, month, year]);

  const existingText = existing && existing.id !== initial?.id ? 'Existing month found. Saving will update that month.' : '';

  function parseMoney(input: string): number | null {
    const clean = input.replace(/\$/g, '').replace(/,/g, '').trim().toLowerCase();
    if (!clean) return null;

    let working = clean;
    const negative = working.startsWith('-');
    if (negative) {
      working = working.slice(1);
    }

    const hasK = working.endsWith('k');
    if (hasK) {
      working = working.slice(0, -1);
    }

    const numeric = Number(working);
    if (Number.isNaN(numeric)) return null;
    const value = negative ? -numeric : numeric;
    return hasK ? value * 1000 : value;
  }

  async function onSubmit() {
    setError('');

    const money = parseMoney(moneyInput);
    if (money === null) {
      setError('Enter a valid money number.');
      return;
    }

    await addOrUpdate({
      year,
      month,
      money,
      relationships: ratings.relationships,
      health: ratings.health,
      energy: ratings.energy,
      speaking: ratings.speaking,
      mindAndThought: ratings.mindAndThought,
      strength: ratings.strength,
      appearance: ratings.appearance,
      sex: initial?.sex,
      changes
    });

    onSaved?.();
  }

  return (
    <div className="stack">
      <div className="card">
        <h2 className="section-title">Monthly Entry</h2>

        <div className="row" style={{ gap: 8, marginTop: 10 }}>
          <select
            value={month}
            onChange={(event) => {
              setMonth(Number(event.target.value));
            }}
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map((monthValue) => (
              <option key={monthValue} value={monthValue}>
                {monthLong(year, monthValue)}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(event) => {
              setYear(Number(event.target.value));
            }}
          >
            {Array.from({ length: 10 }, (_, index) => now.getFullYear() - 5 + index).map((yearValue) => (
              <option key={yearValue} value={yearValue}>
                {yearValue}
              </option>
            ))}
          </select>
        </div>

        {existingText ? <div className="notice">{existingText}</div> : null}
        <div className="notice" style={{ marginTop: 6 }}>
          Editing {monthLong(year, month)}
        </div>

        <label style={{ display: 'grid', gap: 6, marginTop: 10 }}>
          Money
          <input
            inputMode="decimal"
            value={moneyInput}
            placeholder="e.g. 5500, $5,000, -9000, 5.5k"
            onChange={(event) => setMoneyInput(event.target.value)}
          />
          <div className="notice">Previous month: {selectedMonthPrevious ? moneyText(selectedMonthPrevious.money) : '—'}</div>
        </label>

        <div className="stack" style={{ marginTop: 8 }}>
          {ratingCategoryList.map((category) => {
            const previousValue = selectedMonthPrevious?.[category];
            const delta = previousValue === undefined ? undefined : ratings[category] - previousValue;

            return (
              <label key={category} style={{ display: 'grid', gap: 8 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span>{ratingDisplayName[category]}</span>
                  <span className="notice">
                    {previousValue === undefined ? 'No previous' : `Last month ${ratingText(previousValue)}`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.5}
                  value={ratings[category]}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setRatings((current) => ({ ...current, [category]: next }));
                  }}
                />
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>{ratings[category].toFixed(1)}</strong>
                  {previousValue === undefined ? <span className="notice">No previous</span> : <DeltaBadge value={delta} />}
                </div>
              </label>
            );
          })}
        </div>

        <label style={{ display: 'grid', gap: 6, marginTop: 10 }}>
          Changes / Focus
          <textarea value={changes} onChange={(event) => setChanges(event.target.value)} />
        </label>

        <div className="row" style={{ marginTop: 8 }}>
          <button type="button" onClick={onSubmit}>
            Save Entry
          </button>
          <button type="button" onClick={() => onCancel?.()}>
            Cancel
          </button>
          {error ? <div className="notice">{error}</div> : null}
        </div>
      </div>
    </div>
  );
}
