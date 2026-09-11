import Foundation
import SwiftData

@Model
final class MonthlyEntry {
    @Attribute(.unique) var id: UUID
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

    func apply(_ snapshot: MonthlyEntrySnapshot) {
        month = snapshot.month
        year = snapshot.year
        money = snapshot.money
        relationships = snapshot.relationships
        health = snapshot.health
        energy = snapshot.energy
        speaking = snapshot.speaking
        mindAndThought = snapshot.mindAndThought
        strength = snapshot.strength
        appearance = snapshot.appearance
        sex = snapshot.sex
        changes = snapshot.changes
        updatedAt = Date()
    }

    var snapshot: MonthlyEntrySnapshot {
        MonthlyEntrySnapshot(
            id: id,
            year: year,
            month: month,
            money: money,
            relationships: relationships,
            health: health,
            energy: energy,
            speaking: speaking,
            mindAndThought: mindAndThought,
            strength: strength,
            appearance: appearance,
            sex: sex,
            changes: changes,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
    }

    var monthLabel: String {
        let components = DateComponents(year: year, month: month)
        let date = Calendar.current.date(from: components) ?? Date()
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: date).uppercased()
    }

    var shortMonthLabel: String {
        let components = DateComponents(year: year, month: month)
        let date = Calendar.current.date(from: components) ?? Date()
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM yyyy"
        return formatter.string(from: date).uppercased()
    }

    var monthStart: Date {
        let components = DateComponents(year: year, month: month, day: 1)
        return Calendar.current.date(from: components) ?? Date()
    }

    var monthKey: Int { year * 100 + month }
}
