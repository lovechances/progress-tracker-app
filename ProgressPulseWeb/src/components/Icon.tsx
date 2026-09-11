type IconName = 'add' | 'back' | 'chart' | 'check' | 'chevron' | 'download' | 'history' | 'home' | 'more' | 'settings' | 'upload';

const paths: Record<IconName, string> = {
  add: 'M12 5v14M5 12h14',
  back: 'M15 18l-6-6 6-6',
  chart: 'M4 19V5M4 19h16M8 15l3-4 3 2 5-7',
  check: 'M5 12l4 4L19 6',
  chevron: 'M9 18l6-6-6-6',
  download: 'M12 3v11m0 0l4-4m-4 4l-4-4M5 21h14',
  history: 'M4 5v5h5M5.4 10A7 7 0 1012 5a7 7 0 00-6.6 5M12 8v4l3 2',
  home: 'M3 10.5L12 3l9 7.5V21H3zM9 21v-6h6v6',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  settings: 'M4 7h16M4 17h16M9 7a2 2 0 100 4 2 2 0 000-4zM15 13a2 2 0 100 4 2 2 0 000-4z',
  upload: 'M12 21V10m0 0l-4 4m4-4l4 4M5 3h14'
};

export function Icon({ name, label }: { name: IconName; label?: string }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden={label ? undefined : true} aria-label={label} role={label ? 'img' : undefined}>
      <path d={paths[name]} />
    </svg>
  );
}
