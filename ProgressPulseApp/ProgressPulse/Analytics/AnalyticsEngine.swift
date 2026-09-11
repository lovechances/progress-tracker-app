import Foundation

struct MomentumItem: Identifiable {
    let id = UUID()
    let category: RatingCategory
    let change: Double
}

struct PeriodSummary: Identifiable {
    let id = UUID()
    let startLabel: String
    let endLabel: String
    let average: Double
}

struct AnalyticsEngine {
    static let lifeScoreCategories: [RatingCategory] = RatingCategory.allMain

    static func sortedEntries(_ entries: [MonthlyEntrySnapshot]) -> [MonthlyEntrySnapshot] {
        entries.sorted {
            if $0.year == $1.year {
                return $0.month < $1.month
            }
            return $0.year < $1.year
        }
    }

    static func lifeScore(for entry: MonthlyEntrySnapshot) -> Double? {
        let values = lifeScoreCategories.compactMap { entry.rating(for: $0) }
        if values.isEmpty { return nil }
        return values.reduce(0, +) / Double(values.count)
    }

    static func lifeScoreSeries(from entries: [MonthlyEntrySnapshot]) -> [(date: Date, value: Double)] {
        sortedEntries(entries)
            .compactMap {
                guard let score = lifeScore(for: $0) else { return nil }
                return (date: $0.monthStart, value: score)
            }
    }

    static func moneySeries(from entries: [MonthlyEntrySnapshot]) -> [(date: Date, value: Double)] {
        sortedEntries(entries).map { ($0.monthStart, $0.money) }
    }

    static func categorySeries(from entries: [MonthlyEntrySnapshot], category: RatingCategory) -> [(date: Date, value: Double)] {
        sortedEntries(entries)
            .compactMap { entry in
                guard let value = entry.rating(for: category) else { return nil }
                return (entry.monthStart, value)
            }
    }

    static func lifeScoreChange(current: MonthlyEntrySnapshot?, previous: MonthlyEntrySnapshot?) -> Double? {
        guard
            let current,
            let previous,
            let currentLife = lifeScore(for: current),
            let previousLife = lifeScore(for: previous)
        else { return nil }

        return currentLife - previousLife
    }

    static func ratingChange(current: Double?, previous: Double?) -> Double? {
        guard let current, let previous else { return nil }
        return current - previous
    }

    static func rollingAverage(_ values: [Double], window: Int) -> Double? {
        guard values.count >= window else { return nil }
        let tail = values.suffix(window)
        return tail.reduce(0, +) / Double(tail.count)
    }

    static func threeMonthLifeScoreAverage(_ entries: [MonthlyEntrySnapshot]) -> Double? {
        rollingAverage(sortedEntries(entries).compactMap { lifeScore(for: $0) }, window: 3)
    }

    static func sixMonthLifeScoreAverage(_ entries: [MonthlyEntrySnapshot]) -> Double? {
        rollingAverage(sortedEntries(entries).compactMap { lifeScore(for: $0) }, window: 6)
    }

    static func allTimeHigh<T>(entries: [MonthlyEntrySnapshot], valueExtractor: (MonthlyEntrySnapshot) -> T?) -> (MonthlyEntrySnapshot, T)? where T: Comparable {
        let mapped = entries.compactMap { entry -> (MonthlyEntrySnapshot, T)? in
            guard let value = valueExtractor(entry) else { return nil }
            return (entry, value)
        }
        return mapped.max { $0.1 < $1.1 }
    }

    static func allTimeHigh<T>(entries: [MonthlyEntrySnapshot], for category: RatingCategory) -> (MonthlyEntrySnapshot, Double)? {
        allTimeHigh(entries: entries) { $0.rating(for: category) }
    }

    static func allTimeHighMoney(entries: [MonthlyEntrySnapshot]) -> (MonthlyEntrySnapshot, Double)? {
        allTimeHigh(entries: entries) { $0.money }
    }

    static func allTimeHighLifeScore(entries: [MonthlyEntrySnapshot]) -> (MonthlyEntrySnapshot, Double)? {
        allTimeHigh(entries: entries) { entry in
            lifeScore(for: entry)
        }
    }

    static func allTimeLow<T>(entries: [MonthlyEntrySnapshot], valueExtractor: (MonthlyEntrySnapshot) -> T?) -> (MonthlyEntrySnapshot, T)? where T: Comparable {
        let mapped = entries.compactMap { entry -> (MonthlyEntrySnapshot, T)? in
            guard let value = valueExtractor(entry) else { return nil }
            return (entry, value)
        }
        return mapped.min { $0.1 < $1.1 }
    }

