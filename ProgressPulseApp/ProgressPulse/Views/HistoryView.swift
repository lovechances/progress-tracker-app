import SwiftUI

struct HistoryView: View {
    @EnvironmentObject private var store: ProgressStore
    @State private var selectedYear: Int?
    @State private var showImportSheet = false
    @State private var importedURL: URL?
    @State private var importMode: ImportMode?
    @State private var importError: String?
    @State private var shareURL: URL?

    var body: some View {
        NavigationStack {
            VStack {
                if let years = optionalYears(), years.isEmpty {
                    ContentUnavailableView(
                        "No Data",
                        systemImage: "calendar.badge.clock",
                        description: Text("Add your first entry from NEW ENTRY.")
                    )
                    .padding()
                } else {
                    Picker("Year", selection: Binding<Int?>(
                        get: { selectedYear },
                        set: { selectedYear = $0 }
                    )) {
                        Text("All").tag(nil as Int?)
                        if let years = optionalYears() {
                            ForEach(years, id: \.self) { year in
                                Text(String(year)).tag(year as Int?)
                            }
                        }
                    }
                    .pickerStyle(.segmented)
                    .padding(12)

                    List {
                        ForEach(store.entries(for: selectedYear).reversed()) { entry in
                            NavigationLink {
                                MonthDetailView(entry: entry)
                            } label: {
                                HistoryCard(entry: entry, previous: store.previousEntry(for: entry))
                                    .padding(.vertical, 4)
                            }
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("HISTORY")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button("Export JSON") {
                            Task { await exportData() }
                        }
                        Button("Import JSON") {
                            showImportSheet = true
                        }
                    } label: {
                        Image(systemName: "tray.and.arrow.down")
                    }
                }
            }
            .fileImporter(
                isPresented: $showImportSheet,
                allowedContentTypes: [.json],
                allowsMultipleSelection: false
            ) { result in
                handleImport(result)
            }
            .sheet(item: $shareURL) { url in
                ShareSheet(url: url)
            }
            .alert("Import action", isPresented: Binding(get: { importMode != nil }, set: { if !$0 { importMode = nil } })) {
                Button("Merge") { applyImport(mode: .merge) }
                Button("Replace") { applyImport(mode: .replace) }
                Button("Cancel", role: .cancel) { importMode = nil }
            } message: {
                Text("Merge keeps existing months and updates matching months. Replace clears all and restores from the file.")
            }
            .alert("Import Failed", isPresented: Binding(get: { importError != nil }, set: { if !$0 { importError = nil } })) {
                Button("OK", role: .cancel) { importError = nil }
            } message: {
                Text(importError ?? "")
            }
        }
    }

    private func optionalYears() -> [Int]? {
        let years = store.availableYears()
        return years
    }

    private func exportData() async {
        do {
            shareURL = try store.exportToJSON()
        } catch {
            importError = error.localizedDescription
        }
    }

    private func handleImport(_ result: Result<[URL], Error>) {
        do {
            let selected = try result.get()
            guard let fileURL = selected.first else { return }
            importedURL = fileURL
            _ = try store.importFromJSON(fileURL)
            importMode = .merge
        } catch {
            importError = "Import parse failed: \(error.localizedDescription)"
        }
    }

    private func applyImport(mode: ImportMode) {
        guard let fileURL = importedURL else {
            importMode = nil
            return
        }

        do {
            let snapshots = try store.importFromJSON(fileURL)
            switch mode {
            case .merge:
                store.merge(snapshots)
            case .replace:
                store.replaceAll(with: snapshots)
            }
            importMode = nil
            importedURL = nil
        } catch {
            importError = "Failed to apply import: \(error.localizedDescription)"
            importMode = nil
        }
    }

    private enum ImportMode {
        case merge
        case replace
    }
}

struct HistoryCard: View {
    let entry: MonthlyEntry
    let previous: MonthlyEntry?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(entry.monthLabel)
                .font(.headline)

            HStack(spacing: 16) {
                VStack(alignment: .leading) {
                    Text("Money")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(entry.money.formattedSignedMoney())
                        .font(.subheadline.weight(.semibold))
                        .monospacedDigit()
                }

                Divider().frame(height: 40)

                VStack(alignment: .leading) {
                    Text("Life Score")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    if let score = AnalyticsEngine.lifeScore(for: MonthlyEntrySnapshot.from(entry)) {
                        Text(score.formattedRating())
                            .font(.subheadline.weight(.semibold))
                            .monospacedDigit()
                    } else {
                        Text("—")
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()
            }

            VStack(alignment: .leading, spacing: 4) {
                ForEach(RatingCategory.allMain, id: \.self) { category in
                    let current = entry.rating(for: category)
                    let diff = current.flatMap { c in previous?.rating(for: category).flatMap { AnalyticsEngine.ratingChange(current: c, previous: $0) } }

                    HStack {
                        Text(category.displayName)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Spacer()
                        if let current {
                            Text(current.formattedRating())
                                .font(.caption.monospacedDigit())
                        } else {
                            Text("—")
                                .font(.caption)
                        }
                        ChangeBadge(value: diff, suffix: "")
                    }
                }
            }

            if !entry.changes.isEmpty {
                Text("Focus: \(entry.changes)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
        .padding()
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}
