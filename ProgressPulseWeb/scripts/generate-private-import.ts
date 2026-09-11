import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseHistoricalText } from '../src/utils/parser';
import { monthKey } from '../src/services/monthKey';

const [inputArg = '../past.txt', outputArg = 'private/history-import.json'] = process.argv.slice(2);
const source = await readFile(resolve(process.cwd(), inputArg), 'utf8');
const output = resolve(process.cwd(), outputArg);
const parsed = parseHistoricalText(source);
if (!parsed.length) throw new Error('No valid monthly entries found in the source history.');
const now = new Date().toISOString();
const entries = parsed.map((record) => {
  if (record.money === undefined) throw new Error(`Missing Money for ${record.month}/${record.year}`);
  return { id: randomUUID(), year: record.year, month: record.month, monthKey: monthKey(record.year, record.month), money: record.money, relationships: record.relationships, health: record.health, energy: record.energy, speaking: record.speaking, mindAndThought: record.mindAndThought, strength: record.strength, appearance: record.appearance, sex: record.sex, changes: record.changes, createdAt: now, updatedAt: now };
});
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify({ version: 1, schemaVersion: 1, exportedAt: now, entries }, null, 2)}\n`, 'utf8');
console.log(`Generated ${entries.length} months: ${entries[0].month}/${entries[0].year} through ${entries.at(-1)?.month}/${entries.at(-1)?.year}`);
