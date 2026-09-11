# ProgressPulse

Local-first iPhone app skeleton for your monthly progress tracking workflow:

- Single user
- Offline
- SwiftUI + SwiftData
- Deterministic analytics (no backend, no AI)
- Seeded from `Resources/past.txt`

## Structure

- `Models/*` — `MonthlyEntry` model and Codable snapshots.
- `Services/*` — parser and persistence service.
- `Analytics/*` — pure calculation engine.
- `Views/*` — HOME, NEW, HISTORY, MONTH DETAIL, INSIGHTS.
- `Utils/*` — formatting + rating helpers.

## Data model fields

Required monthly fields:

- year
- month
- money
- relationships
- health
- energy
- speaking
- mindAndThought
- strength
- appearance
- changes
- createdAt
- updatedAt
- optional `sex` preserved from legacy entries

## Storage

All data is stored in SwiftData in the app container and is available across launches offline.
Seed import runs from `past.txt` once and does not reinsert duplicates.

## Backup

- JSON backup: `HISTORY` → Export JSON (share sheet).
- JSON restore: `HISTORY` → Import JSON → Merge or Replace.
