import Foundation

extension MonthlyEntry {
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
}

extension MonthlyEntrySnapshot {
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
}
