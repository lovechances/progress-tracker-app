import { formatDelta } from '../utils/format';

export function DeltaBadge({ value, asMoney = false }: { value?: number; asMoney?: boolean }) {
  if (value === undefined) return <span className="notice">—</span>;
  const text = formatDelta(value, asMoney);
  return (
    <span className={`delta ${value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral'}`}>
      {text}
    </span>
  );
}
