import SwiftUI

struct NewMonthlyEntryView: View {
    @EnvironmentObject private var store: ProgressStore
    @Environment(\.dismiss) private var dismiss

    private let entryID: UUID?
    @State private var year: Int
    @State private var month: Int
    @State private var moneyText: String
    @State private var changes: String
    @State private var ratings: [RatingCategory: Double]

    @State private var validationMessage = ""
    @State private var showValidationError = false

    init(entry: MonthlyEntry? = nil) {
        if let entry {
            _entryID = State(initialValue: entry.id)
            _year = State(initialValue: entry.year)
            _month = State(initialValue: entry.month)
            _moneyText = State(initialValue: String(format: "%.0f", entry.money))
            _changes = State(initialValue: entry.changes)

            var seededRatings: [RatingCategory: Double] = [:]
            for category in RatingCategory.allMain {
                seededRatings[category] = entry.rating(for: category) ?? 0
            }
            _ratings = State(initialValue: seededRatings)
        } else {
            let components = Calendar.current.dateComponents([.year, .month], from: Date())
            _entryID = State(initialValue: nil)
            _year = State(initialValue: components.year ?? 0)
            _month = State(initialValue: components.month ?? 1)
            _moneyText = State(initialValue: "")
            _changes = State(initialValue: "")
            _ratings = State(initialValue: [
                .relationships: 5.0,
                .health: 5.0,
                .energy: 5.0,
                .speaking: 5.0,
                .mindAndThought: 5.0,
                .strength: 5.0,
                .appearance: 5.0
            ])
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    monthHeader
                    moneyField
                    ratingsSection
                    changesField
                    if let snapshot = targetSnapshot {
                        comparisonStrip(snapshot)
                    }
                    Button {
                        save()
                    } label: {
                        Text("Save Entry")
                            .font(.headline.weight(.semibold))
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
                .padding(16)
            }
            .navigationTitle(entryID == nil ? "New Monthly Entry" : "Edit Monthly Entry")
            .navigationBarTitleDisplayMode(.inline)
            .alert("Cannot Save", isPresented: $showValidationError, actions: {
                Button("OK", role: .cancel) {}
            }, message: {
                Text(validationMessage)
            })
        }
    }

    private var monthLabel: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        let date = Calendar.current.date(from: DateComponents(year: year, month: month)) ?? Date()
        return formatter.string(from: date).uppercased()
    }

    private var monthHeader: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(monthLabel)
                .font(.title3.weight(.bold))
            if let target = targetSnapshot,
               let previous = store.previousEntry(for: year, month: month) {
                let previousMoney = previous.money
                let deltaMoney = target.money - previousMoney
                Text("Last month: \(previous.shortMonthLabel) • Money change: \(deltaMoney.formattedSignedMoney())")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var moneyField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Money")
                .font(.headline)
            TextField("$0", text: $moneyText)
                .keyboardType(.numbersAndPunctuation)
                .padding(12)
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    private var ratingsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Monthly Ratings")
                .font(.headline)

            ForEach(RatingCategory.allMain, id: \.self) { category in
                let current = ratings[category] ?? 5.0
                let previous = store.previousEntry(for: year, month: month)?.rating(for: category)

                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(category.displayName)
                            .font(.subheadline.weight(.semibold))
                        Spacer()
                        Text(current.formattedRating())
                            .font(.headline.monospacedDigit())
                    }

                    Slider(
                        value: Binding(
                            get: { current },
                            set: { ratings[category] = ($0 * 2).rounded() / 2 }
                        ),
                        in: 0...10,
                        step: 0.5
                    )

                    HStack {
                        if let previous {
                            Text("Last month: \(previous.formattedRating())")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        if let previous {
                            ChangeBadge(value: current - previous, suffix: "")
                        }
                    }
                }
                .padding(12)
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private var changesField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Changes / Focus")
                .font(.headline)
            TextEditor(text: $changes)
                .frame(minHeight: 120)
                .padding(10)
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private func comparisonStrip(_ snapshot: MonthlyEntrySnapshot) -> some View {
        let previous = store.previousEntry(for: year, month: month)
        let currentLife = AnalyticsEngine.lifeScore(for: snapshot)
        let previousLife = previous.flatMap { AnalyticsEngine.lifeScore(for: MonthlyEntrySnapshot.from($0)) }

        return VStack(alignment: .leading, spacing: 8) {
            Text("Before Save")
                .font(.headline)
            HStack {
                Text("Life Score")
                    .foregroundStyle(.secondary)
                Spacer()
                if let currentLife {
                    Text(currentLife.formattedRating())
                        .font(.headline.weight(.semibold))
                        .monospacedDigit()
                }
                if let previousLife {
                    ChangeBadge(value: currentLife! - previousLife, suffix: "")
                }
            }
            .padding(.bottom, 6)

            if let previous {
                VStack(spacing: 8) {
                    ForEach(RatingCategory.allMain, id: \.self) { category in
                        if let current = snapshot.rating(for: category), let previousValue = previous.rating(for: category) {
                            HStack {
                                Text(category.displayName)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Spacer()
                                Text(current.formattedRating())
                                    .font(.caption.monospacedDigit())
                                ChangeBadge(value: current - previousValue, suffix: "")
                            }
                        }
                    }
                }
            }
        }
        .padding(12)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var targetSnapshot: MonthlyEntrySnapshot? {
        guard let money = parseMoney() else { return nil }
        var snapshot = MonthlyEntrySnapshot(
            id: entryID ?? UUID(),
            year: year,
            month: month,
            money: money,
            changes: changes,
            createdAt: Date(),
            updatedAt: Date()
        )

        for category in RatingCategory.allMain {
            snapshot.setRating(category, value: ratings[category])
        }
        return snapshot
    }

    private func save() {
        guard let snapshot = targetSnapshot else {
            validationMessage = "Enter a valid money number before saving."
            showValidationError = true
            return
        }

        if let duplicate = store.entry(for: snapshot.year, month: snapshot.month), duplicate.id != entryID {
            validationMessage = "A different entry already exists for \(snapshot.monthLabel). Edit that one instead."
            showValidationError = true
            return
        }

        store.createOrUpdate(snapshot)
        dismiss()
    }

    private func parseMoney() -> Double? {
        let normalized = moneyText
            .replacingOccurrences(of: "$", with: "")
            .replacingOccurrences(of: ",", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()

        if normalized.isEmpty { return 0 }

        var text = normalized
        var isNegative = false
        if text.hasPrefix("-") {
            isNegative = true
            text.removeFirst()
        }

        let hasKSuffix = text.hasSuffix("k")
        if hasKSuffix {
            text.removeLast()
        }

        guard let parsed = Double(text) else { return nil }
        let normalizedMoney = parsed * (hasKSuffix ? 1000 : 1)
        return isNegative ? -normalizedMoney : normalizedMoney
    }
}
