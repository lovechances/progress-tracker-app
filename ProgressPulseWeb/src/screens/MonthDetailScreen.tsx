import { useMemo, useState } from 'react';
import { DeltaBadge } from '../components/DeltaBadge';
import { Icon } from '../components/Icon';
import { lifeScore, ratingChange } from '../lib/analytics';
import { ratingCategoryList, ratingDisplayName, type MonthlyEntry } from '../types';
import { moneyText, monthLong, ratingText } from '../utils/format';

export function MonthDetailScreen({ entry, previous, onEdit, onDelete, onBack }: { entry: MonthlyEntry; previous?: MonthlyEntry; onEdit: () => void; onDelete: () => void; onBack: () => void }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const life = lifeScore(entry);
  const previousLife = previous ? lifeScore(previous) : null;
  const lifeDelta = life === null || previousLife === null ? undefined : life - previousLife;
  const moneyDelta = previous ? entry.money - previous.money : undefined;
  const changes = useMemo(() => ratingCategoryList.map((category) => ({ category, delta: ratingChange(entry[category], previous?.[category]) })).filter((item): item is { category: (typeof ratingCategoryList)[number]; delta: number } => item.delta !== null).sort((a, b) => b.delta - a.delta), [entry, previous]);
  const best = changes[0]?.delta && changes[0].delta > 0 ? changes[0] : null;
  const worst = changes.at(-1)?.delta && changes.at(-1)!.delta < 0 ? changes.at(-1)! : null;

  return <div className="screen-stack detail-screen">
    <div className="detail-nav"><button className="back-button" type="button" onClick={onBack}><Icon name="back" />History</button><div className="more-wrap"><button className="icon-button" type="button" aria-label="More review options" onClick={() => setMoreOpen((current) => !current)}><Icon name="more" /></button>{moreOpen ? <div className="more-menu">{confirmDelete ? <><p>Delete this review?</p><button className="danger-button" type="button" onClick={onDelete}>Delete Review</button><button className="text-button" type="button" onClick={() => setConfirmDelete(false)}>Cancel</button></> : <button className="danger-text-button" type="button" onClick={() => setConfirmDelete(true)}>Delete Review</button>}</div> : null}</div></div>
    <section className="detail-intro"><span className="eyebrow">Monthly snapshot</span><h2>{monthLong(entry.year, entry.month)}</h2></section>
    <section className="detail-summary"><div><span>Life Score</span><strong>{ratingText(life ?? undefined)}</strong></div><div><span>Money</span><strong>{moneyText(entry.money)}</strong></div></section>
    {previous ? <section className="comparison-strip"><span>vs {monthLong(previous.year, previous.month).replace(/ \d{4}$/, '')}</span><span>Life <DeltaBadge value={lifeDelta} /></span><span>Money <DeltaBadge value={moneyDelta} asMoney /></span></section> : null}
    <section className="section-block"><div className="section-heading"><h3>Ratings</h3><span>Change</span></div><div className="detail-ratings">{ratingCategoryList.map((category) => { const delta = ratingChange(entry[category], previous?.[category]); return <div key={category}><span>{ratingDisplayName[category]}</span><strong>{ratingText(entry[category])}</strong><DeltaBadge value={delta ?? undefined} /></div>; })}{entry.sex !== undefined ? <div><span>Sex</span><strong>{ratingText(entry.sex)}</strong><span className="notice">Historical</span></div> : null}</div></section>
    {previous ? <section className="change-callouts"><div><span className="eyebrow">Biggest improvement</span><strong>{best ? `${ratingDisplayName[best.category]} +${best.delta.toFixed(1)}` : 'No increase'}</strong></div><div><span className="eyebrow">Biggest decline</span><strong>{worst ? `${ratingDisplayName[worst.category]} ${worst.delta.toFixed(1)}` : 'No decline'}</strong></div></section> : null}
    <section className="focus-block"><div className="section-heading"><h3>Focus</h3></div><p>{entry.changes || 'No focus set for this month.'}</p></section>
    <button className="primary-button" type="button" onClick={onEdit}>Edit Review</button>
  </div>;
}
