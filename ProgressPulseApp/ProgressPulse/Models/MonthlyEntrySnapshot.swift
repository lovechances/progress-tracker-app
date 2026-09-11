import Foundation

struct MonthlyEntrySnapshot: Identifiable, Codable, Hashable {
    var id: UUID
    var year: Int
    var month: Int
    var money: Double
    var relationships: Double?
    var health: Double?
    var energy: Double?
    var speaking: Double?
    var mindAndThought: Double?
    var strength: Double?
    var appearance: Double?
    var sex: Double?
    var changes: String
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        year: Int,
        month: Int,
        money: Double,
        relationships: Double? = nil,
        health: Double? = nil,
        energy: Double? = nil,
        speaking: Double? = nil,
        mindAndThought: Double? = nil,
        strength: Double? = nil,
        appearance: Double? = nil,
        sex: Double? = nil,
        changes: String,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.year = year
        self.month = month
        self.money = money
        self.relationships = relationships
        self.health = health
        self.energy = energy
        self.speaking = speaking
        self.mindAndThought = mindAndThought
        self.strength = strength
        self.appearance = appearance
        self.sex = sex
        self.changes = changes
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    var monthStart: Date {
        let components = DateComponents(year: year, month: month, day: 1)
        return Calendar.current.date(from: components) ?? Date()
    }

    var monthKey: Int { year * 100 + month }

    var monthLabel: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: monthStart).uppercased()
    }

    var shortMonthLabel: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM yyyy"
        return formatter.string(from: monthStart).uppercased()
    }

    var mainRatings: [RatingCategory: Double?] {
        [
            .relationships: relationships,
            .health: health,
            .energy: energy,
            .speaking: speaking,
            .mindAndThought: mindAndThought,
            .strength: strength,
            .appearance: appearance
        ]
    }

    func rating(for category: RatingCategory) -> Double? {
        switch category {
        case .relationships: return relationships
        case .health: return health
        case .energy: return energy
        case .speaking: return speaking
        case .mindAndThought: return mindAndThought
        case .strength: return strength
        case .appearance: return appearance
        }
    }

    mutating func setRating(_ category: RatingCategory, value: Double?) {
        switch category {
        case .relationships: relationships = value
        case .health: health = value
        case .energy: energy = value
        case .speaking: speaking = value
        case .mindAndThought: mindAndThought = value
        case .strength: strength = value
        case .appearance: appearance = value
        }
    }

    static func from(_ entry: MonthlyEntry) -> MonthlyEntrySnapshot {
        MonthlyEntrySnapshot(
            id: entry.id,
            year: entry.year,
            month: entry.month,
            money: entry.money,
            relationships: entry.relationships,
            health: entry.health,
            energy: entry.energy,
            speaking: entry.speaking,
            mindAndThought: entry.mindAndThought,
            strength: entry.strength,
            appearance: entry.appearance,
            sex: entry.sex,
            changes: entry.changes,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt
        )
    }
}

extension MonthlyEntrySnapshot {
    func withUpdatedRatings(_ ratings: [RatingCategory: Double?]) -> MonthlyEntrySnapshot {
        var copy = self
        for (category, value) in ratings {
            copy.setRating(category, value: value)
        }
        return copy
    }
}
