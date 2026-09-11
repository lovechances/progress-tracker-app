export function monthKey(year: number, month: number): number {
  return year * 100 + month;
}

export function fromMonthKey(key: number): { year: number; month: number } {
  return { year: Math.floor(key / 100), month: key % 100 };
}
