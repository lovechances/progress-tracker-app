import Foundation
import SwiftData

enum ProgressStoreError: Error {
    case unsupportedBackupVersion(Int)
}

@MainActor
final class ProgressStore: ObservableObject {
    @Published private(set) var entries: [MonthlyEntry] = []

    private let context: ModelContext
    private let seedPreferenceKey = "seedDataInstalled_v1"

    init(context: ModelContext) {
        self.context = context
        load()
        seedFromHistoricalFileIfNeeded()
    }

    var entriesByMonth: [Int: MonthlyEntry] {
        Dictionary(uniqueKeysWithValues: entries.map { ($0.monthKey, $0) })
    }

    func load() {
        let request = FetchDescriptor<MonthlyEntry>(
            sortBy: [
                SortDescriptor(\.year, order: .forward),
                SortDescriptor(\.month, order: .forward)
            ]
        )
        entries = (try? context.fetch(request)) ?? []
    }

    var snapshots: [MonthlyEntrySnapshot] {
        entries.sorted { $0.monthKey < $1.monthKey }.map { $0.snapshot }
    }

    var currentMonthEntry: MonthlyEntry? {
        let comps = Calendar.current.dateComponents([.year, .month], from: Date())
        return entry(for: comps.year ?? 0, month: comps.month ?? 1)
    }

    func entry(for year: Int, month: Int) -> MonthlyEntry? {
        entriesByMonth[year * 100 + month]
    }

    func availableYears() -> [Int] {
        let values = entries.map(\.year)
        return Array(Set(values)).sorted(by: >)
    }

    func entries(for year: Int?) -> [MonthlyEntry] {
        let filtered = year == nil ? entries : entries.filter { $0.year == year }
        return filtered.sorted { $0.monthKey < $1.monthKey }
    }

    func previousEntry(for target: MonthlyEntry) -> MonthlyEntry? {
        let sorted = entries.sorted { $0.monthKey < $1.monthKey }
        guard let index = sorted.firstIndex(where: { $0.id == target.id }), index > 0 else { return nil }
        return sorted[index - 1]
    }

    func previousEntry(for year: Int, month: Int) -> MonthlyEntry? {
        let key = year * 100 + month
        let sorted = entries.sorted { $0.monthKey < $1.monthKey }
        guard let index = sorted.firstIndex(where: { $0.monthKey == key }), index > 0 else { return nil }
        return sorted[index - 1]
    }

    func createOrUpdate(_ snapshot: MonthlyEntrySnapshot) {
        if let existing = entry(for: snapshot.year, month: snapshot.month) {
            existing.apply(snapshot)
            existing.updatedAt = Date()
        } else {
            let created = MonthlyEntry(
                id: snapshot.id,
                year: snapshot.year,
                month: snapshot.month,
                money: snapshot.money,
                relationships: snapshot.relationships,
                health: snapshot.health,
                energy: snapshot.energy,
                speaking: snapshot.speaking,
                mindAndThought: snapshot.mindAndThought,
                strength: snapshot.strength,
                appearance: snapshot.appearance,
                sex: snapshot.sex,
                changes: snapshot.changes,
                createdAt: snapshot.createdAt,
                updatedAt: snapshot.updatedAt
            )
            context.insert(created)
        }
        saveAndReload()
    }

    func delete(_ entry: MonthlyEntry) {
        context.delete(entry)
        saveAndReload()
    }

    func replaceAll(with snapshots: [MonthlyEntrySnapshot]) {
        let normalized = dedupeSnapshots(snapshots)
        for entry in entries {
            context.delete(entry)
        }

        for snapshot in normalized {
            let created = MonthlyEntry(
                id: snapshot.id,
                year: snapshot.year,
                month: snapshot.month,
                money: snapshot.money,
                relationships: snapshot.relationships,
                health: snapshot.health,
                energy: snapshot.energy,
                speaking: snapshot.speaking,
                mindAndThought: snapshot.mindAndThought,
                strength: snapshot.strength,
                appearance: snapshot.appearance,
                sex: snapshot.sex,
                changes: snapshot.changes,
                createdAt: snapshot.createdAt,
                updatedAt: snapshot.updatedAt
            )
            context.insert(created)
        }

        saveAndReload()
    }

    func merge(_ snapshots: [MonthlyEntrySnapshot]) {
        for snapshot in dedupeSnapshots(snapshots) {
            if let existing = entry(for: snapshot.year, month: snapshot.month) {
                existing.apply(snapshot)
                existing.updatedAt = Date()
            } else {
                let created = MonthlyEntry(
                    id: snapshot.id,
                    year: snapshot.year,
                    month: snapshot.month,
                    money: snapshot.money,
                    relationships: snapshot.relationships,
                    health: snapshot.health,
                    energy: snapshot.energy,
                    speaking: snapshot.speaking,
                    mindAndThought: snapshot.mindAndThought,
                    strength: snapshot.strength,
                    appearance: snapshot.appearance,
                    sex: snapshot.sex,
                    changes: snapshot.changes,
                    createdAt: snapshot.createdAt,
                    updatedAt: snapshot.updatedAt
                )
                context.insert(created)
            }
        }
        saveAndReload()
    }

    func exportToJSON() throws -> URL {
        let payload = BackupPayload(
            version: 1,
            exportedAt: Date(),
            entries: snapshots
        )

        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        let data = try encoder.encode(payload)

        let fileName = "progress_backup_\(Int(Date().timeIntervalSince1970)).json"
        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
        try data.write(to: tempURL)
        return tempURL
    }

    func importFromJSON(_ url: URL) throws -> [MonthlyEntrySnapshot] {
        let data = try Data(contentsOf: url)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let payload = try decoder.decode(BackupPayload.self, from: data)
        guard payload.version == 1 else { throw ProgressStoreError.unsupportedBackupVersion(payload.version) }
        return dedupeSnapshots(payload.entries)
    }

    private func saveAndReload() {
        do {
            try context.save()
        } catch {
            print("Failed to save local store: \(error)")
        }
        load()
    }

    private func seedFromHistoricalFileIfNeeded() {
        if UserDefaults.standard.bool(forKey: seedPreferenceKey) {
            return
        }

        if !entries.isEmpty {
            UserDefaults.standard.set(true, forKey: seedPreferenceKey)
            return
        }

        guard let url = Bundle.main.url(forResource: "past", withExtension: "txt") else {
            UserDefaults.standard.set(true, forKey: seedPreferenceKey)
            return
        }

        do {
            let raw = try String(contentsOf: url)
            let parsed = try ProgressParser.parseHistoricalData(raw)

            for snapshot in dedupeSnapshots(parsed) {
                createOrUpdate(snapshot)
            }
        } catch {
            print("Failed to seed historical data: \(error)")
        }

        UserDefaults.standard.set(true, forKey: seedPreferenceKey)
    }

    private func dedupeSnapshots(_ snapshots: [MonthlyEntrySnapshot]) -> [MonthlyEntrySnapshot] {
        var unique: [Int: MonthlyEntrySnapshot] = [:]

        for snapshot in snapshots {
            let key = snapshot.monthKey
            guard let existing = unique[key] else {
                unique[key] = snapshot
                continue
            }

            if snapshot.updatedAt > existing.updatedAt {
                unique[key] = snapshot
            }
        }

        return unique.values.sorted { a, b in
            if a.year == b.year { return a.month < b.month }
            return a.year < b.year
        }
    }
}

private struct BackupPayload: Codable {
    let version: Int
    let exportedAt: Date
    let entries: [MonthlyEntrySnapshot]
}
