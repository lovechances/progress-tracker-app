import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { BottomTabBar } from './components/BottomTabBar';
import { HomeScreen } from './screens/HomeScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { NewEntryScreen } from './screens/NewEntryScreen';
import { InsightsScreen } from './screens/InsightsScreen';
import { MonthDetailScreen } from './screens/MonthDetailScreen';
import { useProgress } from './context/ProgressContext';
import { monthLong } from './utils/format';
import type { MonthlyEntry } from './types';

type Tab = 'home' | 'new' | 'history' | 'insights';
type ImportMode = 'replace' | 'merge';

function canShareFiles() {
  return Boolean(navigator.share) && Boolean(navigator.canShare);
}

function downloadText(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const file = new File([blob], filename, { type });

  if (canShareFiles() && navigator.canShare?.({ files: [file] })) {
    void navigator.share({ files: [file], title: filename });
  } else {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}

export function ProgressPulseApp() {
  const {
    entries,
    ready,
    seeded,
    currentMonthEntry,
    importBackup,
    validateBackup,
    exportJSON,
    exportCSV,
    clearAll,
    deleteById,
    entryForMonth,
    seedFromHistoryText,
    startFresh
  } = useProgress();

  const [tab, setTab] = useState<Tab>('home');
  const [selectedEntry, setSelectedEntry] = useState<MonthlyEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<MonthlyEntry | undefined>(undefined);
  const [importPayload, setImportPayload] = useState<string | null>(null);
  const [importError, setImportError] = useState('');
  const [showInstallHint, setShowInstallHint] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [feedback, setFeedback] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyInputRef = useRef<HTMLInputElement>(null);

  const now = useMemo(() => new Date(), []);
  const nowLabel = monthLong(now.getFullYear(), now.getMonth() + 1);

  const hasData = entries.length > 0;

  const historyDetailPrevious = useMemo(() => {
    if (!selectedEntry) return undefined;
    const previousMonth = selectedEntry.month === 1 ? 12 : selectedEntry.month - 1;
    const previousYear = selectedEntry.month === 1 ? selectedEntry.year - 1 : selectedEntry.year;
    return entryForMonth(previousYear, previousMonth);
  }, [entryForMonth, selectedEntry]);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((window.navigator as any).standalone);
    const dismissed = localStorage.getItem('progresspulse_install_prompt_dismissed');
    const isIPhone = /iphone|ipod|ipad/.test(navigator.userAgent.toLowerCase());
    if (!standalone && isIPhone && !dismissed) {
      setShowInstallHint(true);
    }
  }, []);

  const onNavigate = (next: Tab) => {
    setTab(next);
    setSelectedEntry((current) => (next !== 'history' ? null : current));
    setEditingEntry(undefined);
  };

  const onHistorySelect = (entry: MonthlyEntry) => {
    setSelectedEntry(entry);
    setTab('history');
  };

  const onCloseImport = () => {
    setImportPayload(null);
    setImportError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onRequestImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = await file.text();
      validateBackup(payload);
      setImportPayload(payload);
      setImportError('');
    } catch (error) {
      setImportError((error as Error).message || 'Could not parse backup file.');
    }
  };

  const onRequestHistory = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (text.trim().startsWith('{')) {
        await importBackup(text, 'replace');
        setFeedback('Private history imported.');
      } else {
        const count = await seedFromHistoryText(text);
        if (!count) throw new Error('No valid monthly entries found in that history file.');
        setFeedback(`Private history imported: ${count} months.`);
      }
      if (historyInputRef.current) historyInputRef.current.value = '';
    } catch (error) {
      setImportError((error as Error).message || 'Could not import history.');
    }
  };

  const applyImport = async (mode: ImportMode) => {
    if (!importPayload) return;
    try {
      await importBackup(importPayload, mode);
      onCloseImport();
      setTab('home');
      setFeedback('Backup imported.');
    } catch (error) {
      setImportError((error as Error).message || 'Import failed.');
    }
  };

  const safeDeleteAll = async () => {
    await clearAll();
    setFeedback('All local data cleared.');
    setSelectedEntry(null);
    setShowDeleteConfirm(false);
  };

  const pendingCount = useMemo(() => {
    if (!importPayload) return 0;
    try {
      return validateBackup(importPayload).entries.length;
    } catch {
      return 0;
    }
  }, [importPayload, validateBackup]);

  if (!ready) {
    return (
      <div className="app-shell">
        <div className="card">
          <p className="notice">Loading local history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>ProgressPulse</h1>
          <div className="notice">{nowLabel}</div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button
            onClick={() => {
              downloadText(exportJSON(), `progresspulse-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
            }}
            type="button"
          >
            Export JSON
          </button>
          <button
            onClick={() => {
              downloadText(exportCSV(), `progresspulse-backup-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
            }}
            type="button"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            Import JSON
          </button>
        </div>
      </header>

      <input
        type="file"
        ref={fileInputRef}
        accept="application/json"
        onChange={onRequestImport}
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={historyInputRef}
        accept="application/json,text/plain,.json,.txt"
        onChange={onRequestHistory}
        style={{ display: 'none' }}
      />

      <p className="notice" style={{ marginTop: 0 }}>
        {entries.length > 0
          ? `Latest: ${monthLong(entries.at(-1)!.year, entries.at(-1)!.month)}`
          : 'No local months yet'}
      </p>

      {showInstallHint ? (
        <div className="card" style={{ marginBottom: 10 }}>
          <strong>Add to Home Screen</strong>
          <div className="notice">From Safari tap Share → Add to Home Screen for full offline app mode.</div>
          <div className="row" style={{ marginTop: 6, gap: 8 }}>
            <button
              onClick={() => {
                localStorage.setItem('progresspulse_install_prompt_dismissed', '1');
                setShowInstallHint(false);
              }}
              type="button"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {!seeded && !hasData ? (
        <div className="card" style={{ marginBottom: 10 }}>
          <strong>Start your private history</strong>
          <div className="notice">Import your generated private JSON backup or your original past.txt. Nothing is uploaded.</div>
          <div className="row" style={{ marginTop: 8 }}>
            <button type="button" onClick={() => historyInputRef.current?.click()}>Import My History</button>
            <button type="button" onClick={startFresh}>Start Fresh</button>
          </div>
        </div>
      ) : null}

      {feedback ? <div className="notice">{feedback}</div> : null}
      {importError ? <div className="notice">{importError}</div> : null}

      <section style={{ marginTop: 10 }}>
        {tab === 'home' && (
          <HomeScreen
            onCompleteReview={() => {
              setEditingEntry(undefined);
              setTab('new');
            }}
            onEditCurrent={
              currentMonthEntry
                ? () => {
                    setEditingEntry(currentMonthEntry);
                    setTab('new');
                  }
                : undefined
            }
          />
        )}

        {tab === 'new' && (
          <NewEntryScreen
            initial={editingEntry}
            onCancel={() => {
              setEditingEntry(undefined);
              setTab('home');
            }}
            onSaved={() => {
              setEditingEntry(undefined);
              setFeedback('Entry saved.');
              setTab('home');
            }}
          />
        )}

        {tab === 'history' && selectedEntry ? (
          <MonthDetailScreen
            entry={selectedEntry}
            previous={historyDetailPrevious}
            onBack={() => setSelectedEntry(null)}
            onEdit={() => {
              setEditingEntry(selectedEntry);
              setSelectedEntry(null);
              setTab('new');
            }}
            onDelete={async () => {
              await deleteById(selectedEntry.id);
              setSelectedEntry(null);
              setFeedback('Month deleted.');
            }}
          />
        ) : null}

        {tab === 'history' && !selectedEntry ? <HistoryScreen onSelect={onHistorySelect} /> : null}

        {tab === 'insights' ? <InsightsScreen /> : null}
      </section>

      {importPayload ? (
        <section className="card" style={{ marginTop: 10 }}>
          <h2 className="section-title">Import backup</h2>
          <div className="notice">Detected {pendingCount} entries in selected file.</div>
          <div className="row" style={{ marginTop: 8 }}>
            <button onClick={() => applyImport('merge')} type="button">
              Merge
            </button>
            <button onClick={() => applyImport('replace')} type="button">
              Replace Existing
            </button>
            <button
              onClick={onCloseImport}
              type="button"
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      <section className="card" style={{ marginTop: 10 }}>
        <h2 className="section-title">Data</h2>
        <p className="notice">{entries.length} month{entries.length === 1 ? '' : 's'} stored locally in this browser's IndexedDB.</p>
        {showDeleteConfirm ? (
          <>
            <p className="notice">This permanently deletes local entries. This action cannot be undone.</p>
            <div className="row" style={{ marginTop: 8 }}>
              <button type="button" onClick={safeDeleteAll}>
                Confirm clear all
              </button>
              <button type="button" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <button type="button" onClick={() => setShowDeleteConfirm(true)}>
            Clear local data
          </button>
        )}
      </section>

      <BottomTabBar active={tab} onNavigate={onNavigate} />
    </div>
  );
}
