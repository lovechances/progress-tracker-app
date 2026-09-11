import { formatDelta } from '../utils/format';

export function DeltaBadge({ value, asMoney = false }: { value?: number; asMoney?: boolean }) {
  if (value === undefined) return <span className="notice">—</span>;
  const text = formatDelta(value, asMoney);
  return (
    <span className={`pill ${value >= 0 ? 'good' : 'bad'}`}>
      {text}
    </span>
  );
}
