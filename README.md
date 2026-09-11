# Progress Tracker PWA

Progress Tracker is a private, offline-first monthly progress tracker. The existing Swift/iOS source is preserved; `ProgressPulseWeb` is the installable web app used for the $0 iPhone route.

## Architecture and privacy

- React + TypeScript PWA, with a Vite production build.
- Entries live only in the browser's IndexedDB on your iPhone. There is no backend, account, API key, analytics service, or subscription.
- The public app bundle contains no personal history. Your `past.txt` stays outside `ProgressPulseWeb/public`, and `private/history-import.json` is ignored by Git.
- The app works offline after its first Safari visit and installation. Export a JSON backup regularly: clearing Safari website data, deleting the Home Screen app, or changing the deployment domain can erase the browser's local data.

## Get Progress Tracker on my iPhone for $0

1. In Terminal, run `cd /Users/chance/Desktop/python/progress/ProgressPulseWeb && npm install`.
2. Generate your private one-file history import with `npm run generate:private-import -- ../past.txt private/history-import.json`. This creates 32 private months from January 2024 through August 2026 and never places them in `public` or `dist`.
3. Run locally with `npm run dev` to use the app on your Mac. For a real iPhone install, build with `npm run build` and deploy only the `dist` folder to a free static host such as Cloudflare Pages, GitHub Pages, or Vercel. Authentication with that host is the only deployment authorization required.
4. Open the HTTPS production URL in Safari on the iPhone, wait for it to load once, tap Share, then Add to Home Screen.
5. On first launch, tap `Import My History` and select `private/history-import.json` from Files. Confirm the latest imported month is August 2026, then add September.
6. Turn on Airplane Mode, reopen the Home Screen app, and confirm the dashboard still loads. Then use `Export JSON` to create your first backup in Files/iCloud Drive.

No Apple Developer membership or Apple signing is needed for this PWA route. The static host can be free, and there is no ongoing server cost. Do not deploy `past.txt`, `private/history-import.json`, or another personal backup; only deploy `ProgressPulseWeb/dist`.

## Updating safely

Deploying a new build to the same HTTPS domain preserves IndexedDB entries. The PWA service worker updates its app shell automatically. Before changing domains, clearing browser data, deleting the app, or making a major update, export a backup. Restore through `Import Backup`: `Merge` updates matching months while keeping local extras; `Replace Existing` replaces the local history after validation.

## Checks

From `ProgressPulseWeb`, run `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`.
