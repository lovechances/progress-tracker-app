import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { BottomTabBar } from './components/BottomTabBar';
import { Icon } from './components/Icon';
import { useProgress } from './context/ProgressContext';
import { HistoryScreen } from './screens/HistoryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { InsightsScreen } from './screens/InsightsScreen';
import { MonthDetailScreen } from './screens/MonthDetailScreen';
import { NewEntryScreen } from './screens/NewEntryScreen';
import { monthLong } from './utils/format';
import type { MonthlyEntry } from './types';

type Tab = 'home' | 'new' | 'history' | 'insights';
type ImportMode = 'replace' | 'merge';

function shareOrDownload(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const file = new File([blob], filename, { type });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    void navigator.share({ files: [file], title: filename });
    return;
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ProgressPulseApp() {
  const {
    entries, ready, seeded, currentMonthEntry, importBackup, validateBackup, exportJSON, exportCSV,
    clearAll, deleteById, entryForMonth, seedFromHistoryText, startFresh
  } = useProgress();
  const [tab, setTab] = useState<Tab>('home');
  const [selectedEntry, setSelectedEntry] = useState<MonthlyEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<MonthlyEntry>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importPayload, setImportPayload] = useState<string | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const backupInputRef = useRef<HTMLInputElement>(null);
  const historyInputRef = useRef<HTMLInputElement>(null);
  const now = useMemo(() => new Date(), []);

  const previousForDetail = useMemo(() => {
    if (!selectedEntry) return undefined;
    const month = selectedEntry.month === 1 ? 12 : selectedEntry.month - 1;
    const year = selectedEntry.month === 1 ? selectedEntry.year - 1 : selectedEntry.year;
    return entryForMonth(year, month);
  }, [entryForMonth, selectedEntry]);

  const navigate = (next: Tab) => {
    setTab(next);
    if (next !== 'history') setSelectedEntry(null);
    setEditingEntry(undefined);
  };

  const chooseBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      validateBackup(text);
      setImportPayload(text);
      setSettingsOpen(false);
      setError('');
    } catch (caught) {
      setError((caught as Error).message || 'That backup could not be read.');
    }
  };

  const chooseHistory = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const count = text.trim().startsWith('{')
        ? (await importBackup(text, 'replace'), validateBackup(text).entries.length)
        : await seedFromHistoryText(text);
      if (!count) throw new Error('No monthly reviews were found in that file.');
      setMessage(`${count} monthly reviews imported.`);
      setError('');
    } catch (caught) {
      setError((caught as Error).message || 'That history could not be imported.');
    } finally {
      if (historyInputRef.current) historyInputRef.current.value = '';
    }
  };

  const applyImport = async (mode: ImportMode) => {
    if (!importPayload) return;
    try {
      await importBackup(importPayload, mode);
      setImportPayload(null);
      setMessage('Backup restored.');
      setTab('home');
    } catch (caught) {
      setError((caught as Error).message || 'The backup could not be restored.');
    }
  };

  const clearData = async () => {
    await clearAll();
    setClearConfirm(false);
    setSettingsOpen(false);
    setMessage('All reviews were removed from this device.');
  };

  if (!ready) {
    return <main className="app-shell"><div className="loading-mark">Loading your progress</div></main>;
  }

  const filenameDate = new Date().toISOString().slice(0, 10);
  const importCount = importPayload ? validateBackup(importPayload).entries.length : 0;

  return (
    <main className="app-shell">
      <AppHeader onOpenSettings={() => setSettingsOpen(true)} />
      <input ref={backupInputRef} type="file" accept="application/json,.json" onChange={chooseBackup} hidden />
      <input ref={historyInputRef} type="file" accept="application/json,text/plain,.json,.txt" onChange={chooseHistory} hidden />

      {!seeded && entries.length === 0 ? (
        <section className="onboarding" aria-labelledby="onboarding-title">
          <span className="eyebrow">Progress Tracker</span>
          <h2 id="onboarding-title">Your progress, month by month.</h2>
          <p>Your data stays on this device.</p>
          <button className="primary-button" type="button" onClick={() => historyInputRef.current?.click()}>Import Existing History</button>
          <button className="text-button" type="button" onClick={startFresh}>Start Fresh</button>
        </section>
      ) : (
        <section className="app-main">
          {tab === 'home' ? <HomeScreen onCompleteReview={() => navigate('new')} onEditCurrent={() => { setEditingEntry(currentMonthEntry); setTab('new'); }} /> : null}
          {tab === 'new' ? <NewEntryScreen initial={editingEntry} onCancel={() => navigate('home')} onSaved={() => { setMessage('Review saved.'); navigate('home'); }} /> : null}
          {tab === 'history' && !selectedEntry ? <HistoryScreen onSelect={(entry) => setSelectedEntry(entry)} /> : null}
          {tab === 'history' && selectedEntry ? <MonthDetailScreen entry={selectedEntry} previous={previousForDetail} onBack={() => setSelectedEntry(null)} onEdit={() => { setEditingEntry(selectedEntry); setSelectedEntry(null); setTab('new'); }} onDelete={async () => { await deleteById(selectedEntry.id); setSelectedEntry(null); setMessage('Review deleted.'); }} /> : null}
          {tab === 'insights' ? <InsightsScreen /> : null}
        </section>
      )}

      {message ? <div className="toast" role="status"><Icon name="check" />{message}<button className="toast-close" type="button" onClick={() => setMessage('')} aria-label="Dismiss message">x</button></div> : null}
      {error ? <div className="toast error" role="alert">{error}<button className="toast-close" type="button" onClick={() => setError('')} aria-label="Dismiss error">x</button></div> : null}

      {importPayload ? (
        <div className="sheet-backdrop" role="presentation">
          <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="restore-title">
            <span className="eyebrow">Backup</span>
            <h2 id="restore-title">Restore {importCount} reviews?</h2>
            <p>Merge updates matching months and keeps everything else. Replace removes current reviews first.</p>
            <button className="primary-button" type="button" onClick={() => applyImport('merge')}>Merge Backup</button>
            <button className="secondary-button" type="button" onClick={() => applyImport('replace')}>Replace Existing Reviews</button>
            <button className="text-button" type="button" onClick={() => setImportPayload(null)}>Cancel</button>
          </section>
        </div>
      ) : null}

      {settingsOpen ? (
        <div className="sheet-backdrop" role="presentation">
          <section className="sheet settings-sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <div className="sheet-heading"><h2 id="settings-title">Settings</h2><button className="icon-button" type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">x</button></div>
            <section className="settings-group"><span className="eyebrow">Data</span><p><strong>{entries.length} monthly reviews</strong><br />Stored privately on this device.</p></section>
            <section className="settings-group"><span className="eyebrow">Backup</span><button className="settings-action" type="button" onClick={() => shareOrDownload(exportJSON(), `progress-tracker-backup-${filenameDate}.json`, 'application/json')}><Icon name="download" />Export Backup</button><button className="settings-action" type="button" onClick={() => backupInputRef.current?.click()}><Icon name="upload" />Import Backup</button><button className="settings-action" type="button" onClick={() => shareOrDownload(exportCSV(), `progress-tracker-${filenameDate}.csv`, 'text/csv')}><Icon name="download" />Export CSV</button></section>
            <section className="settings-group"><span className="eyebrow">App</span><p>Offline ready</p></section>
            <section className="settings-group danger-zone"><span className="eyebrow">Danger zone</span>{clearConfirm ? <><p>Remove every review from this device? This cannot be undone.</p><button className="danger-button" type="button" onClick={clearData}>Remove All Reviews</button><button className="text-button" type="button" onClick={() => setClearConfirm(false)}>Cancel</button></> : <button className="settings-action danger-action" type="button" onClick={() => setClearConfirm(true)}>Clear All Data</button>}</section>
          </section>
        </div>
      ) : null}

      {seeded || entries.length > 0 ? <BottomTabBar active={tab} onNavigate={navigate} /> : null}
      <span className="sr-only">{monthLong(now.getFullYear(), now.getMonth() + 1)}</span>
    </main>
  );
}
