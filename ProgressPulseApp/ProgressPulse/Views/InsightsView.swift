import SwiftUI
import Charts

struct InsightsView: View {
    @EnvironmentObject private var store: ProgressStore
    @State private var trendWindow: TrendWindow = .all
    @State private var selectedCategory: RatingCategory = .relationships

    private var allEntries: [MonthlyEntrySnapshot] {
        store.snapshots
    }

    private var filteredEntries: [MonthlyEntrySnapshot] {
        switch trendWindow {
        case .all:
            return allEntries
        case .sixMonths:
            return Array(allEntries.suffix(6))
        case .oneYear:
            return Array(allEntries.suffix(12))
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    overallLifeScoreSection
                    lifeScoreChartSection
                    categoryTrendSection
                    moneySection
                    personalBestsSection
                    momentumSection
                    longTermSection
                    periodSection
                    recurringFocusSection
                }
                .padding(16)
            }
            .navigationTitle("INSIGHTS")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var overallLifeScoreSection: some View {
        let scores = AnalyticsEngine.lifeScoreSeries(from: allEntries)
        let latest = scores.last?.value
        let allTimeHigh = scores.compactMap(\.value).max()
        let allTimeLow = scores.compactMap(\.value).min()

        let changeFromLastMonth: Double? = {
            guard scores.count >= 2 else { return nil }
            return scores.last!.value - scores[scores.count - 2].value
        }()

        return sectionCard(title: "Overall Life Score") {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Current")
                        .font(.caption).foregroundStyle(.secondary)
                    Spacer()
                    Text(latest.map { $0.formattedRating() } ?? "—")
                        .font(.title2.weight(.bold))
                }

                HStack {
                    Label("All-time high", systemImage: "arrowtriangle.up.fill")
                    Spacer()
                    Text(allTimeHigh.map { $0.formattedRating() } ?? "—")
                }
                .font(.subheadline)
                HStack {
                    Label("All-time low", systemImage: "arrowtriangle.down.fill")
                    Spacer()
                    Text(allTimeLow.map { $0.formattedRating() } ?? "—")
                }
                .font(.subheadline)

                HStack {
                    VStack(alignment: .leading) {
                        Text("3m avg")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(AnalyticsEngine.threeMonthLifeScoreAverage(allEntries).map { $0.formattedRating() } ?? "—")
                    }
                    Spacer()
                    VStack(alignment: .leading) {
                        Text("6m avg")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(AnalyticsEngine.sixMonthLifeScoreAverage(allEntries).map { $0.formattedRating() } ?? "—")
                    }
                    Spacer()
                    VStack(alignment: .leading) {
                        Text("From last month")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        if let changeFromLastMonth {
                            ChangeBadge(value: changeFromLastMonth, suffix: "")
                        } else {
                            Text("—")
                        }
                    }
                }
            }
        }
    }

    private var lifeScoreChartSection: some View {
        let points = AnalyticsEngine.lifeScoreSeries(from: filteredEntries)
        return sectionCard(title: "Life Score Trend") {
            VStack {
                HStack {
                    Picker("Window", selection: $trendWindow) {
                        ForEach(TrendWindow.allCases, id: \.self) { window in
                            Text(window.label).tag(window)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                if points.isEmpty {
                    Text("No complete data yet")
                        .foregroundStyle(.secondary)
                        .frame(height: 220)
                } else {
                    Chart {
                        ForEach(points, id: \.date) { point in
                            LineMark(x: .value("Month", point.date), y: .value("Score", point.value))
                                .interpolationMethod(.catmullRom)
                                .foregroundStyle(.blue)
                            PointMark(x: .value("Month", point.date), y: .value("Score", point.value))
                        }
                    }
                    .frame(height: 220)
                }
            }
        }
    }

    private var categoryTrendSection: some View {
        let points = AnalyticsEngine.categorySeries(from: filteredEntries, category: selectedCategory)
        let allTimePoints = AnalyticsEngine.categorySeries(from: allEntries, category: selectedCategory)
        let current = points.last?.value
        let avg = points.map(\.value).average
        let high = allTimePoints.map(\.value).max()
        let low = allTimePoints.map(\.value).min()

        return sectionCard(title: "Category Trend") {
            VStack(spacing: 12) {
                Picker("Category", selection: $selectedCategory) {
                    ForEach(RatingCategory.allMain, id: \.self) { category in
                        Text(category.displayName).tag(category)
                    }
                }
                .pickerStyle(.menu)

                if points.isEmpty {
                    Text("No data for this category yet")
                        .foregroundStyle(.secondary)
                        .frame(height: 200)
                } else {
                    Chart {
                        ForEach(points, id: \.date) { point in
                            LineMark(x: .value("Month", point.date), y: .value("Value", point.value))
                                .interpolationMethod(.catmullRom)
                            PointMark(x: .value("Month", point.date), y: .value("Value", point.value))
                        }
                    }
                    .chartYScale(domain: 0...10)
                    .frame(height: 200)
                }

                HStack {
                    VStack(alignment: .leading) {
                        Text("Current")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(current?.formattedRating() ?? "—")
                    }
                    Spacer()
                    VStack(alignment: .leading) {
                        Text("All-time high")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(high?.formattedRating() ?? "—")
                    }
                    Spacer()
                    VStack(alignment: .leading) {
                        Text("All-time low")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(low?.formattedRating() ?? "—")
                    }
                    Spacer()
                    VStack(alignment: .leading) {
                        Text("Average")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(avg.map { String(format: "%.1f", $0) } ?? "—")
                    }
                    Spacer()
                    VStack(alignment: .leading) {
                        Text("3m")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(changeText(AnalyticsEngine.changeFromLastMonths(categorySeries: points, months: 3)))
                    }
                    Spacer()
                    VStack(alignment: .leading) {
                        Text("12m")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(changeText(AnalyticsEngine.changeFromLastMonths(categorySeries: points, months: 12)))
                    }
                }
            }
        }
    }

    private var moneySection: some View {
        let points = AnalyticsEngine.moneySeries(from: filteredEntries)
        let current = points.last?.value
        let high = points.map(\.value).max()
        let low = points.map(\.value).min()
        let lastMonth = points.count >= 2 ? (points.last!.value - points[points.count - 2].value) : nil
        let from3 = AnalyticsEngine.changeFromLastMonths(categorySeries: points, months: 3)
        let from12 = AnalyticsEngine.changeFromLastMonths(categorySeries: points, months: 12)

        return sectionCard(title: "Money") {
            VStack(spacing: 10) {
                if points.isEmpty {
                    Text("No money points yet")
                        .foregroundStyle(.secondary)
                        .frame(height: 200)
                } else {
                    Chart {
                        RuleMark(y: .value("Zero", 0))
                            .foregroundStyle(.secondary)
                            .lineStyle(StrokeStyle(lineWidth: 1, dash: [6, 4]))
                        ForEach(points, id: \.date) { point in
                            LineMark(x: .value("Month", point.date), y: .value("Money", point.value))
                                .interpolationMethod(.catmullRom)
                                .foregroundStyle(.green)
                            PointMark(x: .value("Month", point.date), y: .value("Money", point.value))
                        }
                    }
                    .frame(height: 200)
                }

                HStack {
                    VStack(alignment: .leading) {
                        Text("Current").font(.caption).foregroundStyle(.secondary)
                        Text(current?.formattedSignedMoney() ?? "—")
                    }
                    Spacer()
                    VStack(alignment: .leading) {
                        Text("High").font(.caption).foregroundStyle(.secondary)
                        Text(high?.formattedSignedMoney() ?? "—")
                    }
                    Spacer()
                    VStack(alignment: .leading) {
                        Text("Low").font(.caption).foregroundStyle(.secondary)
                        Text(low?.formattedSignedMoney() ?? "—")
                    }
                }

                HStack {
                    VStack(alignment: .leading) {
                        Text("From Last")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(lastMonth.map { $0.formattedSignedMoney() } ?? "—")
                    }
                    Spacer()
                    VStack(alignment: .leading) {
                        Text("From 3m")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(from3.map { $0.formattedSignedMoney() } ?? "—")
                    }
                    Spacer()
                    VStack(alignment: .leading) {
                        Text("From 12m")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(from12.map { $0.formattedSignedMoney() } ?? "—")
                    }
                }
            }
        }
    }

    private var personalBestsSection: some View {
        return sectionCard(title: "Personal Bests") {
            VStack(alignment: .leading, spacing: 6) {
                if let bestScore = AnalyticsEngine.allTimeHighLifeScore(entries: allEntries) {
                    Text("Life Score: \(bestScore.0.monthLabel) — \(bestScore.1.formattedRating())")
                }

                if let moneyBest = AnalyticsEngine.allTimeHighMoney(entries: allEntries) {
                    Text("Money: \(moneyBest.0.monthLabel) — \(moneyBest.0.money.formattedSignedMoney())")
                }

                ForEach(RatingCategory.allMain, id: \.self) { category in
                    if let best = AnalyticsEngine.allTimeHigh(for: category, entries: allEntries) {
                        Text("\(category.displayName): \(best.0.monthLabel) — \(best.1.formattedRating())")
                    }
                }
            }
            .font(.subheadline)
        }
    }

    private var momentumSection: some View {
        let momentum = AnalyticsEngine.momentum(entries: allEntries)

        return sectionCard(title: "Current Momentum") {
            HStack(alignment: .top, spacing: 16) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("IMPROVING")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.green)
                    ForEach(momentum.0.prefix(4)) { item in
                        Text("\(item.category.displayName) +\(item.change.formattedRating())")
                            .font(.caption)
                    }
                }
                Spacer()
                VStack(alignment: .leading, spacing: 6) {
                    Text("DECLINING")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.red)
                    ForEach(momentum.1.prefix(4)) { item in
                        Text("\(item.category.displayName) \(item.change.formattedRating())")
                            .font(.caption)
                    }
                }
            }
        }
    }

    private var longTermSection: some View {
        let deltas = AnalyticsEngine.firstVsLatest(entries: allEntries)

        return sectionCard(title: "Long-Term Change") {
            VStack(alignment: .leading, spacing: 8) {
                ForEach(RatingCategory.allMain, id: \.self) { category in
                    if let value = deltas[category] {
                        HStack {
                            Text(category.displayName)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Spacer()
                            ChangeBadge(value: value, suffix: "")
                        }
                    }
                }
            }
        }
    }

    private var periodSection: some View {
        let windows = AnalyticsEngine.lifeScoreBestWorstPeriods(entries: allEntries)
        let largest = AnalyticsEngine.largestOneMonthLifeScoreDelta(entries: allEntries)

        return sectionCard(title: "Best / Worst Periods") {
            VStack(alignment: .leading, spacing: 6) {
                if let best = windows.best {
                    Text("Best 3m: \(best.startLabel) → \(best.endLabel) (\(best.average.formattedRating()))")
                }
                if let worst = windows.worst {
                    Text("Worst 3m: \(worst.startLabel) → \(worst.endLabel) (\(worst.average.formattedRating()))")
                }
                if let inc = largest.best {
                    Text("Largest improvement: \(inc.from.shortMonthLabel) → \(inc.to.shortMonthLabel) (\(String(format: "+%.1f", inc.delta)))")
                }
                if let dec = largest.worst {
                    Text("Largest decline: \(dec.from.shortMonthLabel) → \(dec.to.shortMonthLabel) (\(String(format: "%.1f", dec.delta)))")
                }
            }
            .font(.subheadline)
        }
    }

    private var recurringFocusSection: some View {
        let themes = FocusAnalysisService.recurringThemes(entries: allEntries)
        return sectionCard(title: "Recurring Focus Areas") {
            if themes.isEmpty {
                Text("Add more entries to surface recurring themes.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                VStack(spacing: 6) {
                    ForEach(themes.prefix(8)) { theme in
                        HStack {
                            Text(theme.label)
                                .font(.subheadline)
                            Spacer()
                            Text("\(theme.count) months")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
    }

    private func sectionCard<Content: View>(title: String, @ViewBuilder content: @escaping () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.headline)
            content()
                .padding()
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }

    private func changeText(_ value: Double?) -> String {
        guard let value else { return "—" }
        return String(format: "%+.1f", value)
    }

    private enum TrendWindow: String, CaseIterable {
        case sixMonths = "6M"
        case oneYear = "1Y"
        case all = "ALL"

        var label: String { rawValue }
    }
}

private extension Array where Element == Double {
    var average: String {
        guard !isEmpty else { return "—" }
        return String(format: "%.1f", reduce(0, +) / Double(count))
    }
}