    static func allTimeLow(for category: RatingCategory, entries: [MonthlyEntrySnapshot]) -> (MonthlyEntrySnapshot, Double)? {
        allTimeLow(entries: entries) { $0.rating(for: category) }
    }

    static func allTimeLowMoney(entries: [MonthlyEntrySnapshot]) -> (MonthlyEntrySnapshot, Double)? {
        allTimeLow(entries: entries) { $0.money }
    }

    static func moneyChange(current: MonthlyEntrySnapshot, previous: MonthlyEntrySnapshot) -> Double {
        current.money - previous.money
    }

    static func momentum(entries: [MonthlyEntrySnapshot]) -> ([MomentumItem], [MomentumItem]) {
        let ordered = sortedEntries(entries)
        var improving: [MomentumItem] = []
        var declining: [MomentumItem] = []

        let window = 3

        for category in lifeScoreCategories {
            let values = ordered.compactMap { $0.rating(for: category) }
            guard values.count >= (window * 2) else { continue }

            let recent = values.suffix(window)
            let previous = values.suffix(window * 2).prefix(window)

            let recentAverage = recent.reduce(0, +) / Double(recent.count)
            let previousAverage = previous.reduce(0, +) / Double(previous.count)
            let change = recentAverage - previousAverage

            if abs(change) < 0.15 { continue }

            if change > 0 {
                improving.append(MomentumItem(category: category, change: change))
            } else {
                declining.append(MomentumItem(category: category, change: change))
            }
        }

        improving.sort { $0.change > $1.change }
        declining.sort { $0.change < $1.change }

        return (improving, declining)
    }

    static func firstVsLatest(entries: [MonthlyEntrySnapshot]) -> [RatingCategory: Double] {
        let ordered = sortedEntries(entries)
        guard let first = ordered.first, let last = ordered.last else { return [:] }

        var deltas: [RatingCategory: Double] = [:]
        for category in lifeScoreCategories {
            guard let firstValue = first.rating(for: category), let lastValue = last.rating(for: category) else { continue }
            deltas[category] = lastValue - firstValue
        }
        return deltas
    }

    static func lifeScoreBestWorstPeriods(entries: [MonthlyEntrySnapshot], window: Int = 3) -> (best: PeriodSummary?, worst: PeriodSummary?) {
        let ordered = sortedEntries(entries)
        guard ordered.count >= window else { return (nil, nil) }

        var best: PeriodSummary?
        var worst: PeriodSummary?

        for index in (window - 1)..<ordered.count {
            let range = ordered[(index - window + 1)...index]
            let values = range.compactMap { lifeScore(for: $0) }
            guard values.count == window else { continue }

            let average = values.reduce(0, +) / Double(window)
            let candidate = PeriodSummary(
                startLabel: ordered[index - window + 1].shortMonthLabel,
                endLabel: ordered[index].shortMonthLabel,
                average: average
            )

            if best == nil || average > best!.average { best = candidate }
            if worst == nil || average < worst!.average { worst = candidate }
        }
        return (best, worst)
    }

    static func largestOneMonthLifeScoreDelta(entries: [MonthlyEntrySnapshot]) -> (best: (from: MonthlyEntrySnapshot, to: MonthlyEntrySnapshot, delta: Double)?, worst: (from: MonthlyEntrySnapshot, to: MonthlyEntrySnapshot, delta: Double)?) {
        let ordered = sortedEntries(entries)
        guard ordered.count >= 2 else { return (nil, nil) }

        var best: (MonthlyEntrySnapshot, MonthlyEntrySnapshot, Double)?
        var worst: (MonthlyEntrySnapshot, MonthlyEntrySnapshot, Double)?

        for index in 1..<ordered.count {
            let previous = ordered[index - 1]
            let current = ordered[index]
            guard let previousScore = lifeScore(for: previous), let currentScore = lifeScore(for: current) else { continue }
            let delta = currentScore - previousScore

            if best == nil || delta > best!.2 { best = (previous, current, delta) }
            if worst == nil || delta < worst!.2 { worst = (previous, current, delta) }
        }

        return (
            best.map { ($0.0, $0.1, $0.2) },
            worst.map { ($0.0, $0.1, $0.2) }
        )
    }

    static func changeFromLastMonths(categorySeries: [(date: Date, value: Double)], months: Int) -> Double? {
        guard categorySeries.count >= months + 1 else { return nil }
        let current = categorySeries.last!.value
        let target = categorySeries[categorySeries.count - 1 - months].value
        return current - target
    }
}
