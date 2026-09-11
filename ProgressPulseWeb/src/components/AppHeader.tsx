import { Icon } from './Icon';

export function AppHeader({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <header className="app-header">
      <h1>Progress Tracker</h1>
      <button className="icon-button" type="button" onClick={onOpenSettings} aria-label="Open settings">
        <Icon name="settings" />
      </button>
    </header>
  );
}
