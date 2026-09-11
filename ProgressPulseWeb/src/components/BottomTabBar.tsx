type Tab = 'home' | 'new' | 'history' | 'insights';

export function BottomTabBar({
  active,
  onNavigate
}: {
  active: Tab;
  onNavigate: (tab: Tab) => void;
}) {
  const tabs: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'home', label: 'Home', icon: 'Home' },
    { id: 'new', label: 'New', icon: 'Add' },
    { id: 'history', label: 'History', icon: 'List' },
    { id: 'insights', label: 'Insights', icon: 'Trends' }
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
          <span className="nav-icon">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
