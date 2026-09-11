import SwiftUI

struct MonthDetailView: View {
    @EnvironmentObject private var store: ProgressStore
    @Environment(\.dismiss) private var dismiss

    let entry: MonthlyEntry
    @State private var showDelete = false

    private var snapshot: MonthlyEntrySnapshot {
        MonthlyEntrySnapshot.from(entry)
    }

    private var previous: MonthlyEntry? {
        store.previousEntry(for: entry)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 10) {
                    Text(entry.monthLabel)
                        .font(.title.weight(.black))

                    HStack {
                        VStack(alignment: .leading) {
                            Text("Money")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(entry.money.formattedSignedMoney())
                                .font(.headline)
                        }

                        Spacer()

                        VStack(alignment: .leading) {
                            Text("Life Score")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            if let score = AnalyticsEngine.lifeScore(for: snapshot) {
                                Text(score.formattedRating())
                                    .font(.headline)
                            } else {
                                Text("—")
                                    .foregroundStyle(.secondary)
                            }
                        }

                        Spacer()

                        if let previous {
                            let previousLife = AnalyticsEngine.lifeScore(for: MonthlyEntrySnapshot.from(previous))
                            if let currentLife = AnalyticsEngine.lifeScore(for: snapshot), let previousLife {
                                ChangeBadge(value: currentLife - previousLife, suffix: "")
                            }
                        }
                    }
                }
                .padding(16)
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 14))

                VStack(alignment: .leading, spacing: 8) {
                    Text("Ratings")
                        .font(.headline)
                    ForEach(RatingCategory.allMain, id: \.self) { category in
                        let current = entry.rating(for: category)
                        let diff = current.flatMap { currentValue in
                            previous?.rating(for: category).flatMap { previousValue in
                                AnalyticsEngine.ratingChange(current: currentValue, previous: previousValue)
                            }
                        }
                        CategoryRowView(title: category.displayName, value: current, change: diff)
                    }
                }
                .padding(14)
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 14))

                biggestImprovements

                VStack(alignment: .leading, spacing: 8) {
                    Text("Changes / Focus")
                        .font(.headline)
                    Text(entry.changes.isEmpty ? "No focus text for this month." : entry.changes)
                        .foregroundStyle(.secondary)
                        .font(.subheadline)
                }
                .padding(14)
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 14))

                HStack {
                    NavigationLink {
                        NewMonthlyEntryView(entry: entry)
                    } label: {
                        Label("Edit", systemImage: "pencil")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.accentColor.opacity(0.18))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    Button {
                        showDelete = true
                    } label: {
                        Label("Delete", systemImage: "trash")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.red.opacity(0.18))
                            .foregroundStyle(.red)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
            }
            .padding(16)
        }
        .navigationTitle("MONTH")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Delete this month?", isPresented: $showDelete) {
            Button("Delete", role: .destructive) {
                store.delete(entry)
                dismiss()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will permanently remove \(entry.monthLabel).")
        }
    }

    private var biggestImprovements: some View {
        let comparisons = RatingCategory.allMain.compactMap { category -> (String, Double)? in
            guard let current = entry.rating(for: category), let previous = previous?.rating(for: category) else { return nil }
            return (category.displayName, current - previous)
        }

        let best = comparisons.max { $0.1 < $1.1 }
        let worst = comparisons.min { $0.1 < $1.1 }

        if let best, let worst {
            return AnyView(
                VStack(alignment: .leading, spacing: 8) {
                    Text("Month-to-Month")
                        .font(.headline)
                    HStack {
                        VStack(alignment: .leading) {
                            Text("BIGGEST IMPROVEMENT")
                                .font(.caption)
                                .foregroundStyle(.green)
                            Text("\(best.0) +\(String(format: "%.1f", best.1))")
                                .font(.headline)
                                .foregroundStyle(.green)
                        }
                        Spacer()
                        VStack(alignment: .leading) {
                            Text("BIGGEST DECLINE")
                                .font(.caption)
                                .foregroundStyle(.red)
                            Text("\(worst.0) \(String(format: "%.1f", worst.1))")
                                .font(.headline)
                                .foregroundStyle(.red)
                        }
                    }
                    .padding(12)
                    .background(.ultraThinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            )
        }

        return AnyView(EmptyView())
    }
}
