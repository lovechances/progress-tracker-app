import type { MonthlyEntry } from '../types';

const aliasMap: Record<string, string[]> = {
  Finances: ['saving', 'savings', 'budget', 'budgeting', 'debt', 'money'],
  Diet: ['diet', 'dieting', 'diet clean', 'clean', 'eating'],
  Fitness: ['gym', 'exercise', 'bulk', 'workout', 'fit'],
  'AI / Building': ['ai', 'coding', 'code', 'roadmap', 'build'],
  Routine: ['routine', 'daily tasks', 'habits', 'consistency'],
  'Substance Limits': ['no pills', 'pill', 'drug', 'drugs', '🚫', '🔞', '💊', 'drug limits']
};

export function recurringThemes(entries: MonthlyEntry[]) {
  const result: Record<string, Set<string>> = Object.fromEntries(
    Object.keys(aliasMap).map((label) => [label, new Set<string>()])
  ) as Record<string, Set<string>>;

  for (const entry of entries) {
    const label = `${entry.year}-${String(entry.month).padStart(2, '0')}`;

    for (const [theme, aliases] of Object.entries(aliasMap)) {
      for (const alias of aliases) {
        if (entry.changes.toLowerCase().includes(alias)) {
          result[theme].add(label);
          break;
        }
      }
    }
  }

  return Object.entries(result)
    .map(([label, monthSet]) => {
      const months = Array.from(monthSet).sort();
      return {
        label,
        count: months.length,
        firstSeen: months[0] ?? '',
        months
      };
    })
    .filter((entry) => entry.count > 1)
    .sort((a, b) => {
      if (a.count === b.count) return a.label.localeCompare(b.label);
      return b.count - a.count;
    });
}
