import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var store: ProgressStore

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
            if let current = store.currentMonthEntry {
                currentMonthCard(current)
                ratingsGrid(current)
            } else {
                noCurrentMonthCard
            }
                }
                .padding(16)
            }
            .navigationTitle("HOME")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var currentMonthLabel: String {
        let comps = Calendar.current.dateComponents([.year, .month], from: Date())
        let date = Calendar.current.date(from: comps) ?? Date()
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: date).uppercased()
    }

    private var noCurrentMonthCard: some View {
        let latest = store.entries.last

        VStack(spacing: 12) {
            Text(currentMonthLabel)
                .font(.title2.weight(.semibold))
            if let latest {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Last completed: \(latest.monthLabel)")
                        .font(.headline)
                    Text("Money: \(latest.money.formattedSignedMoney())")
                        .font(.subheadline)
                    if let life = AnalyticsEngine.lifeScore(for: MonthlyEntrySnapshot.from(latest)) {
                        HStack {
                            Text("Life Score: \(life.formattedRating())")
                                .font(.subheadline.weight(.bold))
                            if let previous = store.previousEntry(for: latest), let previousLife = AnalyticsEngine.lifeScore(for: MonthlyEntrySnapshot.from(previous)) {
                                ChangeBadge(value: life - previousLife, suffix: "")
                            }
                        }
                    }
                    if let strongest = strongestCategory(in: latest), let weakest = weakestCategory(in: latest) {
                        HStack {
                            Text("Strongest: \(strongest.displayName)")
                                .foregroundStyle(.green)
                                .font(.caption)
                            Spacer()
                            Text("Weakest: \(weakest.displayName)")
                                .foregroundStyle(.orange)
                                .font(.caption)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                Text("No entry yet")
                    .font(.headline)
                    .foregroundStyle(.secondary)
            }

            NavigationLink {
                NewMonthlyEntryView()
            } label: {
                Label("Complete Monthly Review", systemImage: "plus.circle.fill")
                    .font(.headline.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func currentMonthCard(_ entry: MonthlyEntry) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(currentMonthLabel)
                .font(.title3.weight(.semibold))

            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Money")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(entry.money.formattedSignedMoney())
                        .font(.title3.weight(.bold))
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("Life Score")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    if let currentLife = AnalyticsEngine.lifeScore(for: MonthlyEntrySnapshot.from(entry)) {
                        Text(currentLife.formattedRating())
                            .font(.title3.weight(.bold))
                    } else {
                        Text("—")
                    }
                    if let previous = store.previousEntry(for: entry),
                       let currentLife = AnalyticsEngine.lifeScore(for: MonthlyEntrySnapshot.from(entry)),
                       let previousLife = AnalyticsEngine.lifeScore(for: MonthlyEntrySnapshot.from(previous)) {
                        ChangeBadge(value: currentLife - previousLife, suffix: "")
                    }
                }
            }

            let strongest = strongestCategory(in: entry)
            let weakest = weakestCategory(in: entry)
            if let strongest, let weakest {
                HStack {
                    Text("Strongest: \(strongest.displayName)")
                        .foregroundStyle(.green)
                        .font(.caption)
                    Spacer()
                    Text("Weakest: \(weakest.displayName)")
                        .foregroundStyle(.orange)
                        .font(.caption)
                }
            }

            Text(entry.changes.isEmpty ? "No focus text yet." : entry.changes)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(3)

            NavigationLink {
                NewMonthlyEntryView(entry: entry)
            } label: {
                Text("Edit This Month")
                    .font(.headline.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(LinearGradient(colors: [.blue.opacity(0.3), .teal.opacity(0.2)], startPoint: .topLeading, endPoint: .bottomTrailing))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func ratingsGrid(_ entry: MonthlyEntry) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Current Ratings")
                .font(.headline)

            VStack(spacing: 10) {
                let previous = store.previousEntry(for: entry)
                ForEach(RatingCategory.allMain, id: \.self) { category in
                    let current = entry.rating(for: category)
                    let previousValue = previous?.rating(for: category)
                    CategoryRowView(title: category.displayName, value: current, change: AnalyticsEngine.ratingChange(current: current, previous: previousValue))
                }
            }
            .padding(14)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }

    private func strongestCategory(in entry: MonthlyEntry) -> RatingCategory? {
        let candidates = RatingCategory.allMain.compactMap { category in
            entry.rating(for: category).map { (category, $0) }
        }
        return candidates.max { $0.1 < $1.1 }?.0
    }

    private func weakestCategory(in entry: MonthlyEntry) -> RatingCategory? {
        let candidates = RatingCategory.allMain.compactMap { category in
            entry.rating(for: category).map { (category, $0) }
        }
        return candidates.min { $0.1 < $1.1 }?.0
    }
}
