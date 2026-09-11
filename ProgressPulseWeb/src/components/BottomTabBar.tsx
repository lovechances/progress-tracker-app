import { Icon } from './Icon';

type Tab = 'home' | 'new' | 'history' | 'insights';

export function BottomTabBar({
  active,
  onNavigate
}: {
  active: Tab;
  onNavigate: (tab: Tab) => void;
}) {
  const tabs: Array<{ id: Tab; label: string; icon: 'home' | 'add' | 'history' | 'chart' }> = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'new', label: 'Add', icon: 'add' },
    { id: 'history', label: 'History', icon: 'history' },
    { id: 'insights', label: 'Insights', icon: 'chart' }
  ];

  return (
    <nav className="tabbar" aria-label="Primary">
      {tabs.map((tab) => (
        <button
          className={`tab-button ${active === tab.id ? 'active' : ''}`}
          key={tab.id}
          onClick={() => onNavigate(tab.id)}
          type="button"
          aria-label={tab.label}
          aria-current={active === tab.id ? 'page' : undefined}
        >
          <Icon name={tab.icon} />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
