import Foundation

enum RatingCategory: String, CaseIterable, Codable {
    case relationships = "Relationships"
    case health = "Health"
    case energy = "Energy"
    case speaking = "Speaking"
    case mindAndThought = "Mind & Thought"
    case strength = "Strength"
    case appearance = "Appearance"

    static var allMain: [RatingCategory] {
        [.relationships, .health, .energy, .speaking, .mindAndThought, .strength, .appearance]
    }

    var displayName: String { rawValue }
}

struct RatingValuePair: Identifiable {
    let id = UUID()
    let category: RatingCategory
    let value: Double?
}
