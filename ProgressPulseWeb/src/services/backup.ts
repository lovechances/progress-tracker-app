import { parseBackupPayload, downloadAsFile, backupFilename } from './db';

export function parseImportedText(text: string) {
  return parseBackupPayload(text);
}

export function triggerDownloadJSON(data: unknown) {
  downloadAsFile(JSON.stringify(data, null, 2), backupFilename(new Date()), 'application/json');
}

export function triggerDownloadCSV(csv: string) {
  downloadAsFile(csv, `progresspulse-backup-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
}
